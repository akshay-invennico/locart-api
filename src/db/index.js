// src/db.js
const mongoose = require("mongoose");
const { mongoUri } = require("../config");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error("❌ MongoDB connection error", err);
    process.exit(1);
  }
};

module.exports = connectDB;
