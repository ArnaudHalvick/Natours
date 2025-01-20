// bookingModel.js

const mongoose = require("mongoose");

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
      type: Date,
      required: [true, "Booking must have a date"],
    },
    numParticipants: {
      type: Number,
      required: [true, "Booking must have a number of participants"],
      validate: {
        validator: function (value) {
          // If the booking is paid/active, require at least 1
          if (this.paid) {
            return value >= 1;
          }
          // If booking is no longer paid (canceled/refunded), 0 is allowed
          return value >= 0;
        },
        message:
          "Number of participants must be at least 1 for active bookings",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    paid: {
      type: Boolean,
      default: true,
    },
    paymentIntents: [
      {
        id: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
    // Keep paymentIntentId for backwards compatibility
    paymentIntentId: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Middleware to populate references
const autoPopulate = function (next) {
  this.populate("user").populate({
    path: "tour",
    select: "name slug startLocation imageCover",
  });
  next();
};

bookingSchema.pre(/^find/, autoPopulate);

module.exports = mongoose.model("Booking", bookingSchema);
