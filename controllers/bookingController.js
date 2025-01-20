// Importing required modules and models
const mongoose = require("mongoose");

const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");

const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const {
  AppError,
  BookingError,
  CriticalBookingError,
} = require("../utils/appError");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Get Stripe checkout session for booking a tour
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Verify tour exists and validate inputs first
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError("Tour not found.", 404));

  const { startDate, numParticipants } = req.query;

  // 2. Validate numParticipants
  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  // 3. Validate and normalize date
  let startDateISO = "";
  if (startDate) {
    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) {
      return next(new AppError("Invalid start date selected.", 400));
    }
    const normalizedDate = new Date(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
    );
    startDateISO = normalizedDate.toISOString();
  } else {
    return next(new AppError("Start date is required.", 400));
  }

  // 4. Verify available spots
  const startDateObj = tour.startDates.find(sd => {
    const tourDate = new Date(sd.date);
    const normalizedTourDate = new Date(
      tourDate.getUTCFullYear(),
      tourDate.getUTCMonth(),
      tourDate.getUTCDate(),
    );
    return normalizedTourDate.getTime() === new Date(startDateISO).getTime();
  });

  if (!startDateObj) {
    return next(new AppError("Selected start date not available.", 400));
  }

  const availableSpots = tour.maxGroupSize - startDateObj.participants;
  if (numParticipantsInt > availableSpots) {
    return next(
      new AppError(`Only ${availableSpots} spots left for this date.`, 400),
    );
  }

  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  // 5. Create Stripe session with additional metadata
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`,
            ],
          },
        },
        quantity: numParticipantsInt,
      },
    ],
    mode: "payment",
    metadata: {
      startDate: startDateISO,
      numParticipants: numParticipantsInt.toString(),
      maxRetries: "3", // Add metadata for retry attempts
    },
  });

  res.status(200).json({
    status: "success",
    session,
  });
});

// Helper function to create booking with retries
const createBookingCheckout = async session => {
  const maxRetries = parseInt(session.metadata.maxRetries) || 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const booking = await processBooking(session);
      return booking;
    } catch (error) {
      console.error(`Booking attempt ${attempt} failed:`, error);
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(
          `Booking failed after ${maxRetries} attempts: ${lastError.message}`,
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }
};

// Helper function to process a single booking attempt
const processBooking = async stripeSession => {
  const tourId =
    stripeSession.metadata.tourId || stripeSession.client_reference_id;
  const userEmail = stripeSession.customer_email;
  const price = stripeSession.amount_total / 100;
  const { startDate, numParticipants, bookingId } = stripeSession.metadata;

  // Start a MongoDB transaction
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // 1. Find user and tour
    const user = await User.findOne({ email: userEmail }).session(mongoSession);
    if (!user) {
      throw new BookingError("User not found", {
        sessionId: stripeSession.id,
        paymentIntentId: stripeSession.payment_intent,
        userEmail,
      });
    }

    const tour = await Tour.findById(tourId).session(mongoSession);
    if (!tour) {
      throw new BookingError("Tour not found", {
        sessionId: stripeSession.id,
        paymentIntentId: stripeSession.payment_intent,
        tourId,
        userEmail,
      });
    }

    // 2. Normalize dates and verify start date
    const bookingDate = new Date(startDate);
    const normalizedBookingDate = new Date(
      bookingDate.getUTCFullYear(),
      bookingDate.getUTCMonth(),
      bookingDate.getUTCDate(),
    );

    const startDateObj = tour.startDates.find(sd => {
      const tourDate = new Date(sd.date);
      const normalizedTourDate = new Date(
        tourDate.getUTCFullYear(),
        tourDate.getUTCMonth(),
        tourDate.getUTCDate(),
      );
      return normalizedTourDate.getTime() === normalizedBookingDate.getTime();
    });

    if (!startDateObj) {
      throw new BookingError("Start date not found or no longer available", {
        sessionId: stripeSession.id,
        paymentIntentId: stripeSession.payment_intent,
        tourId,
        userEmail,
        startDate,
      });
    }

    // 3. Verify available spots
    const parsedParticipants = parseInt(numParticipants, 10);
    const availableSpots = tour.maxGroupSize - startDateObj.participants;
    if (parsedParticipants > availableSpots) {
      throw new BookingError(
        `Only ${availableSpots} spots left for this date`,
        {
          sessionId: stripeSession.id,
          paymentIntentId: stripeSession.payment_intent,
          tourId,
          userEmail,
          startDate,
          requested: parsedParticipants,
          available: availableSpots,
        },
      );
    }

    // 4. Create or update booking
    let booking;
    if (bookingId) {
      booking = await Booking.findById(bookingId).session(mongoSession);
      if (!booking) {
        throw new BookingError("Existing booking not found", {
          sessionId: stripeSession.id,
          paymentIntentId: stripeSession.payment_intent,
          bookingId,
        });
      }

      booking.numParticipants += parsedParticipants;
      booking.price += price;
      booking.paymentIntents.push({
        id: stripeSession.payment_intent,
        amount: price,
      });

      await booking.save({ session: mongoSession });
    } else {
      booking = await Booking.create(
        [
          {
            tour: tourId,
            user: user._id,
            price,
            startDate: normalizedBookingDate,
            numParticipants: parsedParticipants,
            paymentIntentId: stripeSession.payment_intent,
            paymentIntents: [
              {
                id: stripeSession.payment_intent,
                amount: price,
              },
            ],
          },
        ],
        { session: mongoSession },
      );
      booking = booking[0];
    }

    // 5. Update tour participants
    startDateObj.participants += parsedParticipants;
    tour.markModified("startDates");
    await tour.save({ session: mongoSession });

    await mongoSession.commitTransaction();
    return booking;
  } catch (error) {
    await mongoSession.abortTransaction();

    // Rethrow BookingError or CriticalBookingError as is
    if (
      error instanceof BookingError ||
      error instanceof CriticalBookingError
    ) {
      throw error;
    }

    // Wrap other errors as BookingError
    throw new BookingError(error.message || "Booking creation failed", {
      sessionId: stripeSession.id,
      paymentIntentId: stripeSession.payment_intent,
      originalError: error.message,
    });
  } finally {
    mongoSession.endSession();
  }
};

// Helper function to log failed bookings
const logFailedBooking = async data => {
  try {
    // You can implement your logging mechanism here
    // For example, saving to a FailedBooking collection
    await FailedBooking.create({
      error: data.error,
      sessionId: data.session.id,
      paymentIntentId: data.session.payment_intent,
      refundId: data.refund?.id,
      metadata: data.session.metadata,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error("Error logging failed booking:", error);
  }
};

// Helper function to log critical errors
const logCriticalError = async data => {
  try {
    // You can implement your critical error logging mechanism here
    // For example, saving to a CriticalError collection
    await CriticalError.create({
      bookingError: data.bookingError.message,
      refundError: data.refundError.message,
      sessionId: data.session.id,
      paymentIntentId: data.session.payment_intent,
      metadata: data.session.metadata,
      timestamp: data.timestamp,
    });

    // You might also want to send notifications to support team
    // await notifySupport(data);
  } catch (error) {
    console.error("Error logging critical error:", error);
  }
};

// Add travelers to an existing booking
exports.addTravelersToBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { tourId, numParticipants } = req.body;
  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError("Booking not found.", 404));

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Tour not found.", 404));

  // Normalize the booking date
  const bookingDate = new Date(booking.startDate);
  const normalizedBookingDate = new Date(
    bookingDate.getUTCFullYear(),
    bookingDate.getUTCMonth(),
    bookingDate.getUTCDate(),
  );

  // Find matching start date with normalized comparison
  const startDateObj = tour.startDates.find(sd => {
    const tourDate = new Date(sd.date);
    const normalizedTourDate = new Date(
      tourDate.getUTCFullYear(),
      tourDate.getUTCMonth(),
      tourDate.getUTCDate(),
    );

    return normalizedTourDate.getTime() === normalizedBookingDate.getTime();
  });

  if (!startDateObj) return next(new AppError("Start date not found.", 400));

  const availableSpots = tour.maxGroupSize - startDateObj.participants;
  if (numParticipantsInt > availableSpots) {
    return next(
      new AppError(`Only ${availableSpots} spots left for this date.`, 400),
    );
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: booking.id,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour - Additional Travelers`,
            description: `Adding ${numParticipantsInt} travelers to booking`,
          },
        },
        quantity: numParticipantsInt,
      },
    ],
    mode: "payment",
    metadata: {
      tourId: tour.id,
      bookingId: booking.id,
      numParticipants: numParticipantsInt.toString(),
      startDate: normalizedBookingDate.toISOString(), // Use normalized date here
    },
  });

  res.status(200).json({
    status: "success",
    session,
  });
});

