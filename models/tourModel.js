// tourModel.js

const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require("./userModel");
const AppError = require("../utils/appError");

// Start Date Subschema
const startDateSchema = new mongoose.Schema({
  date: { type: Date, required: [true, "A tour must have a start date"] },
  participants: { type: Number, default: 0 },
});

// Tour Schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true,
      maxlength: [40, "A tour name must have 40 characters maximum"],
      minlength: [10, "A tour name must have 10 characters minimum"],
      validate: {
        validator: value => validator.isAlpha(value, "en-US", { ignore: " " }),
        message: "Tour name must contain only alphabetic characters",
      },
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
      min: [1, "A tour must have a minimum duration of 1 day"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
      min: [1, "Group size must be at least 1"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "hard"],
        message: "Difficulty can only be either: easy, medium, or hard",
      },
    },
    ratingsAverage: {
      type: Number,
      default: null,
      min: [1, "Rating must be at least 1.0"],
      max: [5, "Rating must be at most 5.0"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
      min: [0, "Must be 0 or more"],
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
      min: 0,
    },
    priceDiscount: {
      type: Number,
      // validate: {
      //   validator: function (val) {
      //     return val < this.price;
      //   },
      //   message: "Discount price ({VALUE}) should be below the regular price",
      // },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a summary"],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "A tour must have a description"],
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now, select: false },
    startDates: [startDateSchema],
    hidden: { type: Boolean, default: false },
    startLocation: {
      type: { type: String, default: "Point", enum: ["Point"] },
      coordinates: [Number],
      description: String,
      address: String,
    },
    locations: [
      {
        type: { type: String, default: "Point", enum: ["Point"] },
        coordinates: [Number],
        description: String,
        address: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual Populate for Reviews
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

// Indexes for Performance
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// DOCUMENT MIDDLEWARE

// Generate slug before saving
tourSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

// Validate guides before saving
tourSchema.pre("save", async function (next) {
  if (!this.guides || this.guides.length === 0) return next();

  const validGuideIds = this.guides.filter(id =>
    mongoose.Types.ObjectId.isValid(id),
  );
  const guides = await User.find({ _id: { $in: validGuideIds } });

  if (guides.length !== validGuideIds.length) {
    const invalidIds = validGuideIds.filter(
      id => !guides.some(guide => guide._id.equals(id)),
    );
    throw new AppError(
      `Guide(s) with ID(s) ${invalidIds.join(", ")} do not exist.`,
      404,
    );
  }

  this.guides = guides.map(guide => guide._id);
  next();
});

// QUERY MIDDLEWARE

// Populate guides information
tourSchema.pre(/^find/, function (next) {
  this.populate({ path: "guides", select: "-__v -passwordChangedAt" });
  next();
});

// MODEL METHODS

// Calculate average ratings and quantity
tourSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    { $match: { _id: tourId } },
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "tour",
        as: "reviews",
      },
    },
    { $unwind: "$reviews" },
    {
      $group: {
        _id: "$_id",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$reviews.rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await this.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: null,
    });
  }
};

// Post-save hook to update ratings
tourSchema.post("save", function () {
  this.constructor.calcAverageRatings(this._id);
});

// EXPORT MODEL
const Tour = mongoose.model("Tour", tourSchema);
module.exports = Tour;
