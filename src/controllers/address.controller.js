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


module.exports = {
  createAddress,
  getAllAddresses
}
