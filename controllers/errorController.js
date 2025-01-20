// controllers/errorController.js
const AppError = require("../utils/appError"); // Default import
const { BookingError, CriticalBookingError } = require("../utils/appError"); // Named imports
const FailedBooking = require("../models/failedBookingModel");
const CriticalError = require("../models/criticalErrorModel");

// Handle MongoDB CastError (invalid ObjectId)
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400); // Return AppError with 400 Bad Request status
};

// Handle MongoDB Duplicate Key Error (error code 11000)
const handleDuplicateFieldsDB = err => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: "${value}". Please use another value!`;
  return new AppError(message, 400);
};

// Handle Mongoose Validation Error
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle JWT invalid token errors
const handleJWTError = () =>
  new AppError("Your token is invalid. Please log in again.", 401);

// Handle JWT expired token errors
const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again.", 401);

// Send detailed error information in development mode
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(err.statusCode).render("error", {
      title: "Something went wrong",
      msg: err.message,
    });
  }
};

// Handler for booking errors
const handleBookingError = async (err, req) => {
  if (err instanceof BookingError) {
    try {
      await FailedBooking.create({
        error: err.message,
        sessionId: err.metadata.sessionId,
        paymentIntentId: err.metadata.paymentIntentId,
        metadata: err.metadata,
        tourId: err.metadata.tourId,
        userEmail: err.metadata.userEmail,
        amount: err.metadata.amount,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error("Error logging failed booking:", logError);
    }
  }

  if (err instanceof CriticalBookingError) {
    try {
      const criticalError = await CriticalError.create({
        bookingError: err.message,
        refundError: err.metadata.refundError,
        sessionId: err.metadata.sessionId,
        paymentIntentId: err.metadata.paymentIntentId,
        metadata: err.metadata,
        timestamp: new Date(),
        priority: "critical",
      });

      // Notify support team
      await criticalError.notifySupport();
    } catch (logError) {
      console.error("Error logging critical error:", logError);
    }
  }

  return err;
};

// Send limited error information in production mode
const sendErrorProduction = async (err, req, res) => {
  // Log booking errors first
  if (err instanceof BookingError || err instanceof CriticalBookingError) {
    err = await handleBookingError(err, req);
  }

  if (req.originalUrl.startsWith("/api")) {
    // API error response
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(err.requiresRefund && { requiresRefund: true }),
        ...(err.metadata?.refundId && { refundId: err.metadata.refundId }),
      });
    }

    // Log unexpected errors
    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }

  // Rendered website error
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }

  // Log unexpected errors
  console.error("ERROR 💥", err);
  res.status(500).render("error", {
    title: "Something went wrong!",
    msg: "Please try again later.",
  });
};

// Global error handling middleware
module.exports = async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.metadata = err.metadata;

    // Handle all error types
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (
      error.name === "BookingError" ||
      error.name === "CriticalBookingError"
    ) {
      error = await handleBookingError(error, req);
    }

    await sendErrorProduction(error, req, res);
  }
};
