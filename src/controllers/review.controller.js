const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const { uploadToS3 } = require('../services/awsS3');


const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stylist_id, rating, description, likes, booking_id } = req.body;

    if (!stylist_id || !rating || !booking_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (stylist_id, rating, booking_id)",
      });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.booking_status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can submit a review only after the service is completed",
      });
    }

    let imageUrl = null;
    if (req.file) {
      const uploaded = await uploadToS3(req.file, "reviews");
      imageUrl = uploaded.url;
    }

    const newReview = await Review.create({
      customer_id: userId,
      stylist_id,
      rating,
      review_text: description,
      likes: likes || [],
      booking_id,
      images: imageUrl ? [imageUrl] : [],
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: newReview,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const getStylistReviews = async (req, res) => {
  try {
    const { stylist_id } = req.params;
    const reviews = await Review.find({ stylist_id })
      .populate('customer_id', 'name profile_picture')
      .sort({ created_at: -1 });


    return res.status(200).json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


const getReviewByBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const review = await Review.findOne({ booking_id });
    return res.status(200).json({ success: true, review });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  createReview,
  getStylistReviews,
  getReviewByBooking
}