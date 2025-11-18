const express = require("express");
const router = express.Router();

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../../../controllers/category.controller");

const authMiddleware = require("../../../middlewares/auth.middleware");
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");

router.route("/category").post(authMiddleware(["merchant", "customer"]), uploadSingle("category_photo"), createCategory).get(authMiddleware(["merchant", "customer"]), getCategories);

router
  .route("/category/:id")
  .get(authMiddleware(["merchant", "customer"]), getCategoryById)
  .patch(
    authMiddleware(["merchant", "customer"]),
    uploadSingle("category_photo"),
    updateCategory
  )
  .delete(authMiddleware(["merchant", "customer"]), deleteCategory);

module.exports = router;
