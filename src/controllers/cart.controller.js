const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Service = require("../models/service.model");

const createCart = async (req, res) => {
  try {
    const { item_type, product_id, service_id, quantity } = req.body;
    const user_id = req.user.id;

    let price = 0;
    let duration = null;

    if (item_type === "product") {
      const product = await Product.findById(product_id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      price = parseFloat(product.unit_price);
    }

    if (item_type === "service") {
      const service = await Service.findById(service_id);
      if (!service) return res.status(404).json({ message: "Service not found" });

      price = parseFloat(service.base_price);
      duration = service.duration;

      const exists = await Cart.findOne({ user_id, item_type: "service", service_id });
      if (exists) {
        return res.status(400).json({ message: "Service already added to cart" });
      }
    }

    const cartItem = await Cart.create({
      user_id,
      item_type,
      product_id: item_type === "product" ? product_id : null,
      service_id: item_type === "service" ? service_id : null,
      quantity: item_type === "product" ? quantity : 1,
      price_at_time: price,
      total_price: price * (quantity ?? 1),
      duration,
    });

    res.json({ success: true, message: "Added to cart", data: cartItem });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    const items = await Cart.find({ user_id })
      .populate("product_id", "name images unit_price")
      .populate("service_id", "name duration price")

    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);

    res.json({
      success: true,
      items,
      subtotal,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    await Cart.deleteOne({ _id: req.params.id, user_id });

    res.json({ success: true, message: "Item removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createCart,
  getCart,
  deleteCart
};