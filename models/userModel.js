// userModel.js

const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A user must have a name"],
      trim: true,
      validate: {
        validator: function (val) {
          return /^[a-zA-Z\s]+$/.test(val);
        },
        message: "Name must contain only letters and spaces",
      },
    },
    email: {
      type: String,
      required: [true, "A user must have an email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    emailConfirmed: {
      type: Boolean,
      default: false,
    },
    emailConfirmationToken: String,
    photo: {
      type: String,
      default: "default.jpg",
    },
    role: {
      type: String,
      enum: ["user", "guide", "lead-guide", "admin"],
      default: "user",
    },
    password: {
      type: String,
      required: [true, "A user must have a password"],
      minlength: 8,
      select: false,
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
          return el === this.password;
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
      default: true,
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
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Middlewares

// Hash password and handle passwordChangedAt
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;

    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
  }
  next();
});

// Methods

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
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.twoFACode = crypto.createHash("sha256").update(code).digest("hex");
  this.twoFACodeExpires = Date.now() + 15 * 60 * 1000;
  return code;
};

// Check if password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Model
const User = mongoose.model("User", userSchema);

module.exports = User;
