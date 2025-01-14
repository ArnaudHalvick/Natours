// authController.js
const User = require("./../models/userModel");
const Email = require("../utils/email");

const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

// Constants
const MAX_2FA_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

// Helper Functions
const parseDuration = durString => {
  const unit = durString.slice(-1);
  const value = parseInt(durString.slice(0, -1), 10);
  const multipliers = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
};

const signToken = (id, options = {}) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    throw new AppError("JWT secret or expiration time is not defined.", 500);
  }
  return jwt.sign({ id, ...options }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

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

const createRefreshToken = user => {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  user.refreshToken = refreshToken;
  user.refreshTokenExpires = refreshTokenExpires;
  return refreshToken;
};

// Middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();
      if (currentUser.changedPasswordAfter(decoded.iat)) return next();
      res.locals.user = currentUser;
    }
  } catch (err) {
    return next();
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };

// Authentication Controllers

// Handle Stripe Redirect
exports.handleStripeRedirect = (req, res, next) => {
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

// Signup
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  const newUser = await User.create({ name, email, password, passwordConfirm });

  const confirmationToken = newUser.createEmailConfirmationToken();
  await newUser.save({ validateBeforeSave: false });

  const confirmationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/confirmEmail/${confirmationToken}`;
  await new Email(newUser, confirmationUrl).sendConfirmation();

  res.status(201).json({
    status: "success",
    message: "Account created! Please check your email to confirm.",
  });
});

// Confirm Email
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

  res.status(200).redirect("/confirmSuccess");
});

// Resend Confirmation Email
exports.resendConfirmation = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide your email address.", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("There is no user with that email.", 404));
  }

  if (user.emailConfirmed) {
    return next(new AppError("Email is already confirmed.", 400));
  }

  const confirmationToken = user.createEmailConfirmationToken();
  await user.save({ validateBeforeSave: false });

  const confirmationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/confirmEmail/${confirmationToken}`;
  await new Email(user, confirmationUrl).sendConfirmation();

  res.status(200).json({
    status: "success",
    message: "A new confirmation email has been sent to your inbox.",
  });
});

// Confirm email change
exports.verifyEmailChange = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    pendingEmailToken: hashedToken,
    pendingEmailTokenExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, change the email
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.email = user.pendingEmail;
  user.pendingEmail = undefined;
  user.pendingEmailToken = undefined;
  user.pendingEmailTokenExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // 3) Log the user in with new JWT
  createSendToken(user, 200, res, req);
});

// Login with 2FA
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.emailConfirmed) {
    return next(
      new AppError(
        "Your email is not confirmed. Please confirm your email or resend the verification email.",
        401,
      ),
    );
  }

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_2FA === "true"
  ) {
    return createSendToken(user, 200, res, req);
  }

  const deviceId = req.headers["user-agent"];
  const twoFAExpiry = parseDuration(process.env.TWO_FA_DEVICE_EXPIRES_IN);
  const expiryDate = new Date(Date.now() - twoFAExpiry);

  const verifiedDevice = user.twoFAVerifiedDevices?.find(
    d => d.deviceId === deviceId && new Date(d.lastVerified) > expiryDate,
  );

  if (verifiedDevice) {
    await user.save({ validateBeforeSave: false });
    return createSendToken(user, 200, res, req);
  }

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

// Verify 2FA
exports.verify2FA = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (!decoded.twoFAPending) {
    return next(new AppError("Invalid token for 2FA verification", 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!user.twoFACode || user.twoFACodeExpires < Date.now()) {
    return next(new AppError("2FA code has expired", 400));
  }

  if (user.twoFALockUntil && user.twoFALockUntil > Date.now()) {
    return next(
      new AppError("Account is temporarily locked. Try again later.", 429),
    );
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  const isCodeValid = crypto.timingSafeEqual(
    Buffer.from(hashedCode, "utf-8"),
    Buffer.from(user.twoFACode, "utf-8"),
  );

  if (!isCodeValid) {
    user.twoFAAttemptCount = (user.twoFAAttemptCount || 0) + 1;
    if (user.twoFAAttemptCount >= MAX_2FA_ATTEMPTS) {
      user.twoFALockUntil = Date.now() + LOCK_TIME;
    }
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Invalid credentials or 2FA code.", 400));
  }

  const deviceId = req.headers["user-agent"];
  user.twoFAVerifiedDevices = user.twoFAVerifiedDevices.filter(
    d => d.deviceId !== deviceId,
  );
  user.twoFAVerifiedDevices.push({ deviceId, lastVerified: new Date() });

  user.twoFAAttemptCount = 0;
  user.twoFACode = undefined;
  user.twoFACodeExpires = undefined;
  user.twoFALockUntil = undefined;
  user.lastTwoFAVerification = new Date();

  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res, req);
});

// Resend 2FA Code
exports.resendTwoFACode = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next(new AppError("Authorization token missing", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (!decoded.twoFAPending) {
    return next(new AppError("Invalid token for 2FA verification", 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const twoFACode = user.createTwoFACode();
  await user.save({ validateBeforeSave: false });

  await new Email(user).sendTwoFACode(twoFACode);

  res.status(200).json({
    status: "success",
    message: "A new 2FA code has been sent to your email.",
  });
});

// Logout
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

// Password Controllers

// Forgot Password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get("host")}/resetPassword/${resetToken}`;
  await new Email(user, resetURL).sendPasswordReset();

  res.status(200).json({
    status: "success",
    message: "Token sent to email!",
  });
});

// Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  const { password, passwordConfirm } = req.body;
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res, req);
});

// Update Password
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const { currentPassword, password, passwordConfirm } = req.body;
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Your current password is incorrect.", 401));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendToken(user, 200, res, req);
});

// Refresh Access Token
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

  const accessToken = signToken(user._id);
  const newRefreshToken = createRefreshToken(user);
  await user.save({ validateBeforeSave: false });

  res.cookie("jwt", accessToken, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax",
  });

  res.cookie("refreshToken", newRefreshToken, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax",
  });

  res.status(200).json({
    status: "success",
    accessToken,
  });
});
