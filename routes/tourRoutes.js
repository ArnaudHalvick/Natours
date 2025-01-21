const express = require("express");
const router = express.Router();

const tourController = require("./../controllers/tourController");
const authController = require("./../controllers/authController");
const reviewController = require("./../controllers/reviewController");

const reviewRouter = require("./reviewRoutes");

const { parseJSONFields } = require("../utils/parseJSONFields");
const catchAsync = require("../utils/catchAsync");

// --- Public Routes ---

// Regular tour routes
router.route("/").get(tourController.getAllTours);
router.route("/regex").get(tourController.getAllToursRegex);

router.route("/:id").get(tourController.getTourById);

// Search and stats routes
router.route("/tour-stats").get(tourController.getTourStats);

// Location-based routes
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getTourWithin);

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

// Reviews nested route
router.use("/:tourId/reviews", reviewRouter);

// --- Protected Routes ---
router.use(authController.protect);
router.use(authController.restrictTo("admin", "lead-guide"));

// Tour CRUD operations
router
  .route("/")
  .post(
    tourController.uploadTourImages,
    parseJSONFields(["locations", "startLocation", "startDates"]),
    tourController.resizeTourImages,
    tourController.createNewTour,
  );

router
  .route("/:id")
  .patch(
    tourController.uploadTourImages,
    parseJSONFields(["locations", "startLocation", "startDates"]),
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(tourController.deleteTour);

// Other admin routes
router.route("/:id/hide").patch(reviewController.hideReview);

module.exports = router;
