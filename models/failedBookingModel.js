// models/failedBookingModel.js
const mongoose = require("mongoose");

const failedBookingSchema = new mongoose.Schema({
  error: {
    type: String,
    required: [true, "Error message is required"],
  },
  sessionId: {
    type: String,
    required: [true, "Stripe session ID is required"],
  },
  paymentIntentId: {
    type: String,
    required: [true, "Payment intent ID is required"],
  },
  refundId: {
    type: String,
  },
  metadata: {
    type: Object,
    required: [true, "Session metadata is required"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Additional fields for debugging
  tourId: String,
  userEmail: String,
  amount: Number,
  resolved: {
    type: Boolean,
    default: false,
  },
  resolutionNotes: String,
});

// Index for efficient querying
failedBookingSchema.index({ timestamp: -1 });
failedBookingSchema.index({ sessionId: 1 }, { unique: true });

const FailedBooking = mongoose.model("FailedBooking", failedBookingSchema);

module.exports = FailedBooking;
