const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");

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

// Check email, confirmation success and 2FA
router.get("/checkEmail", viewsController.getCheckEmail);
router.get("/confirmSuccess", viewsController.getConfirmSuccess);
router.get("/verify-2fa", viewsController.getVerify2FA);

// 1) Serve the "Write a Review" form:
router.get(
  "/reviews/:tourId",
  authController.protect,
  viewsController.getReviewPage,
);

// 2) Handle the form submission (POST) in a server-rendered way:
router.post(
  "/reviews/:tourId",
  authController.protect,
  reviewController.setTourUserIds, // sets req.body.tour & req.body.user
  viewsController.createReviewAndRender,
);

module.exports = router;
