// models/criticalErrorModel.js
const mongoose = require("mongoose");

const criticalErrorSchema = new mongoose.Schema({
  bookingError: {
    type: String,
    required: [true, "Booking error message is required"],
  },
  refundError: {
    type: String,
    required: [true, "Refund error message is required"],
  },
  sessionId: {
    type: String,
    required: [true, "Stripe session ID is required"],
  },
  paymentIntentId: {
    type: String,
    required: [true, "Payment intent ID is required"],
  },
  metadata: {
    type: Object,
    required: [true, "Session metadata is required"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Additional fields for support team
  notifiedSupport: {
    type: Boolean,
    default: false,
  },
  supportTicketId: String,
  resolved: {
    type: Boolean,
    default: false,
  },
  resolutionNotes: String,
  priority: {
    type: String,
    enum: ["high", "critical"],
    default: "critical",
  },
});

// Index for efficient querying
criticalErrorSchema.index({ timestamp: -1 });
criticalErrorSchema.index({ sessionId: 1 }, { unique: true });
criticalErrorSchema.index({ resolved: 1, timestamp: -1 });

// Add a method to notify support if not already notified
criticalErrorSchema.methods.notifySupport = async function () {
  if (!this.notifiedSupport) {
    // Implement your notification logic here
    // For example:
    // await sendEmailToSupport(this);
    // await createSupportTicket(this);

    this.notifiedSupport = true;
    await this.save();
  }
};

const CriticalError = mongoose.model("CriticalError", criticalErrorSchema);

module.exports = CriticalError;
