const express = require("express");
const reviewController = require("./../controllers/reviewController");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true }); // Merge params to access tourId from tour routes

// Public route to get all reviews
router.route("/").get(reviewController.getAllReviews);

// Protect all routes after this middleware (authenticated users only)
router.use(authController.protect);

// Routes for authenticated users to post a review
router
  .route("/")
  .post(
    authController.restrictTo("user", "admin"),
    reviewController.setTourUserIds,
    reviewController.validateReviewEligibility,
    reviewController.createReview,
  );

router.route("/regex").get(reviewController.getAllReviewsRegex);

// Routes for authenticated users with role-based restrictions (user or admin)
router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo("user", "admin"),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview,
  );

module.exports = router;
