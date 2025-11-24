const express = require("express");
const { createAddress, getAllAddresses, editAddress, deleteAddress } = require('../../../controllers/address.controller');
const authMiddleware = require("../../../middlewares/auth.middleware");
const router = express.Router();

router.post("/address", authMiddleware(["merchant", "customer", "loctitian"]), createAddress)
router.get("/address", authMiddleware(["merchant", "customer", "loctitian"]), getAllAddresses)
router.patch("/address/:id", authMiddleware(["merchant", "customer", "loctitian"]), editAddress)
router.delete("/address/:id", authMiddleware(["merchant", "customer", "loctitian"]), deleteAddress)

module.exports = router;
