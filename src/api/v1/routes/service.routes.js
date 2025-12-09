const express = require("express");
const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../../../controllers/service.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");
const router = express.Router();

router.get("/:id", authMiddleware(["merchant", "customer", "loctitian"]), getServiceById);
router.patch("/:id", authMiddleware(["merchant"]), uploadSingle("icon"), updateService);
router.delete("/:id", authMiddleware(["merchant"]), deleteService);

router.get("/", authMiddleware(["merchant", "customer", "loctitian"]), getServices);
router.post("/", authMiddleware(["merchant"]), uploadSingle("icon"), createService);


module.exports = router;
