const express = require("express");
const authController = require("./../controllers/authController");
const bookingController = require("./../controllers/bookingController");

const router = express.Router({ mergeParams: true }); // Merge params to access tourId from tour routes

// Public route for creating a checkout session
router.get(
  "/checkout-session/:tourId",
  authController.protect,
  bookingController.getCheckoutSession,
);

// Protect and restrict the following routes to admins only
router.use(authController.protect, authController.restrictTo("admin"));

// Admin routes for managing bookings
router
  .route("/")
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route("/:id")
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;