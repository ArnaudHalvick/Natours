const mongoose = require("mongoose");
const Tour = require("./tourModel");

// Create Review Schema
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
      minlength: [10, "Review must be at least 10 characters"],
      maxlength: [300, "Review must be less than or equal to 300 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populate tour and user information when querying reviews, except when populating as part of a tour
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

// Static method to calculate average ratings for a tour
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // Match reviews for the specific tour
    },
    {
      $group: {
        _id: "$tour", // Group by tour ID
        nRating: { $sum: 1 }, // Count the number of reviews
        avgRating: { $avg: "$rating" }, // Calculate the average rating
      },
    },
  ]);

  // If there are reviews, update the Tour's ratingsAverage and ratingsQuantity
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // Set default values if no reviews
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: null, // Default average rating
    });
  }
};

// Run `calcAverageRatings` after saving a review
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.tour);
});

// Pre hook for `findOneAndUpdate` and `findOneAndDelete` to get the document before the operation
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Get the document being updated or deleted
  this.r = await this.model.findById(this.getQuery()._id);
  next();
});

// Post hook for `findOneAndUpdate` and `findOneAndDelete`
reviewSchema.post(/^findOneAnd/, async function () {
  // Use the stored document's tour ID to recalculate ratings after update/delete
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// Create Review model
const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
