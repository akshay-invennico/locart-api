const Notification = require("../models/notification.model");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const roles = req.user.roles.map((role) => role.role_name);

    let notifications = [];
    if (roles.includes("admin")) {
      notifications = await Notification.find({ recipient_type: "admin" }).sort({ createdAt: -1 });
      

    } else {
      notifications = await Notification.find({
        $or: [
          { user_id: userId },
          { recipient_type: "user" }
        ]
      }).sort({ createdAt: -1 });
    }

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
    const userId = req.user.id;
    const roles = req.user.roles.map((role) => role.role_name);

    if (roles.includes("admin")) {
      await Notification.deleteMany(
        { recipient_type: { $in: ["admin", "all"] }, }
      );

    } else {
      await Notification.updateMany(
        { user_id: userId, is_read: false },
        { is_read: true }
      );
    }

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