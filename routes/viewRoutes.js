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

module.exports = router;