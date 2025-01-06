// authController.js
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("../utils/email");

const MAX_2FA_ATTEMPTS = 5; // Maximum 2FA attempts allowed
const LOCK_TIME = 15 * 60 * 1000; // Lock account for 15 minutes after max attempts

// Helper function to parse duration string (e.g., "90d" -> milliseconds)
const parseDuration = durString => {
  const unit = durString.slice(-1);
  const value = parseInt(durString.slice(0, -1));
  const multipliers = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
};

// Function to sign the JWT token using the user ID
const signToken = (id, options = {}) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    throw new AppError("JWT secret or expiration time is not defined.", 500);
  }
  return jwt.sign({ id, ...options }, process.env.JWT_SECRET, {
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
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax",
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

exports.handleStripeRedirect = (req, res, next) => {
  // Check if this is a redirect from Stripe
  if (req.query.alert === "booking" && req.query.jwt) {
    res.cookie("jwt", req.query.jwt, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });
  }
  next();
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

  const confirmationUrl = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/users/confirmEmail/${confirmationToken}`;
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

exports.resendConfirmation = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide your email address.", 400));
  }

  // 1) Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("There is no user with that email.", 404));
  }

  // 2) Check if already confirmed
  if (user.emailConfirmed) {
    return next(new AppError("Email is already confirmed.", 400));
  }

  // 3) Create new confirmation token
  const confirmationToken = user.createEmailConfirmationToken();
  await user.save({ validateBeforeSave: false });

  // 4) Send the email
  const confirmationUrl = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/users/confirmEmail/${confirmationToken}`;
  await new Email(user, confirmationUrl).sendConfirmation();

  res.status(200).json({
    status: "success",
    message: "A new confirmation email has been sent to your inbox.",
  });
});

// Login Controller with 2FA
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  // 2. Find user by email; select +password because it's excluded by default
  const user = await User.findOne({ email }).select("+password");

  // 3. If no user is found, return a generic credential error
  if (!user) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 4. Check if the user has confirmed their email
  if (!user.emailConfirmed) {
    // We can include some custom error message or data to prompt a resend
    return next(
      new AppError(
        "Your email is not confirmed. Please confirm your email or resend the verification email.",
        401,
      ),
    );
  }

  // 5. Check if the password is correct
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 6. Continue with 2FA logic or createSendToken, etc.
  // Skip 2FA in development mode
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_2FA === "true"
  ) {
    return createSendToken(user, 200, res, req);
  }

  // Check if 2FA is needed
  const deviceId = req.headers["user-agent"];
  const twoFAExpiry = parseDuration(process.env.TWO_FA_DEVICE_EXPIRES_IN);
  const expiryDate = new Date(Date.now() - twoFAExpiry);

  const verifiedDevice = user.twoFAVerifiedDevices?.find(
    d => d.deviceId === deviceId && new Date(d.lastVerified) > expiryDate,
  );

  if (verifiedDevice) {
    // Skip 2FA, create tokens and login
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res, req);
    return;
  }

  // Regular 2FA flow for production or when not skipped in development
  if (user.twoFALockUntil && user.twoFALockUntil > Date.now()) {
    return next(
      new AppError("Account is temporarily locked. Try again later.", 429),
    );
  }

  const twoFACode = user.createTwoFACode();
  await user.save({ validateBeforeSave: false });

  await new Email(user).sendTwoFACode(twoFACode);

  const tempToken = jwt.sign(
    { id: user._id, twoFAPending: true },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.status(200).json({
    status: "success",
    message: "2FA code sent to your email!",
    tempToken,
  });
});

