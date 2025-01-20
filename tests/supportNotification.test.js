// tests/supportNotification.test.js
const mongoose = require("mongoose");
const { expect } = require("chai");
const sinon = require("sinon");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../config.env") });

const Email = require("../utils/email");
const CriticalError = require("../models/criticalErrorModel");

describe("Support Notification System", () => {
  let emailStub;

  before(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        const DB = process.env.DATABASE.replace(
          "<PASSWORD>",
          process.env.DATABASE_PASSWORD,
        );
        await mongoose.connect(DB);
        console.log("Connected to database");
      }
    } catch (err) {
      console.error("Database connection error:", err);
    }
  });

  beforeEach(() => {
    emailStub = sinon.stub(Email.prototype, "send").resolves();
  });

  afterEach(async () => {
    emailStub.restore();
    await CriticalError.deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  it("should create a critical error and send notification", async () => {
    const criticalError = await CriticalError.create({
      bookingError: "Test booking error",
      refundError: "Test refund error",
      sessionId: "test_session_123",
      paymentIntentId: "pi_test_123",
      metadata: { test: "data" },
      timestamp: new Date(),
    });

    await criticalError.notifySupport();

    expect(emailStub.calledOnce).to.be.true;
    expect(criticalError.notifiedSupport).to.be.true;
    expect(criticalError.notificationAttempts).to.equal(1);
  });

  it("should retry failed notifications up to 3 times", async () => {
    const criticalError = await CriticalError.create({
      bookingError: "Test booking error",
      sessionId: "test_session_456",
      paymentIntentId: "pi_test_456",
    });

    emailStub.rejects(new Error("Email sending failed"));

    for (let i = 0; i < 4; i++) {
      await criticalError.notifySupport();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const updatedError = await CriticalError.findById(criticalError._id);
    expect(updatedError.notificationAttempts).to.equal(3);
    expect(updatedError.notifiedSupport).to.be.false;
  });
});
