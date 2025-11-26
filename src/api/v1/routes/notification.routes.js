const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  toggleMuteNotifications,
} = require("../../../controllers/notification.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");

router.get("/", authMiddleware(["merchant", "customer", "loctitian"]), getNotifications);
router.patch("/read/:id", authMiddleware(["merchant", "customer", "loctitian"]), markAsRead);
router.patch("/read", authMiddleware(["merchant", "customer", "loctitian"]), markAllAsRead);
router.delete("/:id", authMiddleware(["merchant", "customer", "loctitian"]), deleteNotification);
router.delete("/", authMiddleware(["merchant", "customer", "loctitian"]), clearAllNotifications);
router.patch("/mute", authMiddleware(["merchant", "customer", "loctitian"]), toggleMuteNotifications);

module.exports = router;