// Stripe webhook handler for checkout session completion
exports.webhookCheckout = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const booking = await createBookingCheckout(session);
      res.status(200).json({ received: true, success: true });
    } catch (error) {
      console.error("Error processing booking:", error);

      try {
        // Attempt to refund the payment
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent,
          reason: "requested_by_customer",
        });

        throw new CriticalBookingError(
          "Booking failed and payment was refunded",
          {
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            refundId: refund.id,
            originalError: error.message,
            metadata: session.metadata,
          },
        );
      } catch (refundError) {
        throw new CriticalBookingError(
          "Critical: Booking failed and refund failed",
          {
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            bookingError: error.message,
            refundError: refundError.message,
            metadata: session.metadata,
          },
        );
      }
    }
  } else {
    res.status(200).json({ received: true });
  }
};

// Get all bookings with optional filters (search, date range, paid status)
exports.getAllBookingsRegex = catchAsync(async (req, res, next) => {
  const { search, dateFrom, dateTo, paid, tour } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  // 1. Initial match for paid status if provided
  if (typeof paid !== "undefined" && paid !== "") {
    pipeline.push({
      $match: {
        paid: paid === "true",
      },
    });
  }

  // 2. Match tour if provided (before lookups for better performance)
  if (tour) {
    pipeline.push({
      $match: {
        tour: new mongoose.Types.ObjectId(tour), // Fixed: Added 'new' keyword
      },
    });
  }

  // Rest of your pipeline stages...
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $lookup: {
        from: "tours",
        localField: "tour",
        foreignField: "_id",
        as: "tourInfo",
      },
    },
    { $unwind: "$tourInfo" },
  );

  // Search match
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          {
            "userInfo.email": {
              $regex: search,
              $options: "i",
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: search,
                options: "i",
              },
            },
          },
        ],
      },
    });
  }

  // Date range match
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);

    pipeline.push({
      $match: {
        startDate: dateQuery,
      },
    });
  }

  // Pagination with facet
  pipeline.push({
    $facet: {
      data: [{ $sort: { startDate: -1 } }, { $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  });

  const [results] = await Booking.aggregate(pipeline);
  const { data = [], metadata = [] } = results;
  const total = metadata.length > 0 ? metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  // Clean up and transform the output
  const finalData = data.map(doc => ({
    ...doc,
    user: { email: doc.userInfo.email, _id: doc.userInfo._id },
    tour: { name: doc.tourInfo.name, _id: doc.tourInfo._id },
    userInfo: undefined,
    tourInfo: undefined,
  }));

  res.status(200).json({
    status: "success",
    results: data.length,
    data: {
      data: finalData,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    },
  });
});

// Get all user transactions with optional filters (search, date range, price range)
exports.getAllUserTransactions = catchAsync(async (req, res, next) => {
  const { search, dateFrom, dateTo, priceRange } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  // Basic match for user's transactions only
  pipeline.push({
    $match: {
      user: new mongoose.Types.ObjectId(req.user._id),
    },
  });

  // Lookup tours
  pipeline.push(
    {
      $lookup: {
        from: "tours",
        localField: "tour",
        foreignField: "_id",
        as: "tourInfo",
      },
    },
    { $unwind: "$tourInfo" },
  );

  // Search match for tour name or transaction ID
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          {
            "tourInfo.name": {
              $regex: search,
              $options: "i",
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: search,
                options: "i",
              },
            },
          },
        ],
      },
    });
  }

  // Date range match
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);

    pipeline.push({
      $match: {
        createdAt: dateQuery,
      },
    });
  }

  // Price range match
  if (priceRange) {
    const [min, max] = priceRange.split("-").map(Number);
    const priceQuery = {};
    if (!isNaN(min)) priceQuery.$gte = min;
    if (!isNaN(max)) priceQuery.$lte = max;
    if (priceRange === "2001+") {
      priceQuery.$gte = 2001;
    }

    if (Object.keys(priceQuery).length) {
      pipeline.push({
        $match: {
          price: priceQuery,
        },
      });
    }
  }

  // Pagination with facet
  pipeline.push({
    $facet: {
      data: [{ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  });

  const [results] = await Booking.aggregate(pipeline);
  const { data = [], metadata = [] } = results;
  const total = metadata.length > 0 ? metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    status: "success",
    results: data.length,
    data: {
      data,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    },
  });
});

