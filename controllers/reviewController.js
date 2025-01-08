const Review = require("./../models/reviewModel");
const Booking = require("./../models/bookingModel");
const User = require("./../models/userModel");
const Refund = require("./../models/refundModel");

const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/appError");

// Middleware to set tour and user IDs when using the nested route
exports.setTourUserIds = (req, res, next) => {
  // If `tourId` is in the params, set it in the body (only if not already provided)
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // Set the currently logged-in user in the body
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.validateReviewEligibility = catchAsync(async (req, res, next) => {
  // 1) Find the specific booking for this tour and user
  const booking = await Booking.findOne({
    user: req.user.id,
    tour: req.params.tourId || req.body.tour,
  });

  if (!booking) {
    return next(new AppError("You have not booked this tour.", 403));
  }

  // 2) Check if the start date of this specific booking is in the past
  if (new Date(booking.startDate) > new Date()) {
    return next(
      new AppError(
        "You cannot create a review before the tour has started.",
        403,
      ),
    );
  }

  // 3) Check if there is a refund request for this specific booking
  const refund = await Refund.findOne({
    booking: booking._id, // Ensure refund is tied to this specific booking
    user: req.user.id,
  });

  if (
    refund &&
    (refund.status === "pending" || refund.status === "processed")
  ) {
    return next(
      new AppError(
        "You requested a refund for this booking and cannot review it.",
        403,
      ),
    );
  }

  next();
});

exports.hideReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }
  // Allow toggling
  if (req.body.hidden !== undefined) {
    review.hidden = req.body.hidden;
  } else {
    // Fallback: default to true if no `hidden` value is passed
    review.hidden = true;
  }
  await review.save();

  res.status(200).json({
    status: "success",
    data: {
      review,
    },
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError("No review found with that ID", 404));
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Regex search endpoint for reviews
exports.getAllReviewsRegex = catchAsync(async (req, res, next) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  let query = Review.find();

  // Join with Tour and User
  query = query
    .populate({
      path: "tour",
      select: "name",
    })
    .populate({
      path: "user",
      select: "name",
    });

  // Filter by tour if provided
  if (req.query.tourId) {
    query = query.find({ tour: req.query.tourId });
  }

  // Filter by rating if provided
  if (req.query.rating) {
    query = query.find({ rating: req.query.rating });
  }

  // Search in review text and user name
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    const users = await User.find({ name: searchRegex }).select("_id");
    const userIds = users.map(user => user._id);

    query = query.find({
      $or: [{ review: searchRegex }, { user: { $in: userIds } }],
    });
  }

  // Execute query
  const reviews = await query.exec();

  // Apply pagination
  const paginatedReviews = reviews.slice(skip, skip + limit);

  res.status(200).json({
    status: "success",
    results: paginatedReviews.length,
    data: {
      data: paginatedReviews,
      pagination: {
        total: reviews.length,
        totalPages: Math.ceil(reviews.length / limit),
        currentPage: page,
        limit,
      },
    },
  });
});

exports.updateReview = catchAsync(async (req, res, next) => {
  // 1) Get the review
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // 2) If the review is hidden and the user is not an admin, block the update
  if (review.hidden && req.user.role !== "admin") {
    return next(
      new AppError(
        "This review has been hidden by an admin and cannot be updated.",
        403,
      ),
    );
  }

  // 3) Pass control to the factory function for the actual update
  return factory.updateOne(Review)(req, res, next);
});

// Get all reviews with filtering, sorting, pagination, and field limiting
exports.getAllReviews = factory.getAll(Review);

// Get a specific review by ID
exports.getReview = factory.getOne(Review);

// Create a new review
exports.createReview = factory.createOne(Review);
