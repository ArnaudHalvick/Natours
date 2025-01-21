// controllers/refundController.js

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Booking = require("../models/bookingModel");
const Refund = require("../models/refundModel");
const Tour = require("../models/tourModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Allowed fields for sorting to prevent injection attacks
const ALLOWED_SORT_FIELDS = [
  "requestedAt",
  "-requestedAt",
  "amount",
  "-amount",
];

/**
 * Helper: Perform partial Stripe refunds if this is not a manual booking.
 * Returns an array of Stripe Refund IDs or an empty array if no Stripe calls were made.
 */
async function partialStripeRefund(booking, refundAmount) {
  // If it's a manual booking or there's no recorded paymentIntents, skip Stripe
  if (booking.isManual || !booking.paymentIntents?.length) {
    return [];
  }

  // Calculate total paid
  const totalPaid = booking.paymentIntents.reduce(
    (acc, pi) => acc + pi.amount,
    0,
  );

  // Check if we're trying to refund more than was actually paid
  if (refundAmount > totalPaid) {
    throw new AppError(
      `Refund amount (${refundAmount.toFixed(
        2,
      )}) exceeds total paid (${totalPaid.toFixed(2)}).`,
      400,
    );
  }

  let remainingToRefund = refundAmount;
  const stripeRefundIds = [];

  // Loop through paymentIntents in the order they were stored
  for (const pi of booking.paymentIntents) {
    if (remainingToRefund <= 0) break; // Done refunding

    const canRefund = Math.min(pi.amount, remainingToRefund);
    if (canRefund <= 0) continue;

    // Create a partial refund in Stripe
    const stripeResponse = await stripe.refunds.create({
      payment_intent: pi.id,
      amount: canRefund * 100, // convert dollars to cents
    });

    stripeRefundIds.push(stripeResponse.id);
    remainingToRefund -= canRefund;
  }

  // If somehow we couldn't fully refund the requested amount
  if (remainingToRefund > 0) {
    throw new AppError(
      "Unable to fully refund the requested amount. Please check logs.",
      500,
    );
  }

  return stripeRefundIds;
}

/**
 * Helper: Decrement the participants count in the Tour for the booking's date.
 */
async function updateTourParticipants(booking) {
  const tour = await Tour.findById(booking.tour);
  if (!tour) return;

  // Normalize both booking.startDate and each tour date to midnight UTC
  const toUtcMidnight = date => {
    const dt = new Date(date);
    return new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
    );
  };

  const bookingMidnight = toUtcMidnight(booking.startDate).getTime();

  // Find the matching tour date
  const dateObj = tour.startDates.find(
    sd => toUtcMidnight(sd.date).getTime() === bookingMidnight,
  );

  if (dateObj) {
    // Reduce participant count
    dateObj.participants = Math.max(
      0,
      dateObj.participants - booking.numParticipants,
    );
    tour.markModified("startDates");
    await tour.save();
  }
}

/**
 * GET /api/v1/refunds
 * Retrieve all refunds with optional search, filtering, sorting, pagination.
 */
