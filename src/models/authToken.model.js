const mongoose = require("mongoose");

const authTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["access", "refresh"],
      required: true,
      index: true,
    },
    expires_at: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

authTokenSchema.index({ user: 1, token: 1 });

const AuthToken = mongoose.model("AuthToken", authTokenSchema);
module.exports = AuthToken;
