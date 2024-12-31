const mongoose = require("mongoose");
const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const AppError = require("../utils/appError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Function to get the Stripe checkout session
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);

  const { startDate, numParticipants } = req.query;

  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  // Validate and parse numParticipants
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

  // 1) Check if the user has already booked this tour on the same start date
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

  // 2) Find the startDate object in the tour
  const startDateObj = tour.startDates.find(
    sd => new Date(sd.date).getTime() === new Date(startDateISO).getTime(),
  );
  if (!startDateObj) {
    return next(new AppError("Start date not found.", 400));
  }

  // 3) Check available spots
  const availableSpots = tour.maxGroupSize - startDateObj.participants;
  if (numParticipantsInt > availableSpots) {
    return next(
      new AppError(`Only ${availableSpots} spots left for this date.`, 400),
    );
  }

  // 4) Create Stripe checkout session
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
          unit_amount: tour.price * 100, // Price per participant
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get("host")}/img/tours/${tour.imageCover}`,
            ],
          },
        },
        quantity: numParticipantsInt, // Number of participants
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

// Function to create a booking in the database
const createBookingCheckout = async session => {
  const userEmail = session.customer_email;
  const price = session.amount_total / 100;
  const { startDate, numParticipants, bookingId, tourId } = session.metadata;

  // If no tourId in metadata, use client_reference_id (for new bookings)
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
      // If bookingId exists, update the existing booking
      const booking =
        await Booking.findById(bookingId).session(mongooseSession);
      if (!booking) throw new Error("Booking not found.");

      // Parse numParticipants as integer
      const additionalParticipants = parseInt(numParticipants, 10);
      if (isNaN(additionalParticipants)) {
        throw new Error("Invalid number of participants");
      }

      // Find the tour using actualTourId
      const tour = await Tour.findById(actualTourId).session(mongooseSession);
      if (!tour) throw new Error("Tour not found.");

      // Update the booking with additional participants
      booking.numParticipants += additionalParticipants;
      await booking.save();

      // Find startDate in tour's startDates
      const startDateObj = tour.startDates.find(
        sd => sd.date.toISOString() === startDate,
      );

      if (!startDateObj) throw new Error("Start date not found in tour.");

      startDateObj.participants += additionalParticipants;
      tour.markModified("startDates");
      await tour.save();
    } else {
      // Handle new booking creation
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
        {
          session: mongooseSession,
        },
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
};

exports.addTravelersToBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { tourId, numParticipants } = req.body;

  const token = req.cookies.jwt;
  const successUrl = `${req.protocol}://${req.get("host")}/my-tours?alert=booking&jwt=${token}`;

  // Validate and parse numParticipants
  const numParticipantsInt = parseInt(numParticipants, 10);
  if (isNaN(numParticipantsInt) || numParticipantsInt < 1) {
    return next(new AppError("Invalid number of participants.", 400));
  }

  // Find the booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError("Booking not found.", 404));
  }

  // Find the tour
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError("Tour not found.", 404));
  }

  // Find the startDate object in the tour
  const startDateObj = tour.startDates.find(
    sd => sd.date.getTime() === booking.startDate.getTime(),
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

  // Create Stripe Checkout Session for additional participants
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

// Stripe webhook handler
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

// CRUD operations for bookings using the handler factory
exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
