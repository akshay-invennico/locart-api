const ProductCategory = require("../models/productCategory.model"); // adjust path
const { uploadToS3, deleteFromS3 } = require("../services/awsS3");

// @desc Create Product Category
// @route POST /api/v1/product-categories
// @access merchant
const createProductCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, "-");

    let image = null;

    if (req.file) {
      try {
        image = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          "categories",
          req.file.mimetype
        );
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload category image",
          error: uploadError.message,
        });
      }
    }

    const existingCategory = await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    // ✅ Find next order number
    const lastCategory = await ProductCategory.findOne().sort({ order: -1 });
    const nextOrder = lastCategory ? lastCategory.order + 1 : 1;

    const category = new ProductCategory({
      name,
      description,
      slug,
      status,
      image,
      order: nextOrder,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: "Product category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating product category:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
// @desc Get All Product Categories
// @route GET /api/v1/product-categories
// @access merchant
const getProductCategories = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // ✅ Build query
    const query = { deleted_at: null };

    if (status && ["active", "inactive"].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    if (search) {
      query.name = { $regex: search, $options: "i" }; // case-insensitive search
    }

    // ✅ Count total categories
    const total = await ProductCategory.countDocuments(query);

    // ✅ Fetch categories with pagination
    const categories = await ProductCategory.find(query)
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ Transform response
    const formattedCategories = categories.map((cat) => ({
      _id: cat._id,
      categoryName: cat.name,
      productsCount: 0, // 🔑 Replace with actual count if you link products
      status: cat.status === "active" ? "Active" : "Inactive",
      description: cat.description,
    }));

    return res.status(200).json({
      success: true,
      data: {
        total,
        page,
        limit,
        categories: formattedCategories,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc Get Single Product Category
// @route GET /api/v1/product-categories/:id
// @access merchant
const getProductCategoryById = async (req, res) => {
  try {
    const category = await ProductCategory.findOne({
      _id: req.params.id,
      deleted_at: null,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc Update Product Category
// @route PUT /api/v1/product-categories/:id
// @access merchant
const updateProductCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const categoryId = req.params.id;

    // Find the existing category first
    const existingCategory = await ProductCategory.findOne({
      _id: categoryId,
      deleted_at: null,
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
      });
    }

    let image = existingCategory.image;

    // Handle image update if new file is provided
    if (req.file) {
      try {
        // Delete old image from S3 if it exists
        if (existingCategory.image) {
          try {
            await deleteFromS3(existingCategory.image);
            console.log(
              "Old category image deleted from S3:",
              existingCategory.image
            );
          } catch (deleteError) {
            console.error(
              "Failed to delete old image from S3:",
              deleteError.message
            );
            // Continue with upload even if deletion fails
          }
        }

        // Upload new image to S3
        image = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          "categories",
          req.file.mimetype
        );
        console.log("New category image uploaded to S3:", image);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload category image",
          error: uploadError.message,
        });
      }
    }

    // Generate new slug if name is being updated
    const updateData = {
      description,
      status,
      image,
    };

    if (name) {
      const existingWithSameName = await ProductCategory.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: categoryId },
        deleted_at: null,
      });

      if (existingWithSameName) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, "-"); 
    }

    const updatedCategory = await ProductCategory.findOneAndUpdate(
      { _id: categoryId, deleted_at: null },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Failed to update category",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating product category:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc Soft Delete Product Category
// @route DELETE /api/v1/product-categories/:id
// @access merchant
const deleteProductCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Product category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createProductCategory,
  getProductCategories,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
};
