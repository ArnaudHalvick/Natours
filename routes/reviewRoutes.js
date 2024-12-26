const express = require("express");
const reviewController = require("./../controllers/reviewController");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true }); // Merge params to access tourId from tour routes

// Public route to get all reviews
router.route("/").get(reviewController.getAllReviews);

// Protect all routes after this middleware (authenticated users only)
router.use(authController.protect);

// Routes for authenticated users to post a review
router.route("/").post(
  authController.restrictTo("user"), // Only users can post reviews
  reviewController.setTourUserIds,
  reviewController.preventReviewBeforeStart,
  reviewController.createReview,
);

// Routes for authenticated users with role-based restrictions (user or admin)
router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(authController.restrictTo("user"), reviewController.updateReview)
  .delete(
    authController.restrictTo("user", "admin"), // Admins can't modify reviews but they can delete them if necessary (offensive reviews)
    reviewController.deleteReview,
  );

module.exports = router;
