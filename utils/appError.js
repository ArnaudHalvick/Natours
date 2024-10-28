class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent constructor (Error) and pass the message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; // 4xx are client errors, 5xx are server errors
    this.isOperational = true; // Marking this error as an operational error

    Error.captureStackTrace(this, this.constructor); // Captures the stack trace and excludes the constructor
  }
}

module.exports = AppError;
