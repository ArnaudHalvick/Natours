// Importing required modules and models
const mongoose = require("mongoose");

const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");

const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const AppError = require("../utils/appError");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Get Stripe checkout session for booking a tour
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError("Tour not found.", 404));

  const { startDate, numParticipants } = req.query;
  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  // Validate numParticipants
  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  // Normalize the date to UTC and strip time component
  let startDateISO = "";
  if (startDate) {
    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) {
      return next(new AppError("Invalid start date selected.", 400));
    }

    // Normalize to UTC midnight
    const normalizedDate = new Date(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
    );
    startDateISO = normalizedDate.toISOString();
  } else {
    return next(new AppError("Start date is required.", 400));
  }

  // Create Stripe checkout session with normalized date
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
    },
  });

  res.status(200).json({
    status: "success",
    session,
  });
});

// Function to create or update a booking after Stripe payment
const createBookingCheckout = async session => {
  try {
    const tourId = session.metadata.tourId || session.client_reference_id;
    const userEmail = session.customer_email;
    const price = session.amount_total / 100;
    const { startDate, numParticipants, bookingId } = session.metadata;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`No user found with email: ${userEmail}`);
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      throw new Error("Tour not found");
    }

    // Normalize dates for comparison
    const bookingDate = new Date(startDate);
    const normalizedBookingDate = new Date(
      bookingDate.getUTCFullYear(),
      bookingDate.getUTCMonth(),
      bookingDate.getUTCDate(),
    );

    // Find matching start date
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
      throw new Error("Start date not found in tour");
    }

    // Update participants count
    const parsedParticipants = parseInt(numParticipants, 10);
    startDateObj.participants += parsedParticipants;
    tour.markModified("startDates");
    await tour.save();

    if (bookingId) {
      // Add travelers case: Update existing booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }

      booking.numParticipants += parsedParticipants;
      booking.price += price;

      // Add new payment intent to the array
      booking.paymentIntents.push({
        id: session.payment_intent,
        amount: price,
      });

      await booking.save();
      return booking;
    } else {
      // New booking case: Create new booking
      const booking = await Booking.create({
        tour: tourId,
        user: user._id,
        price,
        startDate: normalizedBookingDate,
        numParticipants: parsedParticipants,
        paymentIntentId: session.payment_intent, // Keep for backwards compatibility
        paymentIntents: [
          {
            id: session.payment_intent,
            amount: price,
          },
        ],
      });
      return booking;
    }
  } catch (error) {
    console.error("Error in createBookingCheckout:", error);
    throw error;
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
exports.webhookCheckout = (req, res, next) => {
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

    // Process booking asynchronously but make sure to handle all errors
    createBookingCheckout(session)
      .then(booking => {
        res.status(200).json({ received: true });
      })
      .catch(err => {
        console.error("Error processing booking:", err);
        // Still return 200 to Stripe but include error info
        res.status(200).json({
          received: true,
          error: err.message,
          // Add extra context for debugging
          context: {
            isAddingTravelers: !!session.metadata.bookingId,
            tourId: session.metadata.tourId || session.client_reference_id,
          },
        });
      });
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

// CRUD operations for bookings using the handler factory
exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
