const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  bulkDeleteProducts,
} = require("../../../controllers/product.controller");
const { uploadMultiple } = require("../../../middlewares/uploadMiddleware");
const router = express.Router();

router
  .route("/product")
  .post(
    authMiddleware(["merchant", "customer", "loctitian"]),
    uploadMultiple("products", 10),
    createProduct
  )
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getProducts);

router.patch("/product/bulk-status", updateProductStatus);
router.delete("/product/bulk-delete", bulkDeleteProducts);

router
  .route("/product/:id")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getProductById)
  .patch(
    authMiddleware(["merchant"]),
    uploadMultiple("products", 10),
    updateProduct
  )
  .delete(authMiddleware(["merchant"]), deleteProduct);

router.patch("/product/bulk-status", updateProductStatus);
router.delete("/product/bulk-delete", bulkDeleteProducts);

module.exports = router;
