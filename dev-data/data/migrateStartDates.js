// migrateStartDates.js

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const Tour = require("../../models/tourModel");

dotenv.config({ path: path.resolve(__dirname, "../../config.env") });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

const migrateStartDates = async () => {
  try {
    await mongoose.connect(DB);
    console.log("DB Connection successful");

    // Update all tours with an aggregation pipeline
    await Tour.updateMany(
      { "startDates.0": { $type: "date" } }, // Match tours with date-type startDates
      [
        {
          $set: {
            startDates: {
              $map: {
                input: "$startDates",
                as: "date",
                in: { date: "$$date", participants: 0 },
              },
            },
          },
        },
      ],
    );

    console.log("Migration completed successfully.");
    process.exit();
  } catch (err) {
    console.error("Error during migration:", err);
    process.exit(1);
  }
};

migrateStartDates();
