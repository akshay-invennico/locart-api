const express = require("express");
const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../../../controllers/service.controller");
const upload = require("../../../middlewares/upload.middleware");
const authMiddleware = require("../../../middlewares/auth.middleware");
const router = express.Router();

router.get("/:id", getServiceById);
router.patch("/:id", authMiddleware(["merchant"]), upload.none(), updateService);
router.delete("/:id", authMiddleware(["merchant"]), deleteService);

router.get("/", getServices);
router.post("/", authMiddleware(["merchant"]), upload.none(), createService);


module.exports = router;
