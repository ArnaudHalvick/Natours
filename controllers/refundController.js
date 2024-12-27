// refundController.js
const Booking = require("../models/bookingModel");
const Refund = require("../models/refundModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Stripe for refunds

// 1) User requests a refund
exports.requestRefund = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  // Check if booking exists
  if (!booking) {
    return next(new AppError("No booking found with this ID.", 404));
  }

  // Ensure the logged-in user owns this booking
  if (booking.user._id.toString() !== req.user.id) {
    return next(
      new AppError("You do not have permission to refund this booking.", 403),
    );
  }

  // Check if the booking is eligible for a refund (e.g., before the tour starts)
  const hasStarted = new Date(booking.startDate) < new Date();
  if (hasStarted) {
    return next(
      new AppError("Refunds are not allowed after the tour start date.", 400),
    );
  }

  // Create a refund request
  const refund = await Refund.create({
    booking: booking._id,
    user: req.user.id,
    status: "pending",
    amount: booking.price,
  });

  res.status(201).json({
    status: "success",
    data: refund,
  });
});

// 2) Admin processes a refund
exports.processRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.refundId).populate("booking");

  if (!refund) {
    return next(new AppError("No refund request found with this ID.", 404));
  }

  if (refund.status !== "pending") {
    return next(
      new AppError("This refund request has already been processed.", 400),
    );
  }

  // Process the refund through Stripe
  const paymentIntentId = refund.booking.paymentIntentId; // Must be stored in booking
  const refundResponse = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refund.amount * 100, // Stripe expects amount in cents
  });

  // Update refund status
  refund.status = "processed";
  refund.processedAt = new Date();
  refund.stripeRefundId = refundResponse.id;
  await refund.save();

  res.status(200).json({
    status: "success",
    data: refund,
  });
});
