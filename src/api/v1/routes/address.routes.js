const express = require("express");
const { createAddress, getAllAddresses } = require('../../../controllers/address.controller');
const authMiddleware = require("../../../middlewares/auth.middleware");
const router = express.Router();

router.post("/address", authMiddleware(["merchant", "customer", "loctitian"]), createAddress)
router.get("/address", authMiddleware(["merchant", "customer", "loctitian"]), getAllAddresses)

module.exports = router;
