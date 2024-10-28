const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
// const Tour = require("../../models/tourModel");
const User = require("../../models/userModel");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log("DB Connection sucessful"));

// Read JSON file
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));

// Import data into DB
const importData = async () => {
  try {
    await User.create(users);
    console.log("Data successfuly loaded");
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// Delete all data from DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    console.log("All data deleted");
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
