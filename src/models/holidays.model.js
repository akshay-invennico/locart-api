const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    occasion: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    salon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 📌 Indexes for fast queries
holidaySchema.index({ salon_id: 1 });
holidaySchema.index({ merchant_id: 1 });
holidaySchema.index({ date: 1 });
holidaySchema.index({ deleted_at: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);