// Verify 2FA code
exports.verify2FA = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  // Verify the temporary token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (!decoded.twoFAPending) {
    return next(new AppError("Invalid token for 2FA verification", 401));
  }

  // Find the user by ID
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Check if the 2FA code has expired
  if (!user.twoFACode || user.twoFACodeExpires < Date.now()) {
    return next(new AppError("2FA code has expired", 400));
  }

  // Check if account is locked
  if (user.twoFALockUntil && user.twoFALockUntil > Date.now()) {
    return next(
      new AppError("Account is temporarily locked. Try again later.", 429),
    );
  }

  // Hash the code provided by the user
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  // Use constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(hashedCode, "utf-8");
  const storedCodeBuffer = Buffer.from(user.twoFACode, "utf-8");

  let isCodeValid = false;
  try {
    isCodeValid =
      codeBuffer.length === storedCodeBuffer.length &&
      crypto.timingSafeEqual(codeBuffer, storedCodeBuffer);
  } catch (error) {
    isCodeValid = false;
  }

  if (!isCodeValid) {
    user.twoFAAttemptCount = (user.twoFAAttemptCount || 0) + 1;

    // Lock account if max attempts reached
    if (user.twoFAAttemptCount >= MAX_2FA_ATTEMPTS) {
      user.twoFALockUntil = Date.now() + LOCK_TIME; // Lock for 15 minutes
    }

    await user.save({ validateBeforeSave: false });
    return next(new AppError("Invalid credentials or 2FA code.", 400));
  }

  // Add device to verified devices
  const deviceId = req.headers["user-agent"];

  // Remove any existing entries for this device
  user.twoFAVerifiedDevices = user.twoFAVerifiedDevices.filter(
    d => d.deviceId !== deviceId,
  );

  // Add new device verification
  user.twoFAVerifiedDevices.push({
    deviceId,
    lastVerified: new Date(),
  });

  // Reset 2FA status
  user.twoFAAttemptCount = 0;
  user.twoFACode = undefined;
  user.twoFACodeExpires = undefined;
  user.twoFALockUntil = undefined;
  user.lastTwoFAVerification = new Date();

  await user.save({ validateBeforeSave: false });

  // Issue final JWT token and refresh token
  createSendToken(user, 200, res, req);
});

// Resend 2FA code
exports.resendTwoFACode = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  // Verify the temporary token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (!decoded.twoFAPending) {
    return next(new AppError("Invalid token for 2FA verification", 401));
  }

  // Find the user
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Generate and hash a new 2FA code
  const twoFACode = user.createTwoFACode();
  await user.save({ validateBeforeSave: false });

  // Send the new 2FA code via email
  await new Email(user).sendTwoFACode(twoFACode);

  res.status(200).json({
    status: "success",
    message: "A new 2FA code has been sent to your email.",
  });
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Middleware to protect routes (only logged-in users can access)
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  // 4. Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  // 5. Grant access to protected route
  req.user = currentUser; // Attach user to request
  res.locals.user = currentUser; // Make user available in templates
  next();
});

// Check if user is logged in for rendering pages
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      // If user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) return next();

      // If all checks pass, user is logged in
      res.locals.user = currentUser;
    }
  } catch (err) {
    // If there's an invalid token, do nothing; proceed as if not logged in
    return next();
  }

  next();
};

// Middleware to restrict access to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role matches any of the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      ); // Forbidden
    }

    next(); // Continue to the next middleware or route handler
  };
};

// Forgot password functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404)); // Not Found
  }

  // Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save the user with the reset token

  // Send reset token via email
  const resetURL = `${req.protocol}://${req.get(
    "host",
  )}/resetPassword/${resetToken}`;

  await new Email(user, resetURL).sendPasswordReset();

  // Response indicating the token was sent
  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

// Reset password functionality
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
  createSendToken(user, 200, res, req);
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
  createSendToken(user, 200, res, req);
});

const createRefreshToken = user => {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  user.refreshToken = refreshToken;
  user.refreshTokenExpires = refreshTokenExpires;
  return refreshToken;
};

exports.refreshAccessToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new AppError("No refresh token provided", 401));
  }

  const user = await User.findOne({
    refreshToken,
    refreshTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid or expired refresh token", 401));
  }

  // Create new access token
  const accessToken = signToken(user._id);

  // Create new refresh token
  const newRefreshToken = createRefreshToken(user);
  await user.save({ validateBeforeSave: false });

  // Set cookies
  res.cookie("jwt", accessToken, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  res.cookie("refreshToken", newRefreshToken, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  res.status(200).json({
    status: "success",
    accessToken,
  });
});
