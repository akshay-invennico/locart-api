const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middlewares/auth.middleware");
const {
  createSalon,
  getMySalon,
  getMySingleSalon,
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

// * this routes are places in specific position as java script read the code line by line as it is synchronous

router
  .route("/")
  .post(authMiddleware(["merchant"]), upload.none(), createSalon)
  .get(authMiddleware(["merchant"]), getMySalon)
  .patch(authMiddleware(["merchant"]), addAmenitiesToSalon);

router
  .route("/availability/operating-hours")
  .get(authMiddleware(["merchant"]), getMyAvailabilitySalons)
  .post(authMiddleware(["merchant"]), addAvailabilitySalons);

router
  .route("/availability/holidays")
  .post(authMiddleware(["merchant"]), addHoliday)
  .get(authMiddleware(["merchant"]), getSalonHolidays)
  .patch(authMiddleware(["merchant"]), editHoliday)
  .delete(authMiddleware(["merchant"]), deleteHoliday);

router
  .route("/stylists/timeslots")
  .get(authMiddleware(["merchant"]), getTimeSlots);

router
  .route("/stylists")
  .get(authMiddleware(["merchant"]), getAllStylists)
  .post(authMiddleware(["merchant"]), upload.none(), createStylist)
  .patch(authMiddleware(["merchant"]), upload.none(), updateStylist);

router.route("/stylists/available").get(authMiddleware([]), getAvailableStylists);

router
  .route("/stylists/:id")
  .get(authMiddleware(["merchant"]), getStylistById)
  .delete(authMiddleware(["merchant"]), deleteStylist);

router
  .route("/:id")
  .get(authMiddleware(["merchant"]), getMySingleSalon)
  .patch(authMiddleware(["merchant"]), upload.none(), updateSalon)
  .delete(authMiddleware(["merchant"]), deleteSalon);

module.exports = router;
