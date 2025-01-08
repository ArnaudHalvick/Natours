// Importing required modules and utilities
const Tour = require("./../models/tourModel");
const User = require("./../models/userModel");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");

const multer = require("multer");
const sharp = require("sharp");

// Multer configuration: storing files in memory and filtering images only
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload images only.", 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // Limit file size to 20MB
});

// Middleware to handle file uploads for tour images
exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

// Middleware to resize uploaded images
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (req.files && req.files.imageCover) {
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`);
  }

  if (req.files && req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${filename}`);
        req.body.images.push(filename);
      }),
    );
  }
  next();
});

// Get all tours with advanced filtering, sorting, and pagination
exports.getAllTours = factory.getAll(Tour);

// Get a specific tour by ID (populating reviews)
exports.getTourById = factory.getOne(Tour, "reviews");

// Create a new tour
exports.createNewTour = factory.createOne(Tour);

// Update an existing tour by ID
exports.updateTour = factory.updateOne(Tour);

// Delete a tour by ID
exports.deleteTour = factory.deleteOne(Tour);

// Update tour guides (add/remove guides by ID)
exports.updateTourGuides = catchAsync(async (req, res, next) => {
  const { guidesToRemove, guidesToAdd } = req.body;
  const tour = await Tour.findById(req.params.id);

  if (!tour) return next(new AppError("Tour not found", 404));

  if (guidesToRemove && guidesToRemove[0].toLowerCase() === "all") {
    tour.guides = [];
  } else if (guidesToRemove && guidesToRemove.length > 0) {
    tour.guides = tour.guides.filter(
      guideId => !guidesToRemove.some(removeId => guideId.equals(removeId)),
    );
  }

  if (guidesToAdd && guidesToAdd.length > 0) {
    const validGuides = await Promise.all(
      guidesToAdd.map(async id => {
        const guide = await User.findById(id);
        if (!guide)
          throw new AppError(`Guide with ID ${id} does not exist.`, 404);
        return guide._id;
      }),
    );

    tour.guides.push(
      ...validGuides.filter(
        guideId => !tour.guides.some(existingId => existingId.equals(guideId)),
      ),
    );
  }

  await tour.save();

  res.status(200).json({
    status: "success",
    data: { tour },
  });
});

// Get aggregated statistics for tours
exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4 } } },
    {
      $group: {
        _id: "$difficulty",
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $addFields: {
        roundedAvgRating: { $round: ["$avgRating", 2] },
        roundedAvgPrice: { $round: ["$avgPrice"] },
      },
    },
    { $sort: { numTours: 1 } },
  ]);

  res.status(200).json({
    status: "success",
    data: { stats },
  });
});

// Get tours within a specified distance from a point
exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: { tours },
  });
});

// Get distances from a point to all tours
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: { $round: "$distance" },
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: { distances, unit },
  });
});
