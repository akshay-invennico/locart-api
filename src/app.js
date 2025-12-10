const express = require("express");
require("express-async-errors");
const helmet = require("helmet");
const { swaggerUi, swaggerDocument } = require("./swagger");

// security middlewares
const errorMiddleware = require("./middlewares/error.middleware");
const loggingMiddleware = require("./middlewares/loggingMiddleware");
const logger = require("./utils/logger");
const cors = require('cors');

// routes
const roleRoutes = require("./api/v1/routes/role.routes");
const adminRoutes = require("./api/v1/routes/admin.routes");
const authRoutes = require("./api/v1/routes/auth.routes");
const salonsRoutes = require("./api/v1/routes/salons.routes");
const serviceRoutes = require("./api/v1/routes/service.routes");
const amenitiesRoutes = require("./api/v1/routes/amenities.routes");
const productCategoryRoutes = require("./api/v1/routes/category.routes");
const productRoutes = require("./api/v1/routes/product.routes");
const orderRoutes = require("./api/v1/routes/order.routes");
const appointmentRoute = require("./api/v1/routes/appointment.routes");
const dashboardRoute = require("./api/v1/routes/dashboard.routes");
const clientRoute = require("./api/v1/routes/client.routes");
const userRoute = require("./api/v1/routes/user.routes")
const addressRoute = require("./api/v1/routes/address.routes")
const cartRoute = require("./api/v1/routes/cart.routes")
const reviewRoute = require("./api/v1/routes/review.routes")
const ticketRoute = require("./api/v1/routes/ticket.routes")
const albumRoute = require("./api/v1/routes/album.routes")
const notificationRoute = require("./api/v1/routes/notification.routes");

const app = express();
app.use(helmet());

// webhook
app.use("/api/v1/payments", require("./api/v1/routes/payment.routes"));

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000", "https://locart.vercel.app"],
  credentials: true,
}));
app.use(loggingMiddleware);

// routes
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/store", salonsRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/amenities", amenitiesRoutes);
app.use("/api/v1/ecom", productCategoryRoutes, productRoutes, orderRoutes, addressRoute);
app.use("/api/v1/appointment", appointmentRoute);
app.use("/api/v1/dashboard", dashboardRoute);
app.use("/api/v1/client", clientRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/review", reviewRoute);
app.use("/api/v1/support", ticketRoute);
app.use("/api/v1/album", albumRoute);
app.use("/api/v1/notification", notificationRoute)

app.get("/", (req, res) => {
  logger.info("Locart server is up and running");
  res.json({ status: "ok" });
});

app.use(errorMiddleware);
module.exports = app;
