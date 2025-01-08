// reviewModel.js

const mongoose = require("mongoose");
const Tour = require("./tourModel");

// Review Schema
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

// Indexes
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Middleware to populate user information
const autoPopulate = function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
};

reviewSchema.pre(/^find/, autoPopulate);

// Static Method to Calculate Average Ratings
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: null,
    });
  }
};

// Hooks to Update Ratings After Save
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.model.findById(this.getQuery()._id);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// Model
const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
