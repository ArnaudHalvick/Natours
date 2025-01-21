// tourModel.js

const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require("./userModel");
const AppError = require("../utils/appError");

// Start Date Subschema
const startDateSchema = new mongoose.Schema({
  date: {
    type: Date, // Changed back to Date type to match MongoDB storage
    required: [true, "A tour must have a start date"],
    validate: {
      validator: function (value) {
        return value instanceof Date && !isNaN(value);
      },
      message: "Invalid date format",
    },
  },
  participants: {
    type: Number,
    default: 0,
    min: [0, "Participants cannot be negative"],
  },
});

// Helper method to compare dates accounting for timezone differences
startDateSchema.methods.isSameDay = function (otherDate) {
  const thisDate = new Date(this.date);
  const compareDate = new Date(otherDate);

  return (
    thisDate.getUTCFullYear() === compareDate.getUTCFullYear() &&
    thisDate.getUTCMonth() === compareDate.getUTCMonth() &&
    thisDate.getUTCDate() === compareDate.getUTCDate()
  );
};

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
    priceDiscount: Number,
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
    createdAt: {
      type: Date, // Changed to Date type
      default: Date.now,
    },
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

// Tour methods for date operations
tourSchema.methods.findAvailableDateSlot = function (requestedDate) {
  return this.startDates.find(
    startDate =>
      startDate.isSameDay(requestedDate) &&
      startDate.participants < this.maxGroupSize,
  );
};

// Middleware to validate and sort dates before saving
tourSchema.pre("save", function (next) {
  if (this.isModified("startDates")) {
    // Sort dates chronologically
    this.startDates.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check for duplicate dates
    const dateStrings = this.startDates.map(sd => sd.date);
    const uniqueDates = new Set(dateStrings);
    if (dateStrings.length !== uniqueDates.size) {
      return next(new AppError("Duplicate start dates are not allowed", 400));
    }
  }
  next();
});

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

// Populate guides information
tourSchema.pre(/^find/, function (next) {
  this.populate({ path: "guides", select: "-__v -passwordChangedAt" });
  next();
});

// Static method to validate date availability
tourSchema.statics.validateDateAvailability = async function (
  tourId,
  requestedDate,
  participants,
) {
  const tour = await this.findById(tourId);
  if (!tour) throw new AppError("Tour not found", 404);

  // Convert requestedDate to Date object if it's a string
  const requestDate = new Date(requestedDate);
  if (isNaN(requestDate.getTime())) {
    throw new AppError("Invalid date format", 400);
  }

  const dateSlot = tour.findAvailableDateSlot(requestDate);
  if (!dateSlot) {
    throw new AppError("Selected start date not available", 400);
  }

  const availableSpots = tour.maxGroupSize - dateSlot.participants;
  if (participants > availableSpots) {
    throw new AppError(`Only ${availableSpots} spots left for this date`, 400);
  }

  return dateSlot;
};

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

const Tour = mongoose.model("Tour", tourSchema);
module.exports = Tour;
