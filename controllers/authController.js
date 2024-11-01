const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const crypto = require("crypto");
const Email = require("../utils/email");

// Function to sign the JWT token using the user ID
const signToken = id => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    throw new AppError("JWT secret or expiration time is not defined.", 500);
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function to create and send JWT token via cookie
const createSendToken = (user, statusCode, res, req) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

// User Signup Controller
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Generate confirmation token
  const confirmationToken = newUser.createEmailConfirmationToken();
  await newUser.save({ validateBeforeSave: false });

  const confirmationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/confirmEmail/${confirmationToken}`;
  await new Email(newUser, confirmationUrl).sendConfirmation();

  res.status(201).json({
    status: "success",
    message: "Account created! Please check your email to confirm.",
  });
});

// Confirm email using token
exports.confirmEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailConfirmationToken: hashedToken,
    emailConfirmed: false,
  });

  if (!user) {
    return next(new AppError("Invalid or expired token", 400));
  }

  user.emailConfirmed = true;
  user.emailConfirmationToken = undefined;
  await user.save({ validateBeforeSave: false });

  // Redirect to the confirmation success page
  res.status(200).redirect("/confirmSuccess");
});

// User Login Controller with 2FA
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.emailConfirmed) {
    return next(
      new AppError("Please confirm your email before logging in.", 401),
    );
  }

  // Generate and send 2FA code via email
  const twoFACode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  user.twoFACode = twoFACode;
  user.twoFACodeExpires = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
  await user.save({ validateBeforeSave: false });

  await new Email(user, undefined).sendTwoFACode(twoFACode);

  res.status(200).json({
    status: "success",
    message: "2FA code sent to your email!",
  });
});

// Verify 2FA code
exports.verify2FA = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email });

  if (!user || user.twoFACode !== code || Date.now() > user.twoFACodeExpires) {
    return next(new AppError("Invalid or expired 2FA code", 400));
  }

  // Clear 2FA code once validated
  user.twoFACode = undefined;
  user.twoFACodeExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Complete login
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Middleware to protect routes (only logged-in users can access)
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // Check if the Authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Extract the token
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    // Return error if no token is found
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    ); // Unauthorized
  }

  // Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401),
    );
  }

  // Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  // Grant access by attaching user info to the request object
  req.user = currentUser;
  next();
});

// Check if user is logged in for rendering pages (photo, username, etc). No errors, we just call next() if not logged in
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // If we reach this point, there is a logged in user
      res.locals.user = currentUser;

      if (req.originalUrl === "/login") {
        return res.redirect("/");
      }

      return next();
    }
    // If no cookie, just move to the next middleware
    next();
  } catch (err) {
    // Handle any errors (e.g., JWT verification failure)
    return next(); // Continue without throwing an error as this middleware is only checking for logged-in status
  }
};

// Middleware to restrict access to certain roles (e.g., admin)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role matches any of the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403), // Forbidden
      );
    }

    next(); // Continue to the next middleware or route handler
  };
};

// Forgot password functionality (generates a reset token and sends it via email)
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404)); // Not Found
  }

  // Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save the user with the reset token

  try {
    // Send reset token via email
    const resetURL = `${req.protocol}://${req.get(
      "host",
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    // Response indicating the token was sent
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    // Clear reset token and expiration if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500,
      ),
    ); // Internal Server Error
  }
});

// Reset password functionality (user provides new password via token)
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Hash the reset token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // Find user by reset token and check if token is still valid
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // Return error if token is invalid or expired
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400)); // Bad Request
  }

  // Set new password and clear reset token fields
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // Save the updated password

  // Log the user in after password reset
  createSendToken(user, 200, res);
});

// Update the user's password when logged in
exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get the currently logged-in user
  const user = await User.findById(req.user.id).select("+password");

  // Check if the current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Your current password is incorrect.", 401)); // Unauthorized
  }

  // Set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // Save the updated password

  // Log the user in after updating the password
  createSendToken(user, 200, res);
});
