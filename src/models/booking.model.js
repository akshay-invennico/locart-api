const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stylist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stylist",
      required: true,
    },
    saloon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
    },
    grand_total: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    total_discount: { type: Number, default: 0 },
    total_taxes: { type: Number, default: 0 },

    total_duration: { type: Number, required: true }, // in minutes
    stylist_duration: { type: Number, required: true }, // in minutes

    voucher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },

    locart_coins_used: { type: Number, default: 0 },
    locart_coins_value: { type: Number, default: 0 },

    notes: { type: String },
    booking_mode: {
      type: String,
      enum: ["store", "online"],
      default: "store",
    },

    is_partial_payment: { type: Boolean, default: false },
    partial_percentage: { type: Number, default: 0 },
    payable_amount: { type: Number, default: 0 },

    payment_status: {
      type: String,
      enum: ["pending", "authorized", "captured", "settled", "failed", "paid", "refunded"],
      default: "pending",
    },
    booking_status: {
      type: String,
      enum: [
        "ongoing",
        "upcoming",
        "pending",
        "completed",
        "cancelled",
        "flagged"
      ],
      default: "upcoming",
    },

    service_date: { type: Date, required: true },
    service_start_time: { type: String, required: true }, // store as HH:mm:ss string
    service_end_time: { type: String, required: true },

    stripe_session_id: String,
    stripe_payment_intent: String,

    cancelled_at: { type: Date },
    cancellation_reason: { type: String },
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
bookingSchema.index({ user_id: 1 });
bookingSchema.index({ stylist_id: 1 });
bookingSchema.index({ saloon_id: 1 });
bookingSchema.index({ booking_status: 1 });
bookingSchema.index({ service_date: 1 });
bookingSchema.index({ payment_status: 1 });
bookingSchema.index({ cancelled_by: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
