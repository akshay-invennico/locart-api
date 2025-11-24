const express = require("express");
const router = express.Router();

const authMiddleware = require("../../../middlewares/auth.middleware");
const { uploadMultiple } = require("../../../middlewares/uploadMiddleware");
const { createAlbum, getAlbumById, getAllAlbums } = require("../../../controllers/album.controller");

router.post(
  "/",
  authMiddleware(["merchant", "loctitian"]),
  uploadMultiple("photos", 20),
  createAlbum
);

router.get("/", authMiddleware(["merchant", "loctitian"]), getAllAlbums)
router.get("/:id", authMiddleware(["merchant", "loctitian"]), getAlbumById)

module.exports = router;
