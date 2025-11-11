const app = require("./app");
const connectDB = require("./db");

module.exports = async (req, res) => {
  try {
    if (!global._mongoConnected) {
      await connectDB();
      global._mongoConnected = true;
    }

    return app(req, res);
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
