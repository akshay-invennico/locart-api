const mongoose = require("mongoose");

const merchantSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    business_name: { type: String, required: true, maxlength: 100 },
    business_type: {
      type: String,
      maxlength: 50,
      default: "salon",
      enum: ["salon", "spa", "store", "other"],
    },
    business_registration_number: { type: String, maxlength: 100 },
    tax_id: { type: String, maxlength: 100 },

    business_address: { type: String },
    business_email: { type: String, maxlength: 100 },
    business_phone: { type: String, maxlength: 100 },
    business_website: { type: String, maxlength: 255 },
    business_description: { type: String },

    logo_url: { type: String },

    verification_status: {
      type: String,
      maxlength: 50,
      default: "pending",
      enum: ["pending", "verified", "rejected"],
    },

    verification_documents: [{ type: String }],

    onboarding_status: {
      type: String,
      maxlength: 50,
      default: "incomplete",
      enum: ["incomplete", "in_progress", "completed"],
    },

    status: {
      type: String,
      maxlength: 50,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },

    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 📌 Indexes
merchantSchema.index({ user_id: 1 }, { unique: true });
merchantSchema.index({ business_registration_number: 1 });
merchantSchema.index({ verification_status: 1 });
merchantSchema.index({ onboarding_status: 1 });
merchantSchema.index({ status: 1 });

const Merchant = mongoose.model("Merchant", merchantSchema);
module.exports = Merchant;
