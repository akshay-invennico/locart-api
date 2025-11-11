const Role = require("../models/role.model");

/**
 * @desc    Create a new role
 * @route   POST /api/roles
 * @access  Admin
 */

const createRole = async (req, res) => {
  try {
    const { role_name, guard_name, description } = req.body;

    // ✅ Check if role already exists
    const existingRole = await Role.findOne({ role_name });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    // ✅ Create role
    const role = new Role({
      role_name,
      guard_name: guard_name || null,
      description: description || "",
    });

    await role.save();

    res.status(201).json({
      message: "Role created successfully",
      role,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc    Create a new role
 * @route   GET /api/roles
 * @access  Admin
 */

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().select("-users");;

    res.status(200).json(roles);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc    Get Only Active Roles
 * @route   GET /api/roles
 * @access  Admin
 */

const getActiveRoles = async (req, res) => {
  try {
    const roles = await Role.find({ deleted_at: null }).select("-users");

    res.status(200).json(roles);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc    Update role by ID
 * @route   PUT /api/roles/:id
 * @access  Admin
 */

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name, guard_name, description } = req.body;

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { role_name, guard_name, description },
      { new: true, runValidators: true }
    ).select("-users");

    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({
      message: "Role updated successfully",
      role: updatedRole,
    });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc    Delete role by ID (soft delete using deleted_at)
 * @route   DELETE /api/roles/:id
 * @access  Admin
 */

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRole = await Role.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    ).select("-users");

    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({
      message: "Role deleted (soft) successfully",
      role: deletedRole,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📦 Export is written in this way for proper understanding of code
module.exports = {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
  getActiveRoles,
};
