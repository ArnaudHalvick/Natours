// refundModel.js

const mongoose = require("mongoose");

// Refund Schema
const refundSchema = new mongoose.Schema(
  {
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
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    stripeRefundId: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
refundSchema.index({ booking: 1, user: 1 }, { unique: true });
refundSchema.index({ status: 1, requestedAt: -1 });
refundSchema.index({ user: 1, requestedAt: -1 });

// Middleware to populate references
const autoPopulate = function (next) {
  this.populate("booking").populate("user");
  next();
};

refundSchema.pre(/^find/, autoPopulate);

// Model
const Refund = mongoose.model("Refund", refundSchema);

module.exports = Refund;
