const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create upload middleware with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit
    files: 50, // Maximum 50 files
  },
});

// Middleware for single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware for multiple files upload
const uploadMultiple = (fieldName, maxCount = 50) =>
  upload.array(fieldName, maxCount);

// Middleware for multiple fields
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
};
