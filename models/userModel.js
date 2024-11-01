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
        return /^[a-zA-Z\s]+$/.test(val); // Regular expression to allow only letters and spaces
      },
      message: "Name must contain only letters and spaces", // Custom error message for invalid names
    },
  },
  email: {
    type: String,
    required: [true, "A user must have an email"], // Email is required
    unique: true, // Ensure email is unique
    lowercase: true, // Convert email to lowercase
    validate: [validator.isEmail, "Please provide a valid email"], // Validate the email format
  },
  emailConfirmed: {
    type: Boolean,
    default: false,
  },
  emailConfirmationToken: String,
  photo: {
    type: String,
    default: "default.jpg", // Set a default photo for the user
  },
  twoFACode: String,
  twoFACodeExpires: Date,
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "A user must have a password"], // Password is required
    minlength: 8, // Password must be at least 8 characters
    select: false, // Prevent the password from being returned in queries
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
  active: {
    type: Boolean,
    default: true, // Users are active by default
    select: false, // We don't want to return this field in queries
  },
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

userSchema.pre(/^find/, function (next) {
  // `this` points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Mongoose pre-save middleware to hash the password before saving
userSchema.pre("save", async function (next) {
  // Only run this function if the password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with a cost of 12 (12 rounds of hashing)
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field, we don't need to store it in the database
  this.passwordConfirm = undefined;
  next();
});

// Mongoose pre-save middleware to hash the password before saving
userSchema.pre("save", async function (next) {
  // Only run this function if the password was actually modified
  if (!this.isModified("password") || this.isNew) return next();

  // Set passwordChangedAt to the current timestamp (before saving)
  this.passwordChangedAt = Date.now() - 1000; // Subtracting 1 second ensures the token is created after password change

  next();
});

// Instance method to check if the entered password matches the hashed password in the database
userSchema.methods.correctPassword = async function (
  candidatePassword, // Password entered by the user during login
  userPassword, // Hashed password stored in the database
) {
  // Compare the entered password with the hashed password
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if the user changed their password after the JWT token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // Convert the passwordChangedAt timestamp to seconds (JWT timestamp is in seconds)
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    // Return true if the password was changed after the token was issued
    return JWTTimestamp < changedTimestamp;
  }

  // Return false if the password has not been changed after the token was issued
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token and store it in the database
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiration time for the token (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
