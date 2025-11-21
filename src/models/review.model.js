const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
stylist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
rating: { type: Number, required: true, min: 1, max: 5 },
review_text: { type: String, default: '' },
likes: [{ type: String }],
images: [{ type: String }],
created_at: { type: Date, default: Date.now }
});


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;