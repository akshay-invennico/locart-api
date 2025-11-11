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
} = require("../../../controllers/appointment.controller");

router
  .route("/")
  .post(authMiddleware(["merchant"]), createBooking)
  .get(authMiddleware(["merchant"]), getAllBookings);

router
  .route("/complete")
  .patch(authMiddleware(["merchant"]), markAsCompleted);

router
  .route("/:id")
  .get(authMiddleware(["merchant"]), getBookingById)
  .patch(authMiddleware(["merchant"]), updateBooking);

router
  .route("/bulk/status")
  .patch(authMiddleware(["merchant"]), updateBookingStatusBulk);

router
  .route("/:id/refund")
  .post(authMiddleware(["merchant"]), refundBooking)
  .get(authMiddleware(["merchant"]), getRefundSummary);

module.exports = router;
