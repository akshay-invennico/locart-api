const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createShopOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  flagOrder,
} = require("../../../controllers/order.controller");
const router = express.Router();

router
  .route("/orders")
  .post(authMiddleware(["merchant"]), createShopOrder)
  .get(authMiddleware(["merchant"]), getAllOrders)
  .patch(authMiddleware(["merchant"]), updateOrderStatus);

router.route("/orders/:id").get(authMiddleware(["merchant"]), getOrderById);

router.route("/orders/flag").patch(authMiddleware(["merchant"]), flagOrder);

module.exports = router;