exports.createManualBooking = catchAsync(async (req, res, next) => {
  const { tourId, userId, startDate, numParticipants, price, paid } = req.body;

  // 1. Start a MongoDB transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Verify tour exists and has available spots
    const tour = await Tour.findById(tourId).session(session);
    if (!tour) {
      throw new AppError("Tour not found", 404);
    }

    // 3. Verify user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // 4. Find the specific start date and verify availability
    const bookingDate = new Date(startDate);
    const normalizedBookingDate = new Date(
      Date.UTC(
        bookingDate.getUTCFullYear(),
        bookingDate.getUTCMonth(),
        bookingDate.getUTCDate(),
      ),
    );

    const startDateObj = tour.startDates.find(sd => {
      const tourDate = new Date(sd.date);
      const normalizedTourDate = new Date(
        Date.UTC(
          tourDate.getUTCFullYear(),
          tourDate.getUTCMonth(),
          tourDate.getUTCDate(),
        ),
      );
      return normalizedTourDate.getTime() === normalizedBookingDate.getTime();
    });

    if (!startDateObj) {
      throw new AppError("Selected start date not available", 400);
    }

    const availableSpots = tour.maxGroupSize - startDateObj.participants;
    if (numParticipants > availableSpots) {
      throw new AppError(
        `Only ${availableSpots} spots available for this date`,
        400,
      );
    }

    // 5. Create the booking
    const booking = await Booking.create(
      [
        {
          tour: tourId,
          user: userId,
          price,
          startDate: normalizedBookingDate,
          numParticipants,
          paid,
          paymentIntents: paid
            ? [
                {
                  id: "MANUAL-" + new Date().getTime(),
                  amount: price,
                },
              ]
            : [],
        },
      ],
      { session },
    );

    // 6. Update tour participants
    startDateObj.participants += numParticipants;
    tour.markModified("startDates");
    await tour.save({ session });

    // 7. Commit the transaction
    await session.commitTransaction();

    res.status(201).json({
      status: "success",
      data: {
        data: booking[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// CRUD operations for bookings using the handler factory
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
