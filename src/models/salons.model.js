const mongoose = require("mongoose");

const operatingHourSchema = new mongoose.Schema(
  {
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
    open: {
      type: String,
      default: null,
    },
    close: {
      type: String,
      default: null,
    },
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const salonSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    streetAddress: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    mapLink: {
      type: String,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      unique: true,
    },
    website: {
      type: String,
    },
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
    tiktok: {
      type: String,
    },
    twitter: {
      type: String,
    },
    operatingHours: {
      type: [operatingHourSchema],
      default: undefined,
    },
    about: {
      type: String,
    },
    amenities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Amenities",
      },
    ],
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
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
salonSchema.index({ merchant_id: 1 });
salonSchema.index({ city: 1, state: 1 });
salonSchema.index({ deleted_at: 1 });

module.exports = mongoose.model("Salon", salonSchema);
