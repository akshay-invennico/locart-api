const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");

const {
  createReview,
  getStylistReviews,
  getReviewByBooking
} = require("../../../controllers/review.controller");

const router = express.Router();

router.post(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  uploadSingle('review_image'),
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
