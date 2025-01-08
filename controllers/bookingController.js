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
  const { startDate, numParticipants } = req.query;
  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  // Validate numParticipants
  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  // Validate startDate
  let startDateISO = "";
  if (startDate) {
    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) {
      return next(new AppError("Invalid start date selected.", 400));
    }
    startDateISO = dateObj.toISOString();
  } else {
    return next(new AppError("Start date is required.", 400));
  }

  // Check if user already booked this tour on the same date
  const existingBooking = await Booking.findOne({
    tour: req.params.tourId,
    user: req.user._id,
    startDate: startDateISO,
  });

  if (existingBooking) {
    return next(
      new AppError(
        "You have already booked this tour on this date. Please check your bookings if you want to add more travelers.",
        400,
      ),
    );
  }

  // Find start date object in the tour
  const startDateObj = tour.startDates.find(
    sd => new Date(sd.date).getTime() === new Date(startDateISO).getTime(),
  );
  if (!startDateObj) {
    return next(new AppError("Start date not found.", 400));
  }

  // Check available spots
  const availableSpots = tour.maxGroupSize - startDateObj.participants;
  if (numParticipantsInt > availableSpots) {
    return next(
      new AppError(`Only ${availableSpots} spots left for this date.`, 400),
    );
  }

  // Create Stripe checkout session
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
    const userEmail = session.customer_email;
    const price = session.amount_total / 100;
    const { startDate, numParticipants, bookingId, tourId } = session.metadata;
    const actualTourId = tourId || session.client_reference_id;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`No user found with email: ${userEmail}`);
      return;
    }

    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      if (bookingId) {
        // Update existing booking
        const booking =
          await Booking.findById(bookingId).session(mongooseSession);
        if (!booking) throw new Error("Booking not found.");

        const additionalParticipants = parseInt(numParticipants, 10);
        if (isNaN(additionalParticipants)) {
          throw new Error("Invalid number of participants");
        }

        const tour = await Tour.findById(actualTourId).session(mongooseSession);
        if (!tour) throw new Error("Tour not found.");

        booking.numParticipants += additionalParticipants;
        await booking.save();

        const startDateObj = tour.startDates.find(
          sd => sd.date.toISOString() === startDate,
        );
        if (!startDateObj) throw new Error("Start date not found in tour.");

        startDateObj.participants += additionalParticipants;
        tour.markModified("startDates");
        await tour.save();
      } else {
        // Create new booking
        const tour = await Tour.findById(actualTourId).session(mongooseSession);
        if (!tour) throw new Error("Tour not found.");

        const startDateObj = tour.startDates.find(
          sd => sd.date.getTime() === new Date(startDate).getTime(),
        );
        if (!startDateObj) throw new Error("Start date not found.");

        const parsedParticipants = parseInt(numParticipants, 10);
        const availableSpots = tour.maxGroupSize - startDateObj.participants;

        if (parsedParticipants > availableSpots) {
          throw new Error(
            `Only ${availableSpots} spots left for this start date.`,
          );
        }

        startDateObj.participants += parsedParticipants;
        tour.markModified("startDates");
        await tour.save();

        await Booking.create(
          [
            {
              tour: actualTourId,
              user: user._id,
              price,
              startDate,
              numParticipants: parsedParticipants,
              paymentIntentId: session.payment_intent,
            },
          ],
          { session: mongooseSession },
        );
      }

      await mongooseSession.commitTransaction();
    } catch (error) {
      console.error("Booking checkout error:", error);
      await mongooseSession.abortTransaction();
      throw error;
    } finally {
      mongooseSession.endSession();
    }
  } catch (error) {
    console.error("Error in createBookingCheckout:", error);
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

  const startDateObj = tour.startDates.find(
    sd => sd.date.getTime() === booking.startDate.getTime(),
  );
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
      startDate: booking.startDate.toISOString(),
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
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    createBookingCheckout(session);
  }

  res.status(200).json({ received: true });
};

// Get all bookings with optional filters (search, date range, paid status)
exports.getAllBookingsRegex = catchAsync(async (req, res, next) => {
  const { search, dateFrom, dateTo, paid } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  if (typeof paid !== "undefined" && paid !== "") {
    pipeline.push({
      $match: {
        paid: paid === "true",
      },
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
          {
            $expr: {
              $regexMatch: {
                input: "$userInfo.email",
                regex: search,
                options: "i",
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: "$tourInfo.name",
                regex: search,
                options: "i",
              },
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

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  });

  const [results] = await Booking.aggregate(pipeline);
  const { data = [], metadata = [] } = results;
  const total = metadata.length > 0 ? metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  const finalData = data.map(doc => ({
    ...doc,
    user: { email: doc.userInfo.email },
    tour: { name: doc.tourInfo.name },
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

// CRUD operations for bookings using the handler factory
exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
