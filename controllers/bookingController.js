const Tour = require("../models/tourModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const AppError = require("./../utils/appError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Function to get the Stripe checkout session
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the tour being booked
  const tour = await Tour.findById(req.params.tourId);

  // 2) Get the startDate from req.query
  const { startDate } = req.query;

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

  // 3) Create checkout session
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
          unit_amount: tour.price * 100, // Amount in cents
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
      startDate: startDateISO, // Include startDate in metadata
    },
  });

  // 4) Send session as response
  res.status(200).json({
    status: "success",
    session,
  });
});

// Function to create a booking in the database
const createBookingCheckout = async session => {
  const tourId = session.client_reference_id; // Tour ID passed in as client reference
  const userEmail = session.customer_email; // User email from Stripe session
  const price = session.amount_total / 100; // Amount is in cents, so divide by 100
  const startDate = session.metadata.startDate
    ? new Date(session.metadata.startDate)
    : null; // Retrieve and parse startDate

  // Find the user by email
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    console.error(`No user found with email: ${userEmail}`);
    return;
  }

  // Create a new booking document in the database
  await Booking.create({ tour: tourId, user: user._id, price, startDate });
};

// Stripe webhook handler
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    // Verify and construct the Stripe event using the raw body
    event = stripe.webhooks.constructEvent(
      req.body, // req.body is the raw body because of express.raw()
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Create booking from session data
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
