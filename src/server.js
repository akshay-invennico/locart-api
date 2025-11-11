const app = require("./app");
const config = require("./config");
const connectDB = require("./db");
const logger = require("./utils/logger");

const PORT = config.port;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running 🏃 on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("❌ Failed to start server", err);
    process.exit(1);
  }
})();
