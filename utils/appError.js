// utils/appError.js
class AppError extends Error {
  constructor(message, statusCode, metadata = {}) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.metadata = metadata; // Add metadata for logging purposes

    Error.captureStackTrace(this, this.constructor);
  }
}

// Add specific booking error classes
class BookingError extends AppError {
  constructor(message, metadata = {}) {
    super(message, 400, metadata);
    this.name = "BookingError";
    this.requiresRefund = true; // Flag to indicate refund needed
  }
}

class CriticalBookingError extends AppError {
  constructor(message, metadata = {}) {
    super(message, 500, metadata);
    this.name = "CriticalBookingError";
    this.requiresRefund = true;
    this.requiresSupport = true; // Flag to indicate support team notification needed
  }
}

module.exports = AppError; // Default export
module.exports.BookingError = BookingError; // Named export
module.exports.CriticalBookingError = CriticalBookingError; // Named export
