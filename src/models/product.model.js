const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    merchant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    saloon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      default: null,
    },
    name: {
      type: String,
      required: true,
      maxlength: 255,
    },
    description: {
      type: String,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 100,
    },
    barcode: {
      type: String,
      maxlength: 100,
    },
    brand: {
      type: String,
      maxlength: 100,
    },
    category_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductCategory",
      },
    ],
    subcategory: {
      type: String,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["physical", "digital", "service"],
      default: "physical",
    },
    unit_price: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    cost_price: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    tax_rate: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    weight: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    dimensions: {
      type: Object,
    },
    color_variants: {
      type: [String],
      default: [],
    },
    size_variants: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    featured_image: {
      type: String,
    },
    inventory_tracking: {
      type: Boolean,
      default: true,
    },
    stock_quantity: {
      type: Number,
      default: 0,
    },
    low_stock_threshold: {
      type: Number,
      default: 10,
    },
    allow_backorder: {
      type: Boolean,
      default: false,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_digital: {
      type: Boolean,
      default: false,
    },
    digital_file_url: {
      type: String,
      default: null,
    },
    requires_shipping: {
      type: Boolean,
      default: true,
    },
    shipping_class: {
      type: String,
      default: "standard",
    },
    ratings: {
      type: Number,
      default: 0.0,
    },
    reviews_count: {
      type: Number,
      default: 0,
    },
    total_sold: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "in-stock", "out_of_stock", "discontinued"],
      default: "active",
    },
    published_at: {
      type: Date,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 🔍 Indexes
productSchema.index({ merchant_id: 1 });
productSchema.index({ saloon_id: 1 });
productSchema.index({ product_sku: 1 }, { unique: true, sparse: true });
productSchema.index({ product_barcode: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ product_type: 1 });
productSchema.index({ status: 1 });
productSchema.index({ is_featured: 1 });
productSchema.index({ stock_quantity: 1 });
productSchema.index({ created_at: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
