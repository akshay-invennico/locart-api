const express = require("express");
const router = express.Router();
const stripe = require('../../../utils/stripe')
const Order = require('../../../models/order.model')

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // payment success
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        await Order.findByIdAndUpdate(orderId, {
          payment_status: "paid",
          order_status: "confirmed",
          stripe_payment_intent_id: paymentIntent.id,
        });

        console.log("Order marked as Paid:", orderId);
      }

      // payment fails 
      if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;

        await Order.findByIdAndUpdate(orderId, {
          payment_status: "failed",
          order_status: "cancelled",
        });

        console.log("Order Failed:", orderId);
      }

      res.json({ received: true });
    } catch (err) {
      console.log(err);
      res.status(500).send("Webhook handler error");
    }
  }
);

module.exports = router;
