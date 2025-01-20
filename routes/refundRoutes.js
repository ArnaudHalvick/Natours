const express = require("express");
const authController = require("../controllers/authController");
const refundController = require("../controllers/refundController");

const router = express.Router();

// Route to get all refunds
router.get(
  "/",
  authController.protect,
  authController.restrictTo("admin"),
  refundController.getAllRefunds,
);

// Route for direct admin refund (no refund request needed)
router.post(
  "/admin/:bookingId",
  authController.protect,
  authController.restrictTo("admin"),
  refundController.adminDirectRefund,
);

// Regular user refund request flow
router.post(
  "/request/:bookingId",
  authController.protect,
  refundController.requestRefund,
);

// Route for admin to process user-requested refund
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
  refundController.rejectRefund,
);

module.exports = router;
