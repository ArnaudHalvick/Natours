const express = require("express");
const authController = require("../controllers/authController");
const invoiceController = require("../controllers/invoiceController");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get all transactions for the current user
router.get("/transactions", bookingController.getAllUserTransactions);

// Invoice download route
router.get(
  "/download-invoice/:transactionId",
  invoiceController.downloadInvoice,
);

module.exports = router;
