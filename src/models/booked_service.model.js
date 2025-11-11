const mongoose = require("mongoose");

const bookedServiceSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    stylist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stylist",
      required: true,
    },

    quantity: { type: Number, default: 1 },
    unit_price: { type: Number, required: true },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    duration: { type: Number, required: true },

    refund_status: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "refunded"],
      default: "none",
    },
    refund_amount: { type: Number, default: 0 },

    service_status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled", "refunded"],
      default: "pending",
    },

    started_at: { type: Date },
    completed_at: { type: Date },

    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
bookedServiceSchema.index({ booking_id: 1 });
bookedServiceSchema.index({ service_id: 1 });
bookedServiceSchema.index({ stylist_id: 1 });
bookedServiceSchema.index({ service_status: 1 });
bookedServiceSchema.index({ refund_status: 1 });

const BookedService = mongoose.model("BookedService", bookedServiceSchema);
module.exports = BookedService;
