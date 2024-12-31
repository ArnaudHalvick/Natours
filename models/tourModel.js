const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require("./userModel");
const AppError = require("../utils/appError");

const startDateSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, "A tour must have a start date"],
  },
  participants: {
    type: Number,
    default: 0,
  },
});

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
      max: [5, "Rating must at most 5.0"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
      min: [0, "Ratings quantity must be 0 or more"],
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
      min: [0, "Price must be above 0"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below the regular price",
      },
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
    images: {
      type: [String],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [startDateSchema],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      description: String,
      address: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        description: String,
        address: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual populate for reviews
tourSchema.virtual("reviews", {
  ref: "Review", // The model to use
  foreignField: "tour", // The field in the Review model that references the tour
  localField: "_id", // The field in the Tour model to match the foreignField in the Review model
});

// Add indexes for query performance
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// DOCUMENT MIDDLEWARE: Runs before saving a new document
tourSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

// Async validation for guides
tourSchema.pre("save", async function (next) {
  try {
    // Filter out any undefined or invalid guide IDs
    const validGuideIds = this.guides.filter(id => id);

    // Perform the lookup for valid guide IDs only
    const guides = await Promise.all(
      validGuideIds.map(async id => {
        const guide = await User.findById(id);
        if (!guide) {
          throw new AppError(`Guide with ID ${id} does not exist.`, 404);
        }
        return guide;
      }),
    );

    // Assign the valid guides back to the document
    this.guides = guides;
    next();
  } catch (err) {
    next(err);
  }
});

// // First middleware to exclude secret tours
// tourSchema.pre(/^find/, function (next) {
//   this.find({ secretTour: { $ne: true } });
//   this.start = Date.now();
//   next();
// });

// // Second middleware for guides population (only if guides needs to be populated)
// tourSchema.pre(/^find/, function (next) {
//   if (this._mongooseOptions.populate && this._mongooseOptions.populate.guides) {
//     this.populate({
//       path: "guides",
//       select: "-__v",
//     });
//   }
//   next();
// });

// AGGREGATION MIDDLEWARE: Exclude secret tours in aggregation
tourSchema.pre("aggregate", function (next) {
  // Check if the first stage is $geoNear
  if (this.pipeline().length > 0 && this.pipeline()[0].$geoNear) {
    // If $geoNear is the first stage, insert $match after $geoNear
    this.pipeline().splice(1, 0, { $match: { secretTour: { $ne: true } } });
  } else {
    // Otherwise, add $match as the first stage
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }
  next();
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
