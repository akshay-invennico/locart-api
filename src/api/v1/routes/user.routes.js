const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  editUserProfile,
  deleteProfilePhoto,
  changePassword,
  deleteAccount,
} = require("../../../controllers/user.controller");
const upload = require("../../../middlewares/uploadMiddleware");

router.put("/profile", authMiddleware(["merchant", "customer", "loctitian"]), upload.uploadSingle('profile_photo'), editUserProfile);
router.delete("/profile/remove", authMiddleware(["merchant", "customer", "loctitian"]), deleteProfilePhoto);
router.put("/password/change", authMiddleware(["merchant", "customer", "loctitian"]), changePassword);
router.delete("/delete/account", authMiddleware(["merchant", "customer", "loctitian"]), deleteAccount);

module.exports = router;
