const express = require("express");
const router = express.Router();
const { uploadMultiple } = require("../../../middlewares/uploadMiddleware");
const {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicketStatus,
} = require("../../../controllers/ticket.controller");

const authMiddleware = require("../../../middlewares/auth.middleware");

router.post(
  "/",
  authMiddleware(["customer", "merchant", "loctitian"]),
  uploadMultiple("support", 3),
  createTicket
);

router.get(
  "/my-tickets",
  authMiddleware(["customer", "merchant", "loctitian"]),
  getMyTickets
);

router.get(
  "/:id",
  authMiddleware(["customer", "merchant", "loctitian", "admin"]),
  getTicketById
);

router.put(
  "/status/:id",
  authMiddleware(["merchant", "admin"]),
  updateTicketStatus
);

module.exports = router;
