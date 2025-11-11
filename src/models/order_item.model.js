const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

    item_type: {
      type: String,
      enum: ["product", "service", "addon"],
      required: true,
    },
    item_name: { type: String, required: true },
    item_sku: { type: String },

    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    total_price: { type: Number, required: true },

    tax_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },

    item_attributes: { type: Object },

    fulfillment_status: {
      type: String,
      enum: ["pending", "fulfilled", "cancelled", "returned"],
      default: "pending",
    },

    return_quantity: { type: Number, default: 0 },
    return_reason: { type: String },

    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
orderItemSchema.index({ order_id: 1 });
orderItemSchema.index({ product_id: 1 });
orderItemSchema.index({ variant_id: 1 });
orderItemSchema.index({ booking_id: 1 });
orderItemSchema.index({ item_type: 1 });
orderItemSchema.index({ fulfillment_status: 1 });

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
module.exports = OrderItem;
