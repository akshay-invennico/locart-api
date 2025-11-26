const Notification = require("../models/notification.model");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { is_read: true });

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user_id: req.user.id });
    res.json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

const toggleMuteNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const muted = req.body.muted;

    await Notification.updateMany(
      { user_id: userId },
      { is_muted: muted }
    );

    res.json({
      success: true,
      message: muted ? "Notifications muted" : "Notifications unmuted",
    });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

module.exports = {
  getNotifications,
  clearAllNotifications,
  toggleMuteNotifications,
  deleteNotification,
  markAllAsRead,
  markAsRead
}