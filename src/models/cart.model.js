const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    item_type: {
      type: String,
      enum: ["product", "service"],
      required: true,
    },

    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    price_at_time: {
      type: Number,
      required: true,
    },

    total_price: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      default: null,
    }
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartItemSchema);
module.exports = Cart
