const AppError = require("../utils/appError");

// Handle MongoDB CastError (invalid ObjectId)
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`; // Custom error message for invalid ObjectId
  return new AppError(message, 400); // Return AppError with a 400 (Bad Request) status
};

// Handle MongoDB Duplicate Key Error (error code 11000)
const handleDuplicateFieldsDB = err => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field]; // Extract the duplicate field value
  const message = `Duplicate field value: "${value}". Please use another value!`;
  return new AppError(message, 400); // Return AppError with a 400 (Bad Request) status
};

// Handle Mongoose Validation Error
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message); // Extract validation messages
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400); // Return AppError with a 400 (Bad Request) status
};

// Handle JWT invalid token errors
const handleJWTError = () =>
  new AppError("Your token is invalid. Please log in again.", 401);

// Handle JWT expired token errors
const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again.", 401);

// Send detailed error information in development mode
const sendErrorDev = (err, req, res) => {
  // API errors
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // Rendered website errors
    res.status(err.statusCode).render("error", {
      title: "Something went wrong",
      msg: err.message,
    });
  }
};

// Send limited error information in production mode
const sendErrorProduction = (err, req, res) => {
  const renderError = (statusCode, title, message) => {
    res.status(statusCode).render("error", {
      title,
      msg: message,
    });
  };

  // API errors
  if (req.originalUrl.startsWith("/api")) {
    const message =
      err.statusCode === 404
        ? "The requested resource could not be found."
        : "Please try again later.";

    res.status(err.statusCode).json({
      status: err.status,
      message: err.isOperational ? err.message : message,
    });
  } else {
    // Rendered website errors
    const message = err.isOperational ? err.message : "Please try again later.";

    renderError(err.statusCode || 500, "Something went wrong", message);

    if (!err.isOperational) {
      console.error(`ERROR 💥`, err); // Log programming or unknown errors
    }
  }
};

// Global error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific errors
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    // Send the appropriate error response
    sendErrorProduction(error, req, res);
  }
};
