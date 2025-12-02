const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const { uploadMultiple } = require("../../../middlewares/uploadMiddleware");

const {
  createReview,
  getStylistReviews,
  getReviewByBooking
} = require("../../../controllers/review.controller");

const router = express.Router();

router.post(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  uploadMultiple("review_image", 10),
  createReview
);

router.get(
  "/stylist/:stylist_id",
  authMiddleware(["customer", "merchant", "loctitian"]),
  getStylistReviews
);


router.get(
  "/booking/:booking_id",
  authMiddleware(["customer", "merchant", "loctitian"]),
  getReviewByBooking
);

module.exports = router;
