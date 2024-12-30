const express = require("express");
const authController = require("../controllers/authController");
const invoiceController = require("../controllers/invoiceController");

const router = express.Router();

// Invoice download route
router.get(
  "/download-invoice/:transactionId",
  authController.protect,
  invoiceController.downloadInvoice,
);

module.exports = router;
