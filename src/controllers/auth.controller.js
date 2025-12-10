const Role = require("../models/role.model");
const User = require("../models/user.model");
const Merchant = require("../models/merchant.model");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { generateTokens } = require("../services/auth.service");
const PasswordResetToken = require("../models/password_reset.model");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { passwordResetTemplate } = require("../emailtemaplate/reset_password");
const { generateOtp } = require("../utils/otp");
const Notification = require('../models/notification.model')

// 🏪 Register Merchant
const registerMerchant = async (req, res) => {
  try {
    const { merchantName, businessName, email, phone, dialing_code, password } = req.body;

    let merchantRole = await Role.findOne({ role_name: "merchant" }).populate(
      "users"
    );
    if (merchantRole && merchantRole.users.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Merchant account already exists",
      });
    }

    const user = await User.create({
      name: merchantName,
      email_address: email,
      password,
      dialing_code: dialing_code || null,
      phone_number: phone || null,
      isVerified: true,
    });

    const merchant = await Merchant.create({
      user_id: user._id,
      business_name: businessName,
      business_type: "salon",
      status: "active",
    });

    if (!merchantRole) {
      merchantRole = await Role.create({
        role_name: "merchant",
        description: "Merchant account with business access",
        users: [user._id],
      });
    } else {
      merchantRole.users.push(user._id);
      await merchantRole.save();
    }

    let adminRole = await Role.findOne({ role_name: "admin" });
    if (!adminRole) {
      adminRole = await Role.create({
        role_name: "admin",
        description: "System administrator with full access",
        users: [user._id],
      });
    } else if (!adminRole.users.includes(user._id)) {
      adminRole.users.push(user._id);
      await adminRole.save();
    }

    const roles = await Role.find({
      _id: { $in: [merchantRole._id, adminRole._id] },
    }).select("_id role_id role_name description");

    const { accessToken, refreshToken } = generateTokens(user);

    logger.info("✅ Merchant registered successfully with multiple roles");
    return res.status(201).json({
      success: true,
      message: "Merchant registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email_address,
        profile: user.profile_picture || null,
        roles,
      },
      merchant: {
        id: merchant._id,
        business_name: merchant.business_name,
        verification_status: merchant.verification_status,
      },
      tokens: { accessToken, refreshToken },
      redirect: "/dashboard",
    });
  } catch (err) {
    logger.error("❌ Failed to register merchant", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const { fullName, gender, dateOfBirth, dialingCode, phone, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email_address: email });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    if (existingUser && !existingUser.isVerified) {
      const otp = generateOtp();
      existingUser.otp = otp;
      existingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await existingUser.save();

      await sendEmail({
        to: email,
        subject: "Verify your email - OTP",
        text: `Your verification code is ${otp}`,
      });

      return res.status(200).json({
        success: true,
        message: "OTP resent to your email",
      });
    }

    const otp = generateOtp();

    const user = await User.create({
      name: fullName,
      email_address: email,
      password,
      dialingCode: dialingCode,
      phone_number: phone || null,
      gender: gender || "other",
      date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
      otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      isVerified: false,
    });

    let customerRole = await Role.findOne({ role_name: "customer" });
    if (!customerRole) {
      customerRole = await Role.create({
        role_name: "customer",
        description: "Regular customer user",
        users: [user._id],
      });
    } else {
      customerRole.users.push(user._id);
      await customerRole.save();
    }

    await Role.find({
      _id: { $in: [customerRole._id] },
    }).select("_id role_name description");

    await Notification.create({
      user_id: null,
      recipient_type: "admin",
      title: "New Client Registered",
      message: `${user.name} (${user.email_address}) just signed up.`,
      type: "general"
    });

    await sendEmail({
      to: email,
      subject: "Verify your email - OTP",
      text: `Your verification code is ${otp}`,
    });

    return res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email_address: email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already verified",
      });
    }

    if (!user.otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (user.otp !== Number(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    let userRole = await Role.findOne({ role_name: "customer" });
    if (!userRole) {
      userRole = await Role.create({
        role_name: "customer",
        description: "customer",
        users: [user._id],
      });
    } else {
      userRole.users.push(user._id);
      await userRole.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email_address,
        phone: user.phone_number,
        gender: user.gender,
        date_of_birth: user.date_of_birth,
        profile: user.profile_picture || null,
        roles: [{ _id: userRole._id, role_name: userRole.role_name }],
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email_address: email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already verified",
      });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    await sendEmail({
      to: email,
      subject: "Resend OTP - Verify your email",
      text: `Your new verification code is ${otp}`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP resent to your email.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};


// 🏪 Login Any user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find User (include password explicitly)
    const user = await User.findOne({ email_address: email }).select(
      "+password"
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "User is not verified",
      });
    }

    if (user.status === "inactive") {
      return res.status(401).json({
        success: false,
        message: "Account has been deleted",
      });
    }

    // 3. Validate password using model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Fetch all roles for this user
    const roles = await Role.find({ users: user._id }).select(
      "_id role_id role_name description"
    );

    // 5. Update last login
    user.last_login = new Date();
    await user.save();

    // 6. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user);

    logger.info(`✅ User logged in successfully: ${user.email_address}`);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email_address,
        profile: user.profile_picture || null,
        roles,
      },
      tokens: { accessToken, refreshToken },
      redirect: "/dashboard",
    });
  } catch (err) {
    logger.error("❌ Failed to login user", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// 🏪 My Details
const myDetails = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user found",
      });
    }

    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.profile_picture = user.profile_picture || null;

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// 🏪 Reset Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email_address: email, status: "active" });

    if (!user) {
      return res.json({
        success: true,
        message: "If this email is registered, a reset link has been sent.",
      });
    }

    await PasswordResetToken.updateMany({ userId: user._id }, { used: true });

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL}auth?token=${resetToken}`;

    await sendEmail({
      to: user.email_address,
      subject: "Reset Password",
      text: "Reset your password",
      html: passwordResetTemplate({ name: user.name, resetLink }),
    });
    return res.json({
      success: true,
      message: "Password reset link sent to your email.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const forgotPasswordMobile = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email_address: email, status: "active" });

    if (!user) {
      return res.json({ success: true, message: "User not registered" });
    }

    const otp = generateOtp();

    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await sendEmail({
      to: user.email_address,
      subject: "Reset Password OTP",
      text: "Reset your password",
      html: `<p>Your OTP is <b>${otp}</b></p>`
    });

    return res.json({
      success: true,
      message: "OTP sent to your email"
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const verifyOtpMobile = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email_address: email });

    if (!user || !user.otp || user.otp !== Number(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    return res.json({ success: true, message: "OTP verified" });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

const resetPasswordMobile = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({ email_address: email }).select("+password");

    if (!user || user.otp !== Number(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    user.password = password;

    user.otp = null;
    user.otpExpiresAt = null;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// 🏪 Verify Reset Token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const resetToken = await PasswordResetToken.findOne({ token, used: false });

    if (!resetToken || resetToken.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or expired.",
      });
    }

    const user = await User.findById(resetToken.userId);

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email_address.replace(/(.{3}).+(@.+)/, "$1***$2"), // mask
      },
      message: "Token is valid.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// 🏪 Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|:;"'<>,.?/~`]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password too weak. Include upper, lower, number & symbol",
      });
    }

    const resetToken = await PasswordResetToken.findOne({ token, used: false });
    if (!resetToken || resetToken.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or expired.",
      });
    }

    const user = await User.findById(resetToken.userId).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.password = password;
    await user.save();

    resetToken.used = true;
    await resetToken.save();

    return res.json({
      success: true,
      message:
        "Password updated successfully. Please log in with your new password.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  registerMerchant,
  loginUser,
  myDetails,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  registerUser,
  verifyOtp,
  resendOtp,
  forgotPasswordMobile,
  verifyOtpMobile,
  resetPasswordMobile
};
