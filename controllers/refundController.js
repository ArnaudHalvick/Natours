// Importing required models and utilities
const Booking = require("../models/bookingModel");
const Refund = require("../models/refundModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Allowed fields for sorting to prevent injection attacks
const ALLOWED_SORT_FIELDS = [
  "requestedAt",
  "-requestedAt",
  "amount",
  "-amount",
];

// Get all refund requests with optional filtering, sorting, and pagination
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
      // Set time to end of day for dateTo
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = endDate;
    }
    pipeline.push({
      $match: { requestedAt: dateQuery },
    });
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

  // Search functionality
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "userInfo.name": { $regex: search, $options: "i" } },
          { "userInfo.email": { $regex: search, $options: "i" } },
          // Use $toString to convert ObjectId to string for searching
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

  // Add pagination facet
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
    bookingInfo: undefined,
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

// Handle refund request from user
exports.requestRefund = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking)
    return next(new AppError("No booking found with this ID.", 404));

  if (booking.user._id.toString() !== req.user.id) {
    return next(
      new AppError("You do not have permission to refund this booking.", 403),
    );
  }

  if (new Date(booking.startDate) < new Date()) {
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

// Admin processes a refund request
exports.processRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.refundId).populate("booking");

  if (!refund)
    return next(new AppError("No refund request found with this ID.", 404));

  if (refund.status !== "pending") {
    return next(
      new AppError("This refund request has already been processed.", 400),
    );
  }

  try {
    // Process refund for each payment intent
    const refundPromises = refund.booking.paymentIntents.map(async payment => {
      return stripe.refunds.create({
        payment_intent: payment.id,
        amount: payment.amount * 100,
      });
    });

    const refundResults = await Promise.all(refundPromises);

    // Update refund record
    refund.status = "processed";
    refund.processedAt = new Date();
    refund.stripeRefundId = refundResults.map(r => r.id).join(",");
    await refund.save();

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

// Admin rejects a refund request
exports.rejectRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.refundId);

  if (!refund)
    return next(new AppError("No refund request found with this ID.", 404));

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
