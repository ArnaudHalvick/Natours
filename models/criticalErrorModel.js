// models/criticalErrorModel.js
const mongoose = require("mongoose");
const Email = require("../utils/email");

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
  notifiedSupport: {
    type: Boolean,
    default: false,
  },
  notificationAttempts: {
    type: Number,
    default: 0,
  },
  lastNotificationAttempt: Date,
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

criticalErrorSchema.methods.notifySupport = async function () {
  if (this.notifiedSupport) return;

  try {
    if (this.notificationAttempts >= 3) {
      console.error(
        `Failed to notify support after ${this.notificationAttempts} attempts for error ${this._id}`,
      );
      return;
    }

    // Create a support user object
    const supportUser = {
      email: process.env.SUPPORT_TEAM_EMAIL || process.env.EMAIL_FROM,
      name: "Support Team",
    };

    // Create a dummy URL for now (you can modify this to point to your admin panel)
    const errorUrl = `${process.env.BASE_URL || "http://localhost:8000"}/admin/errors/${this.sessionId}`;

    // Create and send the email
    const email = new Email(supportUser, errorUrl);
    await email.send("criticalError", "🚨 CRITICAL: Booking System Error", {
      errorType: "Booking System Critical Error",
      bookingError: this.bookingError,
      refundError: this.refundError,
      sessionId: this.sessionId,
      paymentIntentId: this.paymentIntentId,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
    });

    this.notifiedSupport = true;
    this.lastNotificationAttempt = new Date();
    await this.save();
  } catch (error) {
    console.error("Failed to notify support:", error);

    this.notificationAttempts += 1;
    this.lastNotificationAttempt = new Date();
    await this.save();

    // Retry after 5 minutes if failed
    if (this.notificationAttempts < 3) {
      setTimeout(
        () => {
          this.notifySupport();
        },
        5 * 60 * 1000,
      );
    }
  }
};

const CriticalError = mongoose.model("CriticalError", criticalErrorSchema);

module.exports = CriticalError;
