const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: [
        "booking",
        "stylish",
        "product",
        "general"
      ],
      default: "general",
    },

    is_read: { type: Boolean, default: false },
    is_muted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
