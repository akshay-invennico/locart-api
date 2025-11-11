require("dotenv").config();

module.exports = {
  port: process.env.PORT || 6000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI_DEV,
};
