const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  updateBookingStatusBulk,
  refundBooking,
  getRefundSummary,
  markAsCompleted,
  createServiceBooking,
  verifyPayment,
  getBookingSummary,
  addToCalendar,
  cancelBooking,
} = require("../../../controllers/appointment.controller");

router
  .route("/")
  .post(authMiddleware(["merchant", "customer", "loctitian"]), createBooking)
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getAllBookings);


router.route("/book").post(authMiddleware(["merchant", "customer", "loctitian"]), createServiceBooking)
router.route("/book/verify").get(authMiddleware(["merchant", "customer", "loctitian"]), verifyPayment)
router.route("/book/summary/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), getBookingSummary)
router.route("/book/calendar/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), addToCalendar);
router.route("/cancel/:id").put(authMiddleware(["merchant", "customer", "loctitian"]), cancelBooking);

router
  .route("/complete")
  .patch(authMiddleware(["merchant"]), markAsCompleted);

router
  .route("/:id")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getBookingById)
  .patch(authMiddleware(["merchant", "customer", "loctitian"]), updateBooking);

router
  .route("/bulk/status")
  .patch(authMiddleware(["merchant", "customer", "loctitian"]), updateBookingStatusBulk);

router
  .route("/:id/refund")
  .post(authMiddleware(["merchant", "customer", "loctitian"]), refundBooking)
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getRefundSummary);

module.exports = router;
