const Review = require("./../models/reviewModel");
const factory = require("./handlerFactory");

// Middleware to set tour and user IDs when using the nested route
exports.setTourUserIds = (req, res, next) => {
  // If `tourId` is in the params, set it in the body (only if not already provided)
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // Set the currently logged-in user in the body
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Get all reviews with filtering, sorting, pagination, and field limiting
exports.getAllReviews = factory.getAll(Review);

// Get a specific review by ID
exports.getReview = factory.getOne(Review);

// Update a review by ID
exports.updateReview = factory.updateOne(Review);

// Create a new review
exports.createReview = factory.createOne(Review);

// Delete a review by ID
exports.deleteReview = factory.deleteOne(Review);
