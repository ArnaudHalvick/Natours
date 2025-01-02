const Booking = require("../models/bookingModel");
const Refund = require("../models/refundModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Method to get all refunds
exports.getAllRefunds = catchAsync(async (req, res, next) => {
  // Execute query with APIFeatures
  const features = new APIFeatures(
    Refund.find()
      .populate({
        path: "booking",
        select: "_id",
      })
      .populate({
        path: "user",
        select: "name email",
      }),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Get total count for pagination
  const totalCount = await Refund.countDocuments(features.query._conditions);

  // Execute query
  const refunds = await features.query;

  // Send response
  res.status(200).json({
    status: "success",
    results: refunds.length,
    total: totalCount,
    data: {
      refunds,
    },
  });
});

// User requests a refund
exports.requestRefund = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return next(new AppError("No booking found with this ID.", 404));
  }

  if (booking.user._id.toString() !== req.user.id) {
    return next(
      new AppError("You do not have permission to refund this booking.", 403),
    );
  }

  const hasStarted = new Date(booking.startDate) < new Date();
  if (hasStarted) {
    return next(
      new AppError("Refunds are not allowed after the tour start date.", 400),
    );
  }

  try {
    const refund = await Refund.create({
      booking: booking._id,
      user: req.user.id,
      status: "pending",
      amount: booking.price,
      requestedAt: new Date(),
    });

    res.status(201).json({
      status: "success",
      data: refund,
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(
        new AppError(
          "A refund request has already been submitted for this booking.",
          400,
        ),
      );
    }
    return next(err);
  }
});

// Admin processes a refund
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

  const paymentIntentId = refund.booking.paymentIntentId;
  const refundResponse = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refund.amount * 100,
  });

  refund.status = "processed";
  refund.processedAt = new Date();
  refund.stripeRefundId = refundResponse.id;
  await refund.save();

  res.status(200).json({
    status: "success",
    data: refund,
  });
});

// Admin rejects a refund
exports.rejectRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.refundId);

  if (!refund) {
    return next(new AppError("No refund request found with this ID.", 404));
  }

  if (refund.status !== "pending") {
    return next(
      new AppError("This refund request has already been processed.", 400),
    );
  }

  refund.status = "rejected";
  await refund.save();

  res.status(200).json({
    status: "success",
    data: refund,
  });
});
