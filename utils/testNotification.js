// utils/testNotification.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../config.env") });

const CriticalError = require("../models/criticalErrorModel");

const testNotification = async () => {
  try {
    const DB = process.env.DATABASE.replace(
      "<PASSWORD>",
      process.env.DATABASE_PASSWORD,
    );

    await mongoose.connect(DB);
    console.log("Connected to database");

    const criticalError = await CriticalError.create({
      bookingError: "Test Critical Error",
      refundError: "Test Refund Failed",
      sessionId: `test_session_${Date.now()}`,
      paymentIntentId: `pi_test_${Date.now()}`,
      metadata: {
        tourId: "test_tour_123",
        userEmail: "test@example.com",
        amount: 199.99,
        startDate: new Date().toISOString(),
      },
      timestamp: new Date(),
    });

    console.log("Created test critical error:", criticalError._id);

    await criticalError.notifySupport();
    console.log("Notification sent successfully");

    const updatedError = await CriticalError.findById(criticalError._id);
    console.log("Notification status:", {
      notified: updatedError.notifiedSupport,
      attempts: updatedError.notificationAttempts,
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

testNotification();
