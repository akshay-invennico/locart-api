const express = require("express");
const {
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
  resetPasswordMobile,
} = require("../../../controllers/auth.controller");

const {
  refreshAccessToken,
  logout,
} = require("../../../controllers/admin.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");

const router = express.Router();

// This can be used to register @only merchant
router.post("/register", registerMerchant);
router.post("/register/user", registerUser)

// This can be used to login admin/merchant/stylish
router.post("/login", loginUser);
router.get("/me", authMiddleware(), myDetails);

// This two can be used by any user it will be same for all
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/verify/otp", verifyOtp)
router.post("/otp/resend", resendOtp)
router.post("/reset-password", resetPassword);

// reset password routes for mobile
router.post("/forgot/password/mobile", forgotPasswordMobile);
router.post("/verify/otp/mobile", verifyOtpMobile);
router.post("/reset/password/mobile", resetPasswordMobile);

module.exports = router;
