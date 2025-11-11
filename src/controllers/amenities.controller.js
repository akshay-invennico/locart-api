const Amenities = require("../models/amenities.model"); // adjust path if needed

// @desc Create Amenity
// @route POST /api/v1/amenities
// @access merchant
const createAmenity = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const amenity = new Amenities({
      name,
      description,
      status,
    });

    await amenity.save();

    res.status(201).json({
      success: true,
      message: "Amenity created successfully",
      data: amenity,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Get All Amenities (excluding soft deleted)
// @route GET /api/v1/amenities
// @access merchant
const getAmenities = async (req, res) => {
  try {
    const amenities = await Amenities.find({ deleted_at: null });

    res.status(200).json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Get Single Amenity
// @route GET /api/v1/amenities/:id
// @access merchant
const getAmenityById = async (req, res) => {
  try {
    const amenity = await Amenities.findOne({
      _id: req.params.id,
      deleted_at: null,
    });

    if (!amenity) {
      return res
        .status(404)
        .json({ success: false, message: "Amenity not found" });
    }

    res.status(200).json({ success: true, data: amenity });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Update Amenity
// @route PATCH /api/v1/amenities/?id=<id>
// @access merchant
const updateAmenity = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const amenity = await Amenities.findOneAndUpdate(
      { _id: req.query.id, deleted_at: null },
      { name, description, status },
      { new: true }
    );

    if (!amenity) {
      return res
        .status(404)
        .json({ success: false, message: "Amenity not found" });
    }

    res.status(200).json({
      success: true,
      message: "Amenity updated successfully",
      data: amenity,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc Delete Amenity
// @route DELETE /api/v1/amenities/?id=<id>
// @access merchant
const deleteAmenity = async (req, res) => {
  try {
    const amenity = await Amenities.findOneAndUpdate(
      { _id: req.query.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!amenity) {
      return res
        .status(404)
        .json({ success: false, message: "Amenity not found" });
    }

    res.status(200).json({
      success: true,
      message: "Amenity deleted successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  createAmenity,
  getAmenities,
  getAmenityById,
  updateAmenity,
  deleteAmenity,
};
