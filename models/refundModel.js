const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: "Booking",
    required: [true, "Refund must belong to a booking."],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Refund must be requested by a user."],
  },
  status: {
    type: String,
    enum: ["pending", "processed", "rejected"],
    default: "pending",
  },
  amount: {
    type: Number,
    required: [true, "Refund must have an amount."],
  },
  processedAt: Date,
  stripeRefundId: String, // Optional: Store Stripe refund ID
});

reviewSchema.index({ booking: 1, user: 1 }, { unique: true });

const Refund = mongoose.model("Refund", refundSchema);
module.exports = Refund;
