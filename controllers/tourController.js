const Tour = require("./../models/tourModel");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");

// Use memory storage to store the file in memory as a buffer
const multerStorage = multer.memoryStorage();

// Filter to check if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true); // Accept the file if it's an image
  } else {
    cb(new AppError("Not an image! Please upload images only.", 400), false); // Reject the file if it's not an image
  }
};

// Multer configuration to use memory storage, apply the filter, and limit file size to 20MB
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Middleware to handle file uploads for tour images (imageCover and images)
exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

// Middleware to resize the images and save them
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // Check if there are image files before processing
  if (req.files && req.files.imageCover) {
    // 1) Process cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`; // Define the filename for the cover image
    await sharp(req.files.imageCover[0].buffer) // Process the cover image
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`); // Save the processed image
  }

  // Check if there are additional images before processing
  if (req.files && req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`; // Define the filename for each image
        await sharp(file.buffer) // Process each image
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${filename}`); // Save the processed image

        req.body.images.push(filename); // Add the filename to the body for saving in the database
      }),
    );
  }

  // If no images were uploaded, simply proceed to the next middleware
  next();
});

// Middleware to pre-set query parameters for fetching top 5 cheapest tours
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5"; // Limit results to 5 tours
  req.query.sort = "-ratingsAverage,price"; // Sort by rating (descending) and price (ascending)
  req.query.fields = "name,price,ratingsAverage,summary,difficulty"; // Select only these fields
  next();
};

// Get all tours with filtering, sorting, pagination, and field limiting
exports.getAllTours = factory.getAll(Tour);

// Get a tour by its ID
exports.getTourById = factory.getOne(Tour, "reviews");

// Update a tour by its ID
exports.updateTour = factory.updateOne(Tour);

// Create a new tour
exports.createNewTour = factory.createOne(Tour);

// Delete a tour by its ID
exports.deleteTour = factory.deleteOne(Tour);

// Update tour guides (add/remove) by tour ID
// Update tour guides (add/remove) by tour ID
exports.updateTourGuides = catchAsync(async (req, res, next) => {
  const { guidesToRemove, guidesToAdd } = req.body;

  // Find the tour by ID
  const tour = await Tour.findById(req.params.id);

  // If tour not found, return a 404 error
  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  // Remove specified guides, or clear all if 'all' string is provided
  if (guidesToRemove && guidesToRemove[0].toLowerCase() === "all") {
    tour.guides = []; // Clear all guides if 'all' string is passed (case insensitive)
  } else if (guidesToRemove && guidesToRemove.length > 0) {
    // Remove only specified guides by comparing ObjectIds directly
    tour.guides = tour.guides.filter(
      guideId => !guidesToRemove.some(removeId => guideId.equals(removeId)),
    );
  }

  // Add new guides if provided
  if (guidesToAdd && guidesToAdd.length > 0) {
    const validGuides = await Promise.all(
      guidesToAdd.map(async id => {
        const guide = await User.findById(id); // Validate guide existence
        if (!guide) {
          throw new AppError(`Guide with ID ${id} does not exist.`, 404);
        }
        return guide._id; // Return valid guide ID
      }),
    );

    // Add only non-duplicate guides to the tour
    tour.guides.push(
      ...validGuides.filter(
        guideId => !tour.guides.some(existingId => existingId.equals(guideId)),
      ),
    );
  }

  // Save the updated tour with the new guides
  await tour.save();

  // Send success response with the updated tour
  res.status(200).json({
    status: "success",
    data: { tour }, // Updated tour with new/removed guides
  });
});

// Get aggregated statistics for tours (e.g., average price, rating, etc.)
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4 } }, // Filter for tours with high ratings
    },
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
    {
      $sort: { numTours: 1 }, // Sort by number of tours
    },
  ]);

  // Send success response with tour stats
  res.status(200).json({
    status: "success",
    data: { stats }, // Aggregated statistics
  });
});

// Get the busiest month for tours in a given year
exports.getBusiestMonth = catchAsync(async (req, res, next) => {
  const year = req.query.year ? +req.query.year : new Date().getFullYear(); // Use provided year or current year

  const busiestMonth = await Tour.aggregate([
    {
      $unwind: "$startDates", // Decompose array of startDates into individual documents
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), // Match start dates within the given year
          $lt: new Date(`${year + 1}-01-01`), // Exclude next year's dates
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" }, // Group by month
        numTours: { $sum: 1 }, // Count number of tours per month
      },
    },
    {
      $sort: { numTours: -1 }, // Sort by the number of tours in descending order
    },
    {
      $limit: 1, // Limit to the busiest month
    },
    {
      $addFields: {
        monthName: {
          $arrayElemAt: [
            [
              "",
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ],
            "$_id",
          ],
        },
      },
    },
  ]);

  // Send success response with the busiest month
  res.status(200).json({
    status: "success",
    data: { busiestMonth }, // Busiest month data
  });
});

exports.getTourWithin = catchAsync(async (req, res, next) => {
  // Destructure parameters from request
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  // Check if latitude and longitude are provided
  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );
  }

  // Convert distance to radians based on the unit (miles or kilometers)
  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  // Find tours within the specified radius using $geoWithin and $centerSphere
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius], // [longitude, latitude] and radius in radians
      },
    },
  });

  // Respond with the results
  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  // Check if latitude and longitude are provided
  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng.",
        400,
      ),
    );
  }

  // Convert distance to kilometers (meters) or miles
  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  // Use the $geoNear stage as the first stage in the aggregation pipeline
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)], // [longitude, latitude]
        },
        distanceField: "distance", // The field where MongoDB will store calculated distances
        distanceMultiplier: multiplier, // Convert distance from meters to miles or kilometers
      },
    },
    {
      $project: {
        distance: { $round: "$distance" }, // Round the distance to the nearest integer
        name: 1, // Include the name of the tour
      },
    },
  ]);

  // Respond with the calculated distances
  res.status(200).json({
    status: "success",
    data: {
      distances,
      unit,
    },
  });
});
