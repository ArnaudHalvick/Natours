const express = require("express");
const authController = require("../controllers/authController");
const refundController = require("../controllers/refundController");

const router = express.Router();

// Route for user to request a refund
router.post(
  "/request/:bookingId",
  authController.protect,
  refundController.requestRefund,
);

// Route for admin to process the refund
router.patch(
  "/process/:refundId",
  authController.protect,
  authController.restrictTo("admin"),
  refundController.processRefund,
);

module.exports = router;
