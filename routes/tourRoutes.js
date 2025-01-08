const express = require("express");
const tourController = require("./../controllers/tourController");
const authController = require("./../controllers/authController");
const reviewController = require("./../controllers/reviewController");
const reviewRouter = require("./reviewRoutes");

const router = express.Router();

// Public routes (No authentication required)

// 1) Route to get tours within a certain distance (lat, lng) in specific units (mi/km)
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getTourWithin);

// 2) Route to get distances to all tours from a given point (lat, lng) in specific units (mi/km)
router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

// 3) Nested route for handling reviews on a specific tour
// Forward any route for reviews (e.g., /:tourId/reviews) to reviewRouter
router.use("/:tourId/reviews", reviewRouter);

// 6) Route to get aggregated tour statistics (e.g., average price, ratings, etc.)
router.route("/tour-stats").get(tourController.getTourStats);

// 7) Route to get all tours or a specific tour by ID
router.route("/").get(tourController.getAllTours);
router.route("/:id").get(tourController.getTourById);

// 8) Protect all routes after this middleware (authentication required)
router.use(authController.protect);

// 9) Restrict the following routes to "admin" or "lead-guide" roles
router.use(authController.restrictTo("admin", "lead-guide"));

// 10) Routes for creating, updating, and deleting tours (restricted to "admin" and "lead-guide")
router.route("/").post(tourController.createNewTour);

router
  .route("/:id/hide")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    reviewController.hideReview,
  );

router
  .route("/:id")
  .patch(
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(tourController.deleteTour);

// 11) Route for updating tour guides (restricted to "admin" or "lead-guide")
router.route("/guides/:id").patch(tourController.updateTourGuides);

module.exports = router;
