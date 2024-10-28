const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour", // Reference to the Tour model
    required: [true, "Booking must belong to a tour"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Reference to the User model
    required: [true, "Booking must belong to a user"],
  },
  price: {
    type: Number,
    required: [true, "Booking must have a price"],
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically sets the booking creation date
  },
  paid: {
    // This can be used for a customer wanting to book a tour without a credit card
    type: Boolean,
    default: true, // Mark as paid by default
  },
});

// Populate user and tour data on find queries
bookingSchema.pre(/^find/, function (next) {
  this.populate("user").populate({
    path: "tour",
    select: "name",
  });
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
