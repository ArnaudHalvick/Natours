const express = require("express");
const router = express.Router();

const tourController = require("./../controllers/tourController");
const authController = require("./../controllers/authController");
const reviewController = require("./../controllers/reviewController");

const reviewRouter = require("./reviewRoutes");

const { parseJSONFields } = require("../utils/parseJSONFields");

// --- Public Routes ---
router.route("/").get(tourController.getAllTours);

router.route("/regex").get(tourController.getAllToursRegex);

// Search and stats routes
router.route("/tour-stats").get(tourController.getTourStats);

// Location-based routes
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getTourWithin);

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

// --- Protected Routes ---
router.use(authController.protect);
router.use(authController.restrictTo("admin", "lead-guide"));

// Place specific routes BEFORE parameterized routes
router.route("/available-guides").get(tourController.getAvailableGuides);

// Tour CRUD operations
router.route("/").post(
  tourController.uploadTourImages,
  parseJSONFields(["locations", "startLocation", "startDates", "guides"]), // Added guides
  tourController.resizeTourImages,
  tourController.createNewTour,
);

// Place ID routes after all specific routes
router
  .route("/:id")
  .get(tourController.getTourById)
  .patch(
    tourController.uploadTourImages,
    parseJSONFields(["locations", "startLocation", "startDates", "guides"]), // Added guides
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(tourController.deleteTour);

// Other admin routes
router.route("/:id/hide").patch(reviewController.hideReview);

// Reviews nested route - place at the end
router.use("/:tourId/reviews", reviewRouter);

module.exports = router;
