const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Review = require("../../models/reviewModel"); // Import the Review model

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log("DB Connection successful"));

// Read JSON file for reviews
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8"),
);

// Import review data into the database
const importData = async () => {
  try {
    await Review.create(reviews); // Import reviews
    console.log("Reviews successfully loaded");
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

// Delete all review data from the database
const deleteData = async () => {
  try {
    await Review.deleteMany(); // Delete all reviews
    console.log("All reviews deleted");
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

// Handle different command-line arguments
if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
} else {
  console.log(
    "Invalid command! Use --import to import reviews or --delete to delete reviews.",
  );
  process.exit();
}
