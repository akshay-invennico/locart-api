const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
      min: [15, "Duration must be at least 15 minutes"],
    },
    base_price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      maxlength: 50,
      default: "active",
      enum: ["active", "inactive"],
      index: true,
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

// Indexes for performance
serviceSchema.index({ service_name: 1 });
serviceSchema.index({ service_category: 1 });
serviceSchema.index({ status: 1 });

const Service = mongoose.model("Service", serviceSchema);
module.exports = Service;
