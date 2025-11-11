const Role = require("../models/role.model");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const { generateTokens } = require("../services/auth.service");
const logger = require("../utils/logger");

// 🔐 Register Admin
const registerOrLoginAdmin = async (req, res) => {
  try {
    const { email_address, password } = req.body;

    // 1. Check if an admin role exists
    let adminRole = await Role.findOne({ role_name: "admin" }).populate(
      "users"
    );

    let user;

    if (adminRole && adminRole.users.length > 0) {
      // 🔑 Admin already exists → treat as login
      const adminUserId = adminRole.users[0]._id;
      user = await User.findById(adminUserId).select("+password");

      if (!user) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      user.last_login = new Date();
      await user.save();

      logger.info("✅ Admin login successful");
      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email_address,
          role: adminRole._id.toString(),
        },
        tokens: { accessToken, refreshToken },
        redirect: "/dashboard",
      });
    }

    // 🆕 No admin → create new one
    user = await User.create({
      email_address,
      password,
      name: "Administrator",
    });

    if (!adminRole) {
      adminRole = await Role.create({
        role_name: "admin",
        description: "System administrator with full access",
        users: [user._id],
      });
    } else {
      adminRole.users.push(user._id);
      await adminRole.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);

    logger.info("✅ Admin registered successfully");
    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email_address,
        role: adminRole._id.toString(),
      },
      tokens: { accessToken, refreshToken },
      redirect: "/admin/dashboard",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", err });
  }
};

// ♻️ Refresh token
const refreshAccessToken = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token required" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

// 🚪 Logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    global.blacklistedTokens = global.blacklistedTokens || new Set();
    global.blacklistedTokens.add(refreshToken);

    return res.json({
      success: true,
      message: "Logged out successfully. Tokens invalidated.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// 📊 get admin info
const getAdminInfo = async (req, res) => {
  try {
    const admin = await Role.findOne({ role_name: "admin" }).populate("users");
    return res.json({ success: true, admin });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  registerOrLoginAdmin,
  refreshAccessToken,
  logout,
  getAdminInfo,
};
