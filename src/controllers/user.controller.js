const User = require("../models/user.model");
const { uploadToS3 } = require("../services/awsS3");

const editUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, gender, dialing_code } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.file) {
      const uploaded = await uploadToS3(req.file, "user-profiles");
      user.profile_picture = uploaded.url;
    }

    if (name) user.name = name;
    if (phone) user.phone_number = phone;
    if (gender) user.gender = gender;
    if (dialing_code) user.dialing_code = dialing_code;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.profile_picture) {
      return res.status(400).json({ success: false, message: "No profile photo to delete" });
    }

    user.profile_picture = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while changing password",
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete your account",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    user.deleted_reason = reason;
    user.status = "inactive";
    user.deleted_at = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your account has been deleted.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting account",
    });
  }
};

module.exports = {
  editUserProfile,
  deleteProfilePhoto,
  changePassword,
  deleteAccount
};
