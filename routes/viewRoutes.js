const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

// Check if the user is logged in for all routes
router.use(authController.isLoggedIn);

router.get(
  "/",
  bookingController.createBookingCheckout,
  viewsController.getOverview,
);

router.get("/tour/:slug", viewsController.getTour);
router.get("/login", viewsController.getLogin);
router.get("/signup", viewsController.getSignup);
router.get("/me", authController.protect, viewsController.getAccount);
router.get("/my-tours", authController.protect, viewsController.getMyTours);

module.exports = router;
