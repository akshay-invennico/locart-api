const ShippingAddress = require("../models/shipping_address.model");

const createAddress = async (req, res) => {
  try {
    const address = await ShippingAddress.create({
      ...req.body,
      user_id: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: address
    });
    
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllAddresses = async (req, res) => {
  try {
    const addresses = await ShippingAddress.find({ user_id: req.user.id });

    res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      data: addresses
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const editAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await ShippingAddress.findOne({
      _id: id,
      user_id: req.user.id,
      deleted_at: null
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    Object.assign(address, req.body);
    await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await ShippingAddress.findOne({
      _id: id,
      user_id: req.user.id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await ShippingAddress.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createAddress,
  getAllAddresses,
  editAddress,
  deleteAddress
}
