const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createAmenity,
  getAmenities,
  updateAmenity,
  deleteAmenity,
  getAmenityById,
} = require("../../../controllers/amenities.controller");

router
  .route("/")
  .post(authMiddleware(["merchant"]), createAmenity)
  .get(authMiddleware(["merchant"]), getAmenities)
  .patch(authMiddleware(["merchant"]), updateAmenity)
  .delete(authMiddleware(["merchant"]), deleteAmenity);

router.route("/:id").get(authMiddleware(["merchant"]), getAmenityById);

module.exports = router;
