const mongoose = require("mongoose");

const shippingAddressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    address_type: {
      type: String,
      enum: ["shipping", "billing", "both"],
      default: "shipping",
    },

    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    company: { type: String },

    address_line_1: { type: String, required: true },
    address_line_2: { type: String },

    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postal_code: { type: String, required: true },

    phone_number: { type: String },

    latitude: { type: Number },
    longitude: { type: Number },

    delivery_instructions: { type: String },
    address_nickname: { type: String }, // e.g. Home, Work

    is_default: { type: Boolean, default: false },
    is_validated: { type: Boolean, default: false },
    validation_source: { type: String }, // google, usps, etc.

    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
shippingAddressSchema.index({ user_id: 1 });
shippingAddressSchema.index({ address_type: 1 });
shippingAddressSchema.index({ is_default: 1 });
shippingAddressSchema.index({ postal_code: 1 });
shippingAddressSchema.index({ country: 1 });
shippingAddressSchema.index({ latitude: 1, longitude: 1 });

const ShippingAddress = mongoose.model(
  "ShippingAddress",
  shippingAddressSchema
);
module.exports = ShippingAddress;
