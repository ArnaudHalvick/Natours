// Importing required modules and utilities
const User = require("./../models/userModel");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");

const multer = require("multer");
const sharp = require("sharp");

// Multer configuration to store uploaded files in memory and filter only images
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
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Middleware to upload and resize user photo
exports.uploadUserPhoto = upload.single("photo");
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// Helper function to filter allowed fields for update
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

// Route handlers for user management

// Get user by ID (admin only)
exports.getUser = factory.getOne(User);

// Create a new user (admin only)
exports.createUser = factory.createOne(User);

// Update user by ID (admin only)
exports.updateUser = (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new AppError("You cannot edit your own account.", 403));
  }
  factory.updateOne(User)(req, res, next);
};

// Delete user by ID (admin only)
exports.deleteUser = (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new AppError("You cannot delete your own account.", 403));
  }
  factory.deleteOne(User)(req, res, next);
};

// Set the current user's ID in request params for easier access
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user's details (authenticated users only)
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400,
      ),
    );
  }

  const filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

// Deactivate current user's account (authenticated users only)
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get all users with optional search and pagination
exports.getAllUsersRegex = catchAsync(async (req, res) => {
  const { search, role } = req.query;
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  if (role) pipeline.push({ $match: { role } });

  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
        ],
      },
    });
  }

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  });

  const [results] = await User.aggregate(pipeline);
  const { data = [], metadata = [] } = results;
  const total = metadata.length > 0 ? metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    status: "success",
    results: data.length,
    data: {
      data,
      pagination: { total, totalPages, currentPage: page, limit },
    },
  });
});
