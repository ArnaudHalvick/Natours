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

  try {
    // 1) Create a refund in Stripe
    const paymentIntentId = booking.paymentIntentId;
    const stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refund.amount * 100, // Convert to cents
    });

    // 2) Mark this refund as processed
    refund.status = "processed";
    refund.processedAt = new Date();
    refund.stripeRefundId = stripeRefund.id;
    await refund.save();

    // 3) Find the correct Tour and reduce participants for the matching date
    const tour = await Tour.findById(booking.tour);
    if (tour) {
      // Normalize both booking.startDate and each tour date to midnight UTC
      const toUtcMidnight = date => {
        const dt = new Date(date);
        return new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
        );
      };
      const bookingMidnight = toUtcMidnight(booking.startDate).getTime();

      // Find the matching tour date
      const dateObj = tour.startDates.find(sd => {
        return toUtcMidnight(sd.date).getTime() === bookingMidnight;
      });

      if (dateObj) {
        dateObj.participants = Math.max(
          0,
          dateObj.participants - booking.numParticipants,
        );
        tour.markModified("startDates");
        await tour.save();
      }
    }

    // 4) Mark the booking as refunded
    booking.paid = false;
    booking.numParticipants = 0; // Must be 0, which is allowed if booking is not paid
    await booking.save();

    // 5) Respond to client
    res.status(200).json({
      status: "success",
      data: refund,
    });
  } catch (error) {
    console.error("Stripe refund error:", error);
    return next(
      new AppError("Failed to process the refund. Please try again.", 500),
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
