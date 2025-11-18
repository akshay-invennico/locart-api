const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: { type: String },
    image: { type: String },
    slug: {
      type: String,
      required: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["product", "service"],
      required: true,
    },
    order: { type: Number },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

categorySchema.index({ name: 1, type: 1 }, { unique: true });
categorySchema.index({ slug: 1, type: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
