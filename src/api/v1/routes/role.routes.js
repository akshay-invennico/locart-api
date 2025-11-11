const express = require("express");
const {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
  getActiveRoles,
} = require("../../../controllers/role.controller");

const router = express.Router();

router.route("/").post(createRole).get(getAllRoles);
router.route("/active").get(getActiveRoles);

router.route("/:id").patch(updateRole).delete(deleteRole);

module.exports = router;
