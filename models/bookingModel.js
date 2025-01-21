const mongoose = require("mongoose");
const {
  isValidISODate,
  normalizeToUTCMidnight,
} = require("../utils/dateUtils");

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Booking must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a user"],
    },
    price: {
      type: Number,
      required: [true, "Booking must have a price"],
    },
    startDate: {
      type: String, // Changed to String to store ISO format
      required: [true, "Booking must have a date"],
      validate: {
        validator: function (value) {
          return isValidISODate(value);
        },
        message: "Invalid date format. Please use ISO date string.",
      },
      set: function (value) {
        return normalizeToUTCMidnight(value);
      },
    },
    numParticipants: {
      type: Number,
      required: [true, "Booking must have a number of participants"],
      validate: {
        validator: function (value) {
          // Allow 0 participants only if booking is refunded
          if (this.paid === "refunded") {
            return value >= 0;
          }
          // Otherwise require at least 1
          return value >= 1;
        },
        message:
          "Number of participants must be at least 1 for active bookings",
      },
    },
    createdAt: {
      type: String, // Changed to String to store ISO format
      default: () => new Date().toISOString(),
      validate: {
        validator: isValidISODate,
        message: "Invalid date format for createdAt",
      },
    },
    paid: {
      type: String,
      enum: ["true", "false", "refunded"],
      default: "true",
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    paymentIntents: {
      type: [
        {
          id: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          timestamp: {
            type: String,
            default: () => new Date().toISOString(),
            validate: {
              validator: isValidISODate,
              message: "Invalid date format for payment timestamp",
            },
          },
        },
      ],
      default: [],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for common queries
bookingSchema.index({ tour: 1, user: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Middleware to populate references
bookingSchema.pre(/^find/, function (next) {
  this.populate("user").populate({
    path: "tour",
    select: "name slug startLocation imageCover",
  });
  next();
});

// Method to check if booking is in the future
bookingSchema.methods.isFutureBooking = function () {
  return new Date(this.startDate) > new Date();
};

// Method to check if booking can be modified
bookingSchema.methods.canBeModified = function () {
  return this.paid !== "refunded" && this.isFutureBooking();
};

// Method to calculate total amount from payment intents
bookingSchema.methods.getTotalPaid = function () {
  return this.paymentIntents.reduce((sum, pi) => sum + pi.amount, 0);
};

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