exports.getAllRefunds = catchAsync(async (req, res, next) => {
  const { search, status, dateFrom, dateTo, sort } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  // Validate sort parameter
  let sortStage = { requestedAt: -1 }; // Default sort: Latest First
  if (sort && ALLOWED_SORT_FIELDS.includes(sort)) {
    const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith("-") ? -1 : 1;
    sortStage = { [sortField]: sortOrder };
  }

  const pipeline = [];

  // Status filter
  if (status) {
    pipeline.push({ $match: { status } });
  }

  // Date range filter
  if (dateFrom || dateTo) {
    const dateQuery = {};
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;
    }
    pipeline.push({ $match: { requestedAt: dateQuery } });
  }

  // Lookup for user information
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
  );

  // Search
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "userInfo.name": { $regex: search, $options: "i" } },
          { "userInfo.email": { $regex: search, $options: "i" } },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: "$booking" },
                regex: search,
                options: "i",
              },
            },
          },
        ],
      },
    });
  }

  // Apply sort stage
  pipeline.push({ $sort: sortStage });

  // Pagination with facet
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  });

  const [results] = await Refund.aggregate(pipeline);
  const { data = [], metadata = [] } = results;
  const total = metadata.length > 0 ? metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  const finalData = data.map(doc => ({
    ...doc,
    user: {
      name: doc.userInfo.name,
      email: doc.userInfo.email,
    },
    userInfo: undefined,
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

/**
 * POST /api/v1/refunds/request/:bookingId
 * User-facing endpoint to request a refund.
 */
exports.requestRefund = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return next(new AppError("No booking found with this ID.", 404));
  }

  // Ensure user requesting the refund is the owner of the booking
  if (booking.user._id.toString() !== req.user.id) {
    return next(
      new AppError("You do not have permission to refund this booking.", 403),
    );
  }

  // Restrict refunds after the tour start date
  if (new Date(booking.startDate) < new Date()) {
    return next(
      new AppError("Refunds are not allowed after the tour start date.", 400),
    );
  }

  // Create a new Refund document (one per booking per user)
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
    // Handle duplicate key error if a refund is already requested
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

/**
 * PATCH /api/v1/refunds/process/:refundId
 * Admin endpoint to process a pending refund (Stripe + update participants).
 */
exports.processRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.refundId).populate("booking");
  if (!refund) {
    return next(new AppError("No refund request found with this ID.", 404));
  }

  // Ensure the refund is still pending
  if (refund.status !== "pending") {
    return next(
      new AppError("This refund request has already been processed.", 400),
    );
  }

  // Grab the associated booking
  const booking = refund.booking;
  if (!booking) {
    return next(new AppError("No booking found for this refund request.", 404));
  }

  // Check if booking is already refunded
  if (booking.paid === "refunded") {
    return next(new AppError("This booking has already been refunded.", 400));
  }

  try {
    // Perform partial Stripe refund (if needed)
    const stripeRefundIds = await partialStripeRefund(booking, refund.amount);

    // If we actually did a Stripe refund, store the IDs
    if (stripeRefundIds.length > 0) {
      refund.stripeRefundId = stripeRefundIds.join(", ");
    }

    // Update participants on the relevant tour date
    await updateTourParticipants(booking);

    // Mark refund as processed
    refund.status = "processed";
    refund.processedAt = new Date();
    await refund.save();

    // Mark booking as refunded
    booking.paid = "refunded"; // or whatever your "refunded" status is
    booking.numParticipants = 0; // no participants remain on a refunded booking
    await booking.save();

    // Respond to the client
    res.status(200).json({
      status: "success",
      data: refund,
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    return next(
      new AppError(
        `Failed to ${
          booking.isManual ? "record" : "process"
        } the refund. Please try again.`,
        500,
      ),
    );
  }
});

/**
 * PATCH /api/v1/refunds/reject/:refundId
 * Admin endpoint to reject a pending refund.
 */
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

/**
 * POST /api/v1/refunds/admin/:bookingId
 * Admin endpoint to directly refund a booking without creating a refund request.
 */
exports.adminDirectRefund = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) {
    return next(new AppError("No booking found with this ID.", 404));
  }

  // Restrict refunds after the tour start date
  if (new Date(booking.startDate) < new Date()) {
    return next(
      new AppError("Refunds are not allowed after the tour start date.", 400),
    );
  }

  try {
    const refundAmount = booking.price; // or compute a custom amount if needed

    // Perform partial Stripe refund (if needed)
    const stripeRefundIds = await partialStripeRefund(booking, refundAmount);

    // Create a new Refund document immediately as 'processed'
    const refund = await Refund.create({
      booking: booking._id,
      user: booking.user,
      status: "processed", // directly processed since admin is doing it
      amount: booking.price,
      requestedAt: new Date(),
      processedAt: new Date(),
      stripeRefundId: stripeRefundIds.join(", "),
    });

    // Update participants on the relevant tour date
    await updateTourParticipants(booking);

    // Mark booking as refunded
    booking.paid = "refunded";
    booking.numParticipants = 0;
    await booking.save();

    // Return success response
    res.status(200).json({
      status: "success",
      data: refund,
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    return next(
      new AppError("Failed to process the refund. Please try again.", 500),
    );
  }
});
