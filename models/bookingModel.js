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
      type: Date,
      default: Date.now,
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
