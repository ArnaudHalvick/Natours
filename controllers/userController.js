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

// Multer configuration to use memory storage, apply the filter, and limit file size to 5MB
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware to handle single file upload for the 'photo' field
exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next(); // If no file is uploaded, move to the next middleware

  // Resize and format the image using sharp
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; // Rename the file with user ID and current timestamp

  await sharp(req.file.buffer) // Use sharp to process the image
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // Save the file

  next();
});

// Helper function to filter out unwanted fields that shouldn't be updated
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// Get all users (admin only) with filtering, sorting, pagination, and field limiting
exports.getAllUsers = factory.getAll(User);

// Get user by ID (admin only)
exports.getUser = factory.getOne(User);

// Create new user (admin only)
exports.createUser = factory.createOne(User);

// Update user by ID (admin only)
// This method prevents admins from editing their own accounts
exports.updateUser = (req, res, next) => {
  const userIdToUpdate = req.params.id;
  const currentUserId = req.user.id; // Assuming req.user is set by auth middleware

  // Prevent admin from updating their own account
  if (userIdToUpdate === currentUserId) {
    return next(new AppError("You cannot edit your own account.", 403));
  }

  // Proceed with update using factory method
  factory.updateOne(User)(req, res, next);
};

// Delete user by ID (admin only)
// This method prevents admins from deleting their own accounts
exports.deleteUser = (req, res, next) => {
  const userIdToDelete = req.params.id;
  const currentUserId = req.user.id; // Assuming req.user is set by auth middleware

  // Prevent admin from deleting their own account
  if (userIdToDelete === currentUserId) {
    return next(new AppError("You cannot delete your own account.", 403));
  }

  // Proceed with deletion using factory method
  factory.deleteOne(User)(req, res, next);
};

// Set the user's ID from req.user to req.params.id
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user's information (authenticated user)
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400,
      ),
    );
  }

  // 2) Filter out unwanted fields that are not allowed to be updated (like 'role')
  let filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // 4) Send the updated user data in response
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Deactivate current user (authenticated user)
exports.deleteMe = catchAsync(async (req, res, next) => {
  // 1) Find the user by ID and update their "active" status to false
  await User.findByIdAndUpdate(req.user.id, { active: false });

  // 2) Send response indicating the user has been deactivated
  res.status(204).json({
    status: "success",
    data: null,
  });
});
