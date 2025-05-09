const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");
const setJwtFromQuery = require("../utils/setJwtFromQuery");

const router = express.Router();

router.use(viewsController.alerts);

// Add the handleStripeRedirect middleware here
router.use(authController.handleStripeRedirect);

// Check if the user is logged in for all routes
router.use(authController.isLoggedIn);

router.get("/", viewsController.getOverview);

router.get("/resetPassword/:token", viewsController.getResetPasswordForm);

router.get("/emailChangeSuccess", viewsController.getEmailChangeSuccess);

router.get("/tour/:slug", viewsController.getTour);
router.get("/login", viewsController.getLogin);
router.get("/signup", viewsController.getSignup);
router.get("/me", authController.protect, viewsController.getAccount);
router.get(
  "/my-tours",
  setJwtFromQuery,
  authController.protect,
  viewsController.getMyTours,
);
router.get(
  "/tour/:slug/checkout",
  authController.protect,
  viewsController.getCheckout,
);

// Route for writing a review (only if user is logged in)
router.get(
  "/tour/:slug/review",
  authController.protect,
  viewsController.getReviewForm,
);

// Route for "Edit Review" page
router.get(
  "/tour/:slug/review/:reviewId/edit",
  authController.protect,
  viewsController.getEditReviewForm,
);

// Route to see your reviews
router.get("/my-reviews", authController.protect, viewsController.getMyReviews);

// Billing route
router.get("/billing", authController.protect, viewsController.getBillingPage);

// Route for adding travelers to a booking
router.get(
  "/booking/:bookingId/add-travelers",
  authController.protect,
  viewsController.getAddTravelers,
);

// Refunds route
router.get(
  "/manage-refunds",
  authController.protect,
  authController.restrictTo("admin"),
  viewsController.getManageRefunds,
);

router.get(
  "/manage-users",
  authController.protect,
  authController.restrictTo("admin"),
  viewsController.getManageUsersPage,
);

router.get(
  "/manage-bookings",
  authController.protect,
  authController.restrictTo("admin"),
  viewsController.getManageBookingsPage,
);

router.get(
  "/manage-reviews",
  authController.protect,
  authController.restrictTo("admin", "lead-guide"),
  viewsController.getManageReviewsPage,
);

router.get(
  "/manage-tours",
  authController.protect,
  authController.restrictTo("admin", "lead-guide"),
  viewsController.getManageToursPage,
);

// Check email, confirmation success and 2FA
router.get("/checkEmail", viewsController.getCheckEmail);
router.get("/confirmSuccess", viewsController.getConfirmSuccess);
router.get("/verify-2fa", viewsController.getVerify2FA);

// Route for confirming booking after Stripe payment
router.get(
  "/confirm-booking",
  authController.protect,
  viewsController.getBookingConfirmation
);

module.exports = router;
