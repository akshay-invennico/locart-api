const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    card_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null,
    },

    transaction_type: {
      type: String,
      enum: ["payment", "refund", "partial_refund"],
      required: true,
    },

    payment_method: {
      type: String,
      enum: [
        "card",
        "cash",
        "wallet",
        "bank_transfer",
        "locart_coins",
        "stripe",
        "online",
        "upi",
      ],
      required: true,
    },

    payment_processor: { type: String }, // stripe, paypal, razorpay, etc.
    processor_transaction_id: { type: String },
    processor_charge_id: { type: String },

    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },

    locart_coins_used: { type: Number, default: 0 },
    locart_coins_value: { type: Number, default: 0 },

    processing_fee: { type: Number, default: 0 },
    net_amount: { type: Number, required: true }, // amount - processing_fee

    tax_amount: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    tip_amount: { type: Number, default: 0 },

    transaction_status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled", "refunded"],
      required: true,
    },

    payment_status: {
      type: String,
      enum: [
        "authorized",
        "captured",
        "settled",
        "failed",
        "paid",
        "refunded",
        "manual",
      ],
      required: true,
    },

    failure_reason: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }, // JSON object

    processed_at: { type: Date },
    settled_at: { type: Date },
    refunded_at: { type: Date },
    deleted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// 📌 Indexes for optimization
transactionSchema.index({ user_id: 1 });
transactionSchema.index({ booking_id: 1 });
transactionSchema.index({ order_id: 1 });
transactionSchema.index({ card_id: 1 });
transactionSchema.index({ transaction_type: 1 });
transactionSchema.index({ payment_method: 1 });
transactionSchema.index({ transaction_status: 1 });
transactionSchema.index({ payment_status: 1 });
transactionSchema.index({ processor_transaction_id: 1 });
transactionSchema.index({ created_at: 1 });
transactionSchema.index({ processed_at: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
