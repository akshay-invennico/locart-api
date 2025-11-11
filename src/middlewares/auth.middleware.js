const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const logger = require("../utils/logger");

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No token provided",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id);
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized - Invalid user" });
      }

      const roles = await Role.find({ users: user._id }).select(
        "_id role_id role_name description"
      );

      req.user = {
        id: user._id,
        name: user.name,
        email: user.email_address,
        roles,
      };
      if (
        allowedRoles.length > 0 &&
        !roles.some((role) =>
          allowedRoles
            .map((r) => r.toLowerCase())
            .includes(role.role_name.toLowerCase())
        )
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden - Insufficient role" });
      }

      next();
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized - Invalid token" });
    }
  };
};

module.exports = authMiddleware;
