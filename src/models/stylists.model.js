const mongoose = require("mongoose");

const stylistSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    saloon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    bio: {
      type: String,
    },
    experience_years: {
      type: Number,
      default: 0,
    },
    specialties: {
      type: String,
    },
    certifications: {
      type: String,
    },
    hourly_rate: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    commission_rate: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    availability_schedule: {
      type: String,
    },
    ratings: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    reviews_count: {
      type: Number,
      default: 0,
    },
    total_bookings: {
      type: Number,
      default: 0,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    hire_date: {
      type: Date,
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    workingDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },

    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
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

const Stylist = mongoose.model("Stylist", stylistSchema);

module.exports = Stylist;
