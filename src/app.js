const express = require("express");
require("express-async-errors");
const helmet = require("helmet");
const { swaggerUi, swaggerDocument } = require("./swagger");

// 🛡️ Security middlewares
const errorMiddleware = require("./middlewares/error.middleware");
const loggingMiddleware = require("./middlewares/loggingMiddleware");
const logger = require("./utils/logger");
const rateLimiter = require("./middlewares/rateLimiter");
const cors = require('cors');

// 🚏 Routes Imports
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

// 🏃 App initialization
const app = express();

// Security middlewares
app.use(helmet());

// webhook 
app.use("/api/v1/payments", require("./api/v1/routes/payment.routes"));

app.use(express.json());
app.use("/api", rateLimiter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000", "https://locart-backend.vercel.app", "https://locart-api.onrender.com"],
  credentials: true,
}));


// Custom logging (instead of morgan)
app.use(loggingMiddleware);

// Routes
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
app.use("/api/v1/user", userRoute)

app.get("/", (req, res) => {
  logger.info("⛑️ Health check endpoint hit for Locart API");
  res.json({ status: "ok" });
});

// Error handler (last)
app.use(errorMiddleware);

module.exports = app;
