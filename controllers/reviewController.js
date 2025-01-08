// Importing required models and utilities
const Review = require("./../models/reviewModel");
const Booking = require("./../models/bookingModel");
const User = require("./../models/userModel");
const Refund = require("./../models/refundModel");

const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/appError");

// Middleware to set tour and user IDs when using the nested route
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Middleware to validate if a user is eligible to leave a review
exports.validateReviewEligibility = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    user: req.user.id,
    tour: req.params.tourId || req.body.tour,
  });

  if (!booking)
    return next(new AppError("You have not booked this tour.", 403));

  if (new Date(booking.startDate) > new Date()) {
    return next(
      new AppError(
        "You cannot create a review before the tour has started.",
        403,
      ),
    );
  }

  const refund = await Refund.findOne({
    booking: booking._id,
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

// Middleware to hide a review
exports.hideReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError("No review found with that ID", 404));

  review.hidden = req.body.hidden !== undefined ? req.body.hidden : true;
  await review.save();

  res.status(200).json({
    status: "success",
    data: { review },
  });
});

// Handler to delete a review by ID
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError("No review found with that ID", 404));

  await Review.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Handler to get all reviews using regex search and optional filters
exports.getAllReviewsRegex = catchAsync(async (req, res, next) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  let query = Review.find().populate("tour", "name").populate("user", "name");

  if (req.query.tourId) query = query.find({ tour: req.query.tourId });
  if (req.query.rating) query = query.find({ rating: req.query.rating });

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    const users = await User.find({ name: searchRegex }).select("_id");
    const userIds = users.map(user => user._id);

    query = query.find({
      $or: [{ review: searchRegex }, { user: { $in: userIds } }],
    });
  }

  const reviews = await query.exec();
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

// Handler to update a review
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError("Review not found", 404));

  if (review.hidden && req.user.role !== "admin") {
    return next(
      new AppError(
        "This review has been hidden by an admin and cannot be updated.",
        403,
      ),
    );
  }

  return factory.updateOne(Review)(req, res, next);
});

// Get all reviews with filtering, sorting, pagination, and field limiting
exports.getAllReviews = factory.getAll(Review);

// Get a specific review by ID
exports.getReview = factory.getOne(Review);

// Create a new review
exports.createReview = factory.createOne(Review);
