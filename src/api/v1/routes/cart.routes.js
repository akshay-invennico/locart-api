const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");

const {
  createCart,
  getCart,
  deleteCart
} = require("../../../controllers/cart.controller");

const router = express.Router();

router.post(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  createCart
);

router.get(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  getCart
);

router.delete(
  "/:id",
  authMiddleware(["customer", "merchant", "loctitian"]),
  deleteCart
);

module.exports = router;
