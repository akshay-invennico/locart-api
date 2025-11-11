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

router
  .route("/")
  .post(authMiddleware(["merchant"]), upload.none(), createService)
  .get(getServices);

router
  .route("/:id")
  .get(authMiddleware(["merchant"]), getServiceById)
  .patch(authMiddleware(["merchant"]), upload.none(), updateService)
  .delete(authMiddleware(["merchant"]), deleteService);

module.exports = router;
