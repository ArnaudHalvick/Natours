// userModel.js
const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Create the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A user must have a name"], // Name is required
    trim: true, // Trim whitespace from the name
    validate: {
      validator: function (val) {
        return /^[a-zA-Z\s]+$/.test(val); // Allow only letters and spaces
      },
      message: "Name must contain only letters and spaces", // Custom error message
    },
  },
  email: {
    type: String,
    required: [true, "A user must have an email"], // Email is required
    unique: true, // Ensure email is unique
    lowercase: true, // Convert email to lowercase
    validate: [validator.isEmail, "Please provide a valid email"], // Validate email format
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
  },
  emailConfirmationToken: String,
  photo: {
    type: String,
    default: "default.jpg", // Default photo for the user
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "A user must have a password"], // Password is required
    minlength: 8, // Minimum length of 8 characters
    select: false, // Exclude from query results by default
  },
  passwordConfirm: {
    type: String,
    required: [
      function () {
        return this.isNew || this.isModified("password");
      },
      "Please confirm your password",
    ],
    validate: {
      validator: function (el) {
        return el === this.password; // Ensure passwordConfirm matches password
      },
      message: "Passwords do not match",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFACode: String,
  twoFACodeExpires: Date,
  twoFAAttemptCount: {
    type: Number,
    default: 0,
  },
  twoFALockUntil: Date,
  active: {
    type: Boolean,
    default: true, // Users are active by default
  },
  refreshToken: String,
  refreshTokenExpires: Date,
  lastTwoFAVerification: Date,
  twoFAVerifiedDevices: [
    {
      deviceId: String,
      lastVerified: Date,
    },
  ],
});

// Generate email confirmation token
userSchema.methods.createEmailConfirmationToken = function () {
  const confirmationToken = crypto.randomBytes(32).toString("hex");
  this.emailConfirmationToken = crypto
    .createHash("sha256")
    .update(confirmationToken)
    .digest("hex");
  return confirmationToken;
};

// Generate and hash 2FA code
userSchema.methods.createTwoFACode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
  this.twoFACode = crypto.createHash("sha256").update(code).digest("hex"); // Hash the code
  this.twoFACodeExpires = Date.now() + 15 * 60 * 1000; // Expires in 15 minutes
  return code; // Return plaintext code for sending via email
};

// Pre-save middleware to hash passwords
userSchema.pre("save", async function (next) {
  // Only run if password was modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Remove passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt property if password was changed
userSchema.pre("save", function (next) {
  // Only run if password was modified and not on new documents
  if (!this.isModified("password") || this.isNew) return next();

  // Set passwordChangedAt to current time minus 1 second
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // Compare entered password with hashed password
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after the token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // Convert to seconds
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    // Return true if password was changed after token issuance
    return JWTTimestamp < changedTimestamp;
  }

  // False means password was not changed
  return false;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and set it on the user schema
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration time (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken; // Return plaintext token
};

const User = mongoose.model("User", userSchema);

module.exports = User;
