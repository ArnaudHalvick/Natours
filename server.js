const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from config.env
dotenv.config({ path: "./config.env" });

const app = require("./app");

// 1. Handle uncaught exceptions
process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);

  process.exit(1); // Exit immediately since uncaught exceptions are fatal
});

// Replace <PASSWORD> in the DATABASE URL with the actual password from the environment variable
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

// 2. Connect to MongoDB
mongoose.connect(DB).then(() => {
  console.log("DB Connection successful");
});

// 3. Start the server
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

if (process.env.NODE_ENV === "development") console.log("Dev mode");
if (process.env.NODE_ENV === "production") console.log("Production mode");

// 4. Handle server-level errors
server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Please free the port or use a different one.`,
    );
    process.exit(1); // Exit the process to allow a restart with a different port
  }

  if (err.code === "ECONNRESET") {
    console.warn(
      "Connection was reset by the client. This is usually not fatal.",
    );
    // No need to exit or restart the process, just log the warning
  }

  if (err.code === "EACCES") {
    console.error(
      `Permission denied. You need elevated privileges to bind to this port: ${port}`,
    );
    process.exit(1); // Exit, as the server cannot run without access to the port
  }

  // Add more error handling cases as necessary
  console.error("Server error:", err);
  process.exit(1); // Exit for unknown fatal server errors
});

// 5. Handle unhandled promise rejections (e.g., MongoDB connection failures)
process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);

  // Gracefully shut down the server before exiting
  server.close(() => {
    process.exit(1); // Exit the process after handling the rejection
  });
});

// 6. Handle uncaught exceptions after the server starts
process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);

  // Gracefully shut down the server before exiting
  server.close(() => {
    process.exit(1); // Exit after the error
  });
});
