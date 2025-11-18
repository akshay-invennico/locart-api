const express = require("express");
const router = express.Router();

const {
  updateProductCategory,
  deleteProductCategory,
  getProductCategories,
  createProductCategory,
  getProductCategoryById,
} = require("../../../controllers/productCategory.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");
const upload = require("../../../middlewares/upload.middleware");
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");

router
  .route("/category")
  .post(
    authMiddleware(["merchant", "customer"]),
    uploadSingle("categories"),
    createProductCategory
  )
  .get(authMiddleware(["merchant"]), getProductCategories);

router
  .route("/category/:id")
  .get(authMiddleware(["merchant"]), getProductCategoryById)
  .patch(authMiddleware(["merchant"]),    uploadSingle("categories"), updateProductCategory)
  .delete(authMiddleware(["merchant"]), deleteProductCategory);

module.exports = router;
