const Category = require("../models/category.model");
const { uploadToS3 } = require("../services/awsS3");

const createCategory = async (req, res) => {
  try {
    const { name, description, status, type } = req.body;

    if (!type || !["product", "service"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing type. Allowed: product, service",
      });
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    let image = null;

    if (req.file) {
      const uploaded = await uploadToS3(req.file, "categories")
      image = uploaded.url;
    }

    // Check unique per type
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      type,
      deleted_at: null,
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `${type} category with this name already exists`,
      });
    }

    // Get next order
    const lastCategory = await Category.findOne({ type }).sort({ order: -1 });
    const nextOrder = lastCategory ? lastCategory.order + 1 : 1;

    const category = new Category({
      name,
      description,
      slug,
      type,
      status,
      image,
      order: nextOrder,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: `${type} category created successfully`,
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const getCategories = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", status, type } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const matchQuery = { deleted_at: null };

    if (status && ["active", "inactive"].includes(status.toLowerCase())) {
      matchQuery.status = status.toLowerCase();
    }

    if (type && ["product", "service"].includes(type.toLowerCase())) {
      matchQuery.type = type.toLowerCase();
    }

    if (search) {
      matchQuery.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category_id",
          as: "products",
        },
      },
      {
        $addFields: {
          productsCount: { $size: "$products" },
        },
      },
      {
        $project: {
          _id: 1,
          categoryName: "$name",
          description: 1,
          status: {
            $cond: {
              if: { $eq: ["$status", "active"] },
              then: "Active",
              else: "Inactive",
            },
          },
          type: 1,
          image: 1,
          order: 1,
          productsCount: 1,
        },
      },

      { $sort: { order: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    const total = await Category.countDocuments(matchQuery);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page,
        limit,
        categories,
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

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById({
      _id: req.params.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `category not found`,
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

const updateCategory = async (req, res) => {
  try {
    const { name, description, status, type } = req.body;

    if (!type || !["product", "service"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    const categoryId = req.params.id;

    const existingCategory = await Category.findOne({
      _id: categoryId,
      type,
      deleted_at: null,
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: `${type} category not found`,
      });
    }

    let image = existingCategory.image;

    if (req.file) {
      const uploaded = await uploadToS3(req.file, "categories")
      image = uploaded.url;
    }

    const updateData = { description, status, image };

    if (name) {
      const sameNameCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        type,
        _id: { $ne: categoryId },
        deleted_at: null,
      });

      if (sameNameCategory) {
        return res.status(400).json({
          success: false,
          message: `${type} category with this name already exists`,
        });
      }

      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, "-");
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId, type, deleted_at: null },
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `${type} category updated successfully`,
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(
      { _id: req.params.id }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `category not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `category deleted successfully`,
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
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
