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

router.get("/:id", authMiddleware(["merchant", "customer", "loctitian"]), getServiceById);
router.patch("/:id", authMiddleware(["merchant"]), upload.none(), updateService);
router.delete("/:id", authMiddleware(["merchant"]), deleteService);

router.get("/", authMiddleware(["merchant", "customer", "loctitian"]), getServices);
router.post("/", authMiddleware(["merchant"]), upload.none(), createService);


module.exports = router;
