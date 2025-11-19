const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createSalon,
  getMySalon,
  updateSalon,
  deleteSalon,
  addAvailabilitySalons,
  getMyAvailabilitySalons,
  addHoliday,
  getSalonHolidays,
  editHoliday,
  deleteHoliday,
  addAmenitiesToSalon,
} = require("../../../controllers/salons.controller");
const upload = require("../../../middlewares/upload.middleware");

const {
  createStylist,
  updateStylist,
  getAllStylists,
  getStylistById,
  deleteStylist,
  getTimeSlots,
  getAvailableStylists
} = require("../../../controllers/stylists.controller");

router
  .route("/")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getMySalon)
  .post(authMiddleware(["merchant"]), upload.none(), createSalon)
  .patch(authMiddleware(["merchant"]), addAmenitiesToSalon);

router
  .route("/availability/operating-hours")
  .post(authMiddleware(["merchant"]), addAvailabilitySalons);

router.route("/availability/operating-hours/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), getMyAvailabilitySalons)

router
  .route("/availability/holidays")
  .post(authMiddleware(["merchant"]), addHoliday)
  .patch(authMiddleware(["merchant"]), editHoliday)
  .delete(authMiddleware(["merchant"]), deleteHoliday);

router.route("/availability/holidays/:id").get(authMiddleware(["merchant", "customer", "loctitian"]), getSalonHolidays)

router
  .route("/stylists/timeslots")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getTimeSlots);

router
  .route("/stylists")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getAllStylists)
  .post(authMiddleware(["merchant"]), upload.none(), createStylist)
  .patch(authMiddleware(["merchant"]), upload.none(), updateStylist);

router.route("/stylists/available").get(authMiddleware(["merchant", "customer", "loctitian"]), getAvailableStylists);

router
  .route("/stylists/:id")
  .get(authMiddleware(["merchant", "customer", "loctitian"]), getStylistById)
  .delete(authMiddleware(["merchant"]), deleteStylist);

router
  .route("/:id")
  .patch(authMiddleware(["merchant"]), upload.none(), updateSalon)
  .delete(authMiddleware(["merchant"]), deleteSalon);

module.exports = router;
