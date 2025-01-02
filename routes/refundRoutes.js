const express = require("express");
const authController = require("../controllers/authController");
const refundController = require("../controllers/refundController");

const router = express.Router();

// Route to get all refunds
router.get(
  "/all-refunds",
  authController.protect,
  authController.restrictTo("admin"),
  refundController.getAllRefunds,
);

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

// Route for admin to reject the refund
router.patch(
  "/reject/:refundId",
  authController.protect,
  authController.restrictTo("admin"),
  refundController.rejectRefund, // This function will be added
);

module.exports = router;
