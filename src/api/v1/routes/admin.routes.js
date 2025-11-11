const express = require("express");
const {
  registerOrLoginAdmin,
  refreshAccessToken,
  logout,
  getAdminInfo,
} = require("../../../controllers/admin.controller");
const router = express.Router();

router.post("/register", registerOrLoginAdmin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", getAdminInfo);

module.exports = router;
