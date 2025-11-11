const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    role_name: {
      type: String,
      required: true,
      maxlength: 100,
      unique: true,
    },
    guard_name: { type: String, required: false, maxlength: 50 },
    description: { type: String },

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deleted_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Role = mongoose.model("Role", roleSchema);
module.exports = Role;
