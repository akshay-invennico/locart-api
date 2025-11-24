const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    order_number: { type: String, unique: true, required: true, trim: true },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    merchant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant" },

    order_type: {
      type: String,
      enum: ["product", "service"],
      default: "product",
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        image: String,
      },
    ],

    subtotal: { type: Number, required: true },
    tax_amount: { type: Number, default: 0 },
    shipping_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },

    locart_coins_used: { type: Number, default: 0 },
    locart_coins_value: { type: Number, default: 0 },

    total_amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },

    payment_status: {
      type: String,
      enum: ["pending", "failed", "paid"],
      default: "pending",
    },

    order_status: {
      type: String,
      enum: [
        "pending",
        "dispatched",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },

    address_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingAddress",
      //   required: true,
    },

    stripe_session_id: String,
    stripe_payment_intent: String,

    voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    special_instructions: { type: String },
    internal_notes: { type: String },

    cancelled_at: Date,
    cancellation_reason: String,
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    flagged: { type: Boolean, default: false },
    flagged_at: { type: Date },
    flagged_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    flagged_reason: { type: String },
    refund_amount: { type: Number, default: 0 },
    refund_reason: String,
    refunded_at: Date,

    deleted_at: Date,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
orderSchema.index({ order_number: 1 }, { unique: true });
orderSchema.index({ user_id: 1 });
orderSchema.index({ merchant_id: 1 });
orderSchema.index({ order_type: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ order_status: 1 });
orderSchema.index({ tracking_number: 1 });
orderSchema.index({ created_at: 1 });
orderSchema.index({ cancelled_by: 1 });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
