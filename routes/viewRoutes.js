const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(viewsController.alerts);

// Check if the user is logged in for all routes
router.use(authController.isLoggedIn);

router.get("/", viewsController.getOverview);

router.get("/tour/:slug", viewsController.getTour);
router.get("/login", viewsController.getLogin);
router.get("/signup", viewsController.getSignup);
router.get("/me", authController.protect, viewsController.getAccount);
router.get("/my-tours", authController.protect, viewsController.getMyTours);
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

// Route for “Edit Review” page
router.get(
  "/tour/:slug/review/:reviewId/edit",
  authController.protect,
  viewsController.getEditReviewForm,
);

// Route to see your reviews
router.get("/my-reviews", authController.protect, viewsController.getMyReviews);

// Check email, confirmation success and 2FA
router.get("/checkEmail", viewsController.getCheckEmail);
router.get("/confirmSuccess", viewsController.getConfirmSuccess);
router.get("/verify-2fa", viewsController.getVerify2FA);

module.exports = router;
