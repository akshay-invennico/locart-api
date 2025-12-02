const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");

const {
  createCart,
  getCart,
  deleteCart,
  updateCart,
  checkItemInCart
} = require("../../../controllers/cart.controller");

const router = express.Router();

router.post(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  createCart
);

router.patch(
  "/:id",
  authMiddleware(["customer", "merchant", "loctitian"]),
  updateCart
);

router.get(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  getCart
);

router.get(
  "/check",
  authMiddleware(["customer", "merchant", "loctitian"]),
  checkItemInCart
);

router.delete(
  "/:id",
  authMiddleware(["customer", "merchant", "loctitian"]),
  deleteCart
);

module.exports = router;
