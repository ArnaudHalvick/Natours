const Review = require("./../models/reviewModel");
const Booking = require("./../models/bookingModel");
const Refund = require("./../models/refundModel");
const factory = require("./handlerFactory");
const catchAsync = require("./../utils/catchAsync");

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

  // Check if the review's tour or user exists
  if (!review.tour || !review.user) {
    return next(
      new AppError("This review is invalid (missing tour or user).", 400),
    );
  }

  review.hidden = true;
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

// Get all reviews with filtering, sorting, pagination, and field limiting
exports.getAllReviews = factory.getAll(Review);

// Get a specific review by ID
exports.getReview = factory.getOne(Review);

// Update a review by ID
exports.updateReview = factory.updateOne(Review);

// Create a new review
exports.createReview = factory.createOne(Review);
