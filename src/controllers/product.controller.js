const Product = require("../models/product.model");
const Merchant = require("../models/merchant.model");
const Salon = require("../models/salons.model");
const { uploadMultipleToS3, deleteFromS3 } = require("../services/awsS3");

//@desc    Create a new product (merchant only)
//@route   POST /api/product
//@access  Private (merchant role)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      stock_quantity,
      category_id,
      unit_price,
    } = req.body;

    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    const existingProduct = await Product.findOne({
      merchant_id: merchant._id,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "You already have a product with this name",
      });
    }

    let images = [];

    // Upload images to S3 if files are provided
    if (req.files && req.files.length > 0) {
      try {
        images = await uploadMultipleToS3(req.files, "products");
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload images",
          error: uploadError.message,
        });
      }
    }

    const salon = await Salon.findOne({ merchant_id: merchant._id });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found for this merchant",
      });
    }

    // Create product
    const product = new Product({
      merchant_id: merchant._id,
      saloon_id: salon._id || null,
      name,
      description,
      status,
      stock_quantity,
      category_id,
      unit_price,
      images,
      featured_image: images.length > 0 ? images[0] : null,
    });

    await product.save();
    const formattedUnitPrice = parseFloat(product.unit_price.toString());

    // Response data
    const responseData = {
      _id: product._id,
      name: product.name,
      description: product.description,
      status: product.status,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      unit_price: formattedUnitPrice,
      images: product.images,
      featured_image: product.featured_image,
    };

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
//@desc    Get all products (merchant only)
//@route   GET /api/product
//@access  Private (merchant role)
const getProducts = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    // 🔍 Extract filters from query
    const {
      search,
      category,
      status,
      priceMin,
      priceMax,
      stockMin,
      stockMax,
      type,
      page = 1,
      limit = 10,
    } = req.query;

    // ✅ Ensure numeric pagination values
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    // 📌 Build query
    const query = { merchant_id: merchant._id, deleted_at: null };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.category_id = category;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (priceMin || priceMax) {
      query.unit_price = {};
      if (priceMin) query.unit_price.$gte = Number(priceMin);
      if (priceMax) query.unit_price.$lte = Number(priceMax);
    }

    if (stockMin || stockMax) {
      query.stock_quantity = {};
      if (stockMin) query.stock_quantity.$gte = Number(stockMin);
      if (stockMax) query.stock_quantity.$lte = Number(stockMax);
    }

    // 📌 Query products with pagination
    const products = await Product.find(query)
      .populate("category_id", "name")
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    // 📌 Format response with selected fields only
    const formatted = products.map((p) => ({
      _id: p._id,
      productName: p.name,
      category: p.category_id || null,
      price: p.unit_price,
      stock: p.stock_quantity,
      status: p.status,
      description: p.description,
      imageUrls: p.images || [],
    }));

    return res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      total,
      data: formatted,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

//@desc    Get single product (merchant only)
//@route   GET /api/product/:id
//@access  Private (merchant role)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category_id",
      "name"
    );

    if (!product || product.deleted_at) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const formattedUnitPrice = parseFloat(product.unit_price.toString());
    const category =
      Array.isArray(product.category_id) && product.category_id.length > 0
        ? product.category_id[0]
        : product.category_id || null;

    const responseData = {
      _id: product._id,
      name: product.name,
      description: product.description,
      status: product.status,
      stock_quantity: product.stock_quantity,
      category,
      unit_price: formattedUnitPrice,
      images: product.images,
      featured_image: product.featured_image,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//@desc    Update product (merchant only)
//@route   PUT /api/product/:id
//@access  Private (merchant role)
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      stock_quantity,
      category_id,
      unit_price,
      images_to_delete = [],
      replace_all_images = "false",
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product || product.deleted_at) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // ✅ Update only allowed fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (status) product.status = status;
    if (stock_quantity !== undefined) product.stock_quantity = stock_quantity;
    if (category_id) product.category_id = category_id;
    if (unit_price) product.unit_price = unit_price;

    // ✅ Handle image deletions first
    if (images_to_delete && images_to_delete.length > 0) {
      console.log("Deleting specified images from S3...");

      const deletePromises = images_to_delete.map(async (imageUrl) => {
        try {
          await deleteFromS3(imageUrl);

          product.images = product.images.filter((img) => img !== imageUrl);

          // Update featured image if deleted image was the featured one
          if (product.featured_image === imageUrl) {
            product.featured_image =
              product.images.length > 0 ? product.images[0] : null;
          }

          console.log("Deleted image:", imageUrl);
        } catch (deleteError) {
          console.error(
            "Failed to delete image:",
            imageUrl,
            deleteError.message
          );
        }
      });

      await Promise.allSettled(deletePromises);
    }

    // ✅ Handle replacing all images
    if (
      replace_all_images === "true" &&
      product.images &&
      product.images.length > 0
    ) {
      console.log("Replacing all existing images...");

      // Delete all remaining images from S3
      const deleteAllPromises = product.images.map(async (imageUrl) => {
        try {
          await deleteFromS3(imageUrl);
          console.log("Deleted image:", imageUrl);
        } catch (deleteError) {
          console.error(
            "Failed to delete image:",
            imageUrl,
            deleteError.message
          );
        }
      });

      await Promise.allSettled(deleteAllPromises);

      // Clear images array
      product.images = [];
      product.featured_image = null;
    }

    // ✅ Handle new image uploads
    if (req.files && req.files.length > 0) {
      try {
        console.log("Uploading new images to S3...");
        const newImages = await uploadMultipleToS3(req.files, "products");

        // Add new images to product
        product.images.push(...newImages);

        // Update featured image if needed
        if (newImages.length > 0 && !product.featured_image) {
          product.featured_image = newImages[0];
        } else if (replace_all_images === "true" && newImages.length > 0) {
          // If replacing all, use first new image as featured
          product.featured_image = newImages[0];
        }

        console.log("New images uploaded successfully:", newImages);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload new images",
          error: uploadError.message,
        });
      }
    }

    await product.save();

    // 🎯 Return only relevant fields
    const responseData = {
      _id: product._id,
      name: product.name,
      description: product.description,
      status: product.status,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      unit_price: product.unit_price,
      images: product.images,
      featured_image: product.featured_image,
    };

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

//@desc    Delete product (merchant only)
//@route   DELETE /api/product/:id
//@access  Private (merchant role)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.deleted_at) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.deleted_at = new Date();
    await product.save();

    return res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
