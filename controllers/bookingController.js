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

  const { startDate } = req.query;
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

  // Check for existing booking
  const existingBooking = await Booking.findOne({
    tour: req.params.tourId,
    user: req.user.id,
    startDate: startDateISO,
  });

  if (existingBooking) {
    return next(
      new AppError(
        "You have already booked this tour on the selected date.",
        400,
      ),
    );
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${req.protocol}://${req.get("host")}/my-tours?alert=booking`,
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
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      startDate: startDateISO,
    },
  });

  res.status(200).json({
    status: "success",
    session,
  });
});

// Function to create a booking in the database
const createBookingCheckout = async session => {
  const tourId = session.client_reference_id;
  const userEmail = session.customer_email;
  const price = session.amount_total / 100;
  const startDate = session.metadata.startDate
    ? new Date(session.metadata.startDate)
    : null;

  const user = await User.findOne({ email: userEmail });
  if (!user) {
    console.error(`No user found with email: ${userEmail}`);
    return;
  }

  const mongooseSession = await mongoose.startSession();
  mongooseSession.startTransaction();

  try {
    const tour = await Tour.findById(tourId).session(mongooseSession);
    if (!tour) throw new Error("Tour not found.");

    const startDateObj = tour.startDates.find(
      sd => sd.date.getTime() === startDate.getTime(),
    );

    if (!startDateObj) throw new Error("Start date not found.");
    if (startDateObj.participants >= tour.maxGroupSize)
      throw new Error("No spots left for this start date.");

    startDateObj.participants += 1;
    await tour.save({ session: mongooseSession });

    await Booking.create([{ tour: tourId, user: user._id, price, startDate }], {
      session: mongooseSession,
    });

    await mongooseSession.commitTransaction();
    mongooseSession.endSession();
  } catch (error) {
    await mongooseSession.abortTransaction();
    mongooseSession.endSession();
    console.error("Error during booking transaction:", error);
    throw new AppError(error.message, 400);
  }
};

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
