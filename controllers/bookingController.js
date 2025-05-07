// Importing required modules and models
const mongoose = require("mongoose");

const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const CriticalError = require("../models/criticalErrorModel");
const FailedBooking = require("../models/failedBookingModel");

const catchAsync = require("../utils/catchAsync");
const {
  normalizeToUTCMidnight,
  isValidISODate,
  isFutureDate,
} = require("../utils/dateUtils");
const factory = require("./handlerFactory");
const AppError = require("../utils/appError");
const { BookingError } = require("../utils/appError");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Get Stripe checkout session for booking a tour
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Verify tour exists and validate inputs
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError("Tour not found.", 404));

  const { startDate, numParticipants } = req.query;

  // 2. Validate numParticipants
  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  // 3. Validate date format and future date
  if (!startDate || !isValidISODate(startDate)) {
    return next(new AppError("Invalid start date format.", 400));
  }

  if (!isFutureDate(startDate)) {
    return next(new AppError("Start date must be in the future.", 400));
  }

  const startDateObj = new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    return next(new AppError("Invalid start date format.", 400));
  }

  // 4. Validate date availability and get slot details
  try {
    const dateSlot = await Tour.validateDateAvailability(
      tour.id,
      startDate,
      numParticipantsInt,
    );

    // Verify the slot has enough capacity
    if (dateSlot.participants + numParticipantsInt > tour.maxGroupSize) {
      return next(
        new AppError(
          `Only ${tour.maxGroupSize - dateSlot.participants} spots available for this date.`,
          400,
        ),
      );
    }

    // Use priceDiscount if available, otherwise use regular price
    const finalPrice = tour.priceDiscount || tour.price;

    // Generate the JWT token from cookies (assuming it's there)
    const token = req.cookies.jwt;

    // Define confirmation, success and failure/cancel URLs
    const confirmationUrl = `${req.protocol}://${req.get("host")}/confirm-booking?session_id={CHECKOUT_SESSION_ID}&jwt=${token}`;
    const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;
    const failUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking-failed&jwt=${token}`;

    // Prepare product description with discount info if applicable
    let productDescription = tour.summary;
    if (tour.priceDiscount) {
      productDescription = `${tour.summary}\nSpecial offer: ${tour.priceDiscount}% discount applied!`;
    }

    // 5. Create Stripe session with normalized date and discounted price
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      success_url: confirmationUrl,
      cancel_url: failUrl,
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: finalPrice * 100,
            product_data: {
              name: `${tour.name} Tour`,
              description: productDescription,
              images: [
                `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`,
              ],
              metadata: {
                originalPrice: tour.price,
                discountedPrice: tour.priceDiscount || tour.price,
              },
            },
          },
          quantity: numParticipantsInt,
        },
      ],
      mode: "payment",
      metadata: {
        startDate: startDateObj.toISOString(),
        numParticipants: numParticipantsInt.toString(),
        maxRetries: "3",
        originalPrice: tour.price.toString(),
        discountPercentage: (tour.priceDiscount || 0).toString(),
        finalPrice: finalPrice.toString(),
        successUrl: successUrl
      },
    });

    res.status(200).json({
      status: "success",
      session,
      tourData: {
        originalPrice: tour.price,
        finalPrice,
        discountPercentage: tour.discountPercentage,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
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

  let normalizedStartDate;
  try {
    normalizedStartDate = normalizeToUTCMidnight(startDate);
  } catch (error) {
    throw new BookingError("Invalid date format", {
      sessionId: stripeSession.id,
      paymentIntentId: stripeSession.payment_intent,
      startDate,
    });
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // Find user and tour
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

    // Find matching date slot
    const dateSlot = tour.startDates.find(
      sd =>
        new Date(sd.date).toISOString().split("T")[0] ===
        new Date(normalizedStartDate).toISOString().split("T")[0],
    );

    if (!dateSlot) {
      throw new BookingError("Selected start date not available", {
        sessionId: stripeSession.id,
        paymentIntentId: stripeSession.payment_intent,
        tourId,
        startDate: normalizedStartDate,
      });
    }

    const parsedParticipants = parseInt(numParticipants, 10);
    const availableSpots = tour.maxGroupSize - dateSlot.participants;

    if (parsedParticipants > availableSpots) {
      throw new BookingError(
        `Only ${availableSpots} spots left for this date`,
        {
          sessionId: stripeSession.id,
          paymentIntentId: stripeSession.payment_intent,
          tourId,
          startDate: normalizedStartDate,
          requested: parsedParticipants,
          available: availableSpots,
        },
      );
    }

    // Create or update booking
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
            startDate: normalizedStartDate,
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

    // Update tour participants
    dateSlot.participants += parsedParticipants;
    tour.markModified("startDates");
    await tour.save({ session: mongoSession });

    await mongoSession.commitTransaction();
    return booking;
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    mongoSession.endSession();
  }
};

exports.createManualBooking = catchAsync(async (req, res, next) => {
  const { tourId, userId, startDate, numParticipants, price, paid } = req.body;

  // 1. Start a MongoDB transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Validate date availability using Tour model method
    const normalizedStartDate = normalizeToUTCMidnight(startDate);

    const dateSlot = await Tour.validateDateAvailability(
      tourId,
      normalizedStartDate,
      numParticipants,
    );

    // 3. Create the booking with normalized date
    const booking = await Booking.create(
      [
        {
          tour: tourId,
          user: userId,
          price,
          startDate: dateSlot.date, // Using the normalized date
          numParticipants,
          paid: paid ? "true" : "false",
          isManual: true,
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

    // 4. Update tour participants
    dateSlot.participants += numParticipants;
    await dateSlot.save({ session });

    // 5. Commit the transaction
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
    await CriticalError.create({
      type: data.type,
      bookingError: data.bookingError?.message || null,
      refundError: data.refundError?.message || null,
      sessionId: data.session.id,
      paymentIntentId: data.session.payment_intent,
      refundId: data.refund?.id || null,
      metadata: data.session.metadata,
      timestamp: data.timestamp,
    });

    // Send different notifications based on error type
    if (data.type === "booking_and_refund_failed") {
      // Highest priority notification - both booking and refund failed
      await notifySupport({
        priority: "URGENT",
        ...data,
      });
    } else {
      // Standard priority notification
      await notifySupport(data);
    }
  } catch (error) {
    console.error("Error logging critical error:", error);
  }
};

// Add travelers to an existing booking
exports.addTravelersToBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { tourId, numParticipants } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError("Booking not found.", 404));

  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError("Tour not found.", 404));

  const normalizedBookingDate = normalizeToUTCMidnight(booking.startDate);
  if (!isFutureDate(normalizedBookingDate)) {
    return next(new AppError("Cannot add travelers to a past tour.", 400));
  }

  // Find matching date slot
  const dateSlot = tour.startDates.find(
    sd =>
      new Date(sd.date).toISOString().split("T")[0] ===
      normalizedBookingDate.split("T")[0],
  );

  if (!dateSlot) {
    return next(new AppError("Tour date no longer available.", 400));
  }

  const availableSpots = tour.maxGroupSize - dateSlot.participants;
  if (numParticipants > availableSpots) {
    return next(
      new AppError(
        `Only ${availableSpots} spots available for this date.`,
        400,
      ),
    );
  }

  // Calculate discount percentage for display
  const discountPercentage = tour.priceDiscount
    ? Math.round(((tour.price - tour.priceDiscount) / tour.price) * 100)
    : 0;

  // Use priceDiscount if available, otherwise use regular price
  const finalPrice = tour.priceDiscount || tour.price;

  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;
  const failUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking-failed&jwt=${token}`;

  // Prepare description with discount info
  let productDescription = `Adding ${numParticipants} travelers to booking`;
  if (tour.priceDiscount) {
    productDescription += `\nSpecial price: $${finalPrice} (${discountPercentage}% off)`;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: failUrl,
    customer_email: req.user.email,
    client_reference_id: booking.id,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: finalPrice * 100, // Using discounted price
          product_data: {
            name: `${tour.name} Tour - Additional Travelers`,
            description: productDescription,
            metadata: {
              originalPrice: tour.price,
              discountedPrice: finalPrice,
              discountPercentage,
            },
          },
        },
        quantity: numParticipants,
      },
    ],
    mode: "payment",
    metadata: {
      tourId: tour.id,
      bookingId: booking.id,
      numParticipants: numParticipants.toString(),
      startDate: normalizedBookingDate,
      originalPrice: tour.price.toString(),
      finalPrice: finalPrice.toString(),
      discountPercentage: discountPercentage.toString(),
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
      return res.status(200).json({ received: true, success: true });
    } catch (error) {
      console.error("Error processing booking:", error);

      try {
        // Attempt to refund the payment
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent,
          reason: "requested_by_customer",
        });

        await logCriticalError({
          type: "booking_failed_refund_success",
          bookingError: error,
          session,
          refund,
          timestamp: new Date().toISOString(),
        });

        // Instead of 500, send 400 to indicate the webhook should not be retried
        return res.status(400).json({
          received: false, // Changed to false
          success: false,
          error: "Booking failed but payment was refunded",
        });
      } catch (refundError) {
        await logCriticalError({
          type: "booking_and_refund_failed",
          bookingError: error,
          refundError,
          session,
          timestamp: new Date().toISOString(),
        });

        // Use 400 here as well
        return res.status(400).json({
          received: false, // Changed to false
          success: false,
          error: "Critical: Booking failed and refund failed",
        });
      }
    }
  }

  // For other event types, still acknowledge receipt
  res.status(200).json({ received: true });
};

// Get all bookings with optional filters (search, date range, paid status)
exports.getAllBookingsRegex = catchAsync(async (req, res, next) => {
  const { search, dateFrom, dateTo, paid, tour } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  if (typeof paid !== "undefined" && paid !== "") {
    pipeline.push({
      $match: { paid: paid === "true" },
    });
  }

  if (tour) {
    pipeline.push({
      $match: { tour: new mongoose.Types.ObjectId(tour) },
    });
  }

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

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "userInfo.email": { $regex: search, $options: "i" } },
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

  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = normalizeToUTCMidnight(dateFrom);
    if (dateTo) dateQuery.$lte = normalizeToUTCMidnight(dateTo);

    pipeline.push({
      $match: { startDate: dateQuery },
    });
  }

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
    if (dateFrom) dateQuery.$gte = normalizeToUTCMidnight(dateFrom);
    if (dateTo) dateQuery.$lte = normalizeToUTCMidnight(dateTo);

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

// CRUD operations for bookings using the handler factory
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
