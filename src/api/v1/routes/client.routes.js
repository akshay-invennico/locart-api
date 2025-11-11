const express = require("express");
const {
  getClientOverview,
  getClientBookings,
  getClientOrders,
  getClients,
  archiveClient,
  suspendClient,
  reactivateClient,
  sendResetPasswordLinkToClient,
  getExistingClients
} = require("../../../controllers/client.controller");
const authMiddleware = require("../../../middlewares/auth.middleware");
const router = express.Router();

router.get("/", authMiddleware(["merchant"]), getClients);
router.patch("/archive", authMiddleware(["merchant"]), archiveClient);
router.patch("/suspend", authMiddleware(["merchant"]), suspendClient)

router.get(
  "/existings",
  authMiddleware(["merchant"]),
  getExistingClients
);

router.get(
  "/:clientId/overview",
  authMiddleware(["merchant"]),
  getClientOverview
);

router.get(
  "/:clientId/bookings",
  authMiddleware(["merchant"]),
  getClientBookings
);

router.get("/:clientId/orders", authMiddleware(["merchant"]), getClientOrders);
router.put('/:clientId/reactivate', authMiddleware(["merchant"]), reactivateClient)
router.post("/:clientId/reset-password-link", authMiddleware(["merchant"]), sendResetPasswordLinkToClient);


module.exports = router;
