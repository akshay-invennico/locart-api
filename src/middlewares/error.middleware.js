const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error("❌ Error caught by middleware", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle common error types
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError" || err.isJoi) {
    message = "Validation failed";
  }

  if (err.name === "CastError") {
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code && err.code === 11000) {
    message = "Duplicate key error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
