const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      unique: true,
    },
    description: { type: String },
    image: { type: String },
    slug: {
      type: String,
      required: true,
      maxlength: 100,
      unique: true,
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
const ProductCategory = mongoose.model(
  "ProductCategory",
  productCategorySchema
);
module.exports = ProductCategory;
