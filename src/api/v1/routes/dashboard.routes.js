const express = require("express");
const {
  getSummary,
  getBookingOverview,
  getTodaysAppointments,
  getTopStylists,
  getTopSellingProducts,
  getRecentActivity,
  universalSearch,
} = require("../../../controllers/dashboard.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");
const router = express.Router();

router.get("/summary", authMiddleware(["merchant", "admin"]), getSummary);
router.get(
  "/booking-overview",
  authMiddleware(["merchant", "admin"]),
  getBookingOverview
);

router.get(
  "/today-appointments",
  authMiddleware(["merchant", "admin"]),
  getTodaysAppointments
);

router.get(
  "/top-stylists",
  authMiddleware(["merchant", "admin"]),
  getTopStylists
);

router.get(
  "/top-selling-products",
  authMiddleware(["merchant", "admin"]),
  getTopSellingProducts
);

router.get(
  "/recent-activities",
  authMiddleware(["merchant", "admin"]),
  getRecentActivity
);

router.get('/search', authMiddleware(["merchant", "admin", "customer"]), universalSearch)
module.exports = router;
