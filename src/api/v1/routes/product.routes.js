const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../../../controllers/product.controller");
const upload = require("../../../middlewares/upload.middleware");
const { uploadMultiple } = require("../../../middlewares/uploadMiddleware");
const router = express.Router();

router
  .route("/product")
  .post(
    authMiddleware(["merchant"]),
    uploadMultiple("products", 10),
    createProduct
  )
  .get(authMiddleware(["merchant"]), getProducts);

router
  .route("/product/:id")
  .get(authMiddleware(["merchant"]), getProductById)
  .patch(
    authMiddleware(["merchant"]),
    uploadMultiple("products", 10),
    updateProduct
  )
  .delete(authMiddleware(["merchant"]), deleteProduct);

module.exports = router;
