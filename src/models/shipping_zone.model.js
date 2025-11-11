const mongoose = require("mongoose");

const shippingZoneSchema = new mongoose.Schema(
  {
    zone_name: { type: String, required: true, trim: true },
    zone_description: { type: String },

    countries: { type: [String], default: [] }, // JSON array of country codes
    states: { type: [String], default: [] }, // JSON array of state codes
    postal_codes: { type: [String], default: [] }, // JSON array of postal codes or ranges

    is_domestic: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
shippingZoneSchema.index({ zone_name: 1 });
shippingZoneSchema.index({ is_domestic: 1 });
shippingZoneSchema.index({ status: 1 });

const ShippingZone = mongoose.model("ShippingZone", shippingZoneSchema);
module.exports = ShippingZone;
