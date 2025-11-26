const Notification = require("../models/notification.model");

exports.sendNotification = async ({ user_id, title, message, type, icon }) => {
  try {
    const notification = await Notification.create({
      user_id,
      title,
      message,
      type,
    });

    return notification;
  } catch (error) {
    console.log("Notification Error:", error);
  }
};
