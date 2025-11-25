const express = require("express");
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createShopOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  flagOrder,
  createOrder,
  getOrderSummary,
  verifyPayment,
  getAllOrdersDetails,
  getOrderDetailsById,
  cancelOrder,
} = require("../../../controllers/order.controller");
const router = express.Router();

router
  .route("/orders")
  .post(authMiddleware(["merchant"]), createShopOrder)
  .get(authMiddleware(["merchant"]), getAllOrders)
  .patch(authMiddleware(["merchant"]), updateOrderStatus);

router.route("/orders/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), getOrderById);

router.route("/orders/flag").patch(authMiddleware(["merchant"]), flagOrder);

router.route("/order/product").post(authMiddleware(["merchant", "customer", "loctitian"]), createOrder)
router.route("/verify/payment").get(authMiddleware(["merchant", "customer", "loctitian"]), verifyPayment)
router.route("/order/summary/:order_id").get(authMiddleware(["merchant", "customer", "loctitian"]), getOrderSummary)
router.route("/order/details").get(authMiddleware(["merchant", "customer", "loctitian"]), getAllOrdersDetails)
router.route("/order/details/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), getOrderDetailsById)
router.route("/order/cancel/:id").post(authMiddleware(["merchant", "customer", "loctitian"]), cancelOrder)

module.exports = router;
