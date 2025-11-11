const crypto = require("crypto");
const Order = require("../models/order.model");
const OrderItem = require("../models/order_item.model");
const Product = require("../models/product.model");
const Transaction = require("../models/transation.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const ShippingAddress = require("../models/shipping_address.model");
const ShippingZone = require("../models/shipping_zone.model");

const generateRandomPassword = () => {
  return crypto.randomBytes(6).toString("hex");
};

//@desc Create shop order
//@route POST /api/v1/ecom/orders
//@access Private
const createShopOrder = async (req, res) => {
  const session = await Order.startSession();
  session.startTransaction();

  try {
    const {
      customerType,
      customerId,
      customerDetails,
      products,
      payment,
      orderStatus,
    } = req.body;

    if (!products || products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No products in order" });
    }

    // 1️⃣ Handle customer
    let customer;
    let plainPassword = null;

    if (customerType === "existing") {
      customer = await User.findById(customerId).session(session);
      if (!customer) throw new Error("Customer not found");
    } else if (customerType === "new") {
      plainPassword = generateRandomPassword();

      customer = await User.create(
        [
          {
            name: customerDetails.name,
            email_address: customerDetails.email,
            password: plainPassword,
            phone_number: customerDetails.phone,
          },
        ],
        { session }
      );
      customer = customer[0];

      // Attach "customer" role
      let customerRole = await Role.findOne({ role_name: "customer" }).session(
        session
      );
      if (!customerRole) {
        customerRole = await Role.create(
          [
            {
              role_name: "customer",
              description: "General application customer",
              users: [customer._id],
            },
          ],
          { session }
        );
      } else {
        if (!customerRole.users.includes(customer._id)) {
          customerRole.users.push(customer._id);
          await customerRole.save({ session });
        }
      }
    } else {
      throw new Error("Invalid customerType");
    }

    // 2️⃣ Handle shipping address
    let shippingAddress = null;

    if (customerType === "new") {
      shippingAddress = await ShippingAddress.create(
        [
          {
            user_id: customer._id,
            address_type: "shipping",
            first_name:
              customerDetails.firstName || customerDetails.name.split(" ")[0],
            last_name:
              customerDetails?.lastName ||
              customerDetails.name.split(" ").slice(1).join(" "),
            address_line_1: customerDetails.addressLine1,
            address_line_2: customerDetails.addressLine2,
            city: customerDetails.city,
            state: customerDetails.state,
            country: customerDetails.country,
            postal_code: customerDetails.pin,
            phone_number: customerDetails.phone,
            is_default: true,
          },
        ],
        { session }
      );
      shippingAddress = shippingAddress[0]; // unwrap array
    } else if (customerType === "existing") {
      // ✅ Use existing default shipping address only
      shippingAddress = await ShippingAddress.findOne({
        user_id: customer._id,
        is_default: true,
      }).session(session);

      if (!shippingAddress) {
        throw new Error("No default shipping address found for this customer");
      }
    }

    // 3️⃣ Validate shipping zone (optional)
    const zone = await ShippingZone.findOne({
      countries: { $in: [customerDetails?.country] },
      states: { $in: [customerDetails?.state] },
      postal_codes: { $in: [customerDetails?.pin] },
      status: "active",
    }).session(session);

    // if (!zone) throw new Error("Shipping zone not supported");

    // 4️⃣ Create order
    const order = new Order({
      user_id: customer._id,
      order_number: "ORD-" + Date.now(),
      order_type: "product",
      subtotal: payment.totalAmount,
      total_amount: payment.totalAmount,
      currency: "INR",
      payment_status: payment.paymentStatus.toLowerCase(),
      order_status: orderStatus || "pending",
      shipping_address_id: shippingAddress._id,
    });
    await order.save({ session });

    // 5️⃣ Create order items
    let subtotal = 0;
    for (const item of products) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error("Product not found: " + item.productId);

      const totalPrice = product.unit_price * item.quantity;
      subtotal += totalPrice;

      const orderItem = new OrderItem({
        order_id: order._id,
        product_id: product._id,
        item_type: "product",
        item_name: product.product_name || product.name,
        item_sku: product.product_sku,
        quantity: item.quantity,
        unit_price: product.unit_price,
        total_price: totalPrice,
      });

      await orderItem.save({ session });

      // reduce stock
      product.stock_quantity -= item.quantity;
      await product.save({ session });
    }

    order.subtotal = subtotal;
    order.total_amount = payment.totalAmount;
    await order.save({ session });

    // 6️⃣ Save transaction
    let normalizedPaymentStatus = payment.paymentStatus.toLowerCase();
    if (normalizedPaymentStatus === "paid") {
      normalizedPaymentStatus = "captured";
    }

    const transaction = new Transaction({
      user_id: customer._id,
      order_id: order._id,
      transaction_type: "payment",
      payment_method: payment.paymentMethod.toLowerCase(),
      amount: payment.totalAmount,
      net_amount: payment.totalAmount,
      currency: "INR",
      transaction_status:
        normalizedPaymentStatus === "captured" ? "completed" : "pending",
      payment_status: normalizedPaymentStatus,
      processed_at: normalizedPaymentStatus === "captured" ? new Date() : null,
    });
    await transaction.save({ session });

    await session.commitTransaction();

    // ✅ Build response
    const responseData = {
      order_id: order._id,
      orderNumber: order.order_number,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email_address,
      },
      shippingAddress: shippingAddress,
      payment: {
        amount: payment.totalAmount,
        method: payment.paymentMethod,
        status: payment.paymentStatus,
      },
      status: order.order_status,
    };
    //todo : need to pass this to email service this cred
    if (plainPassword) {
      responseData.credentials = {
        email: customer.email_address,
        password: plainPassword,
      };
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: responseData,
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

//@desc Get orders for grid view
//@route GET /api/v1/ecom/orders
//@access Private
const getAllOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      sortBy = "created_at", // use correct field
      sortOrder = "desc",
      orderStatus,
      paymentStatus,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const allowedSortFields = ["created_at", "total_amount", "order_status", "payment_status"];
    if (!allowedSortFields.includes(sortBy)) sortBy = "created_at";

    const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const filter = {};

    // Filter by order status
    if (orderStatus) {
      const statuses = Array.isArray(orderStatus)
        ? orderStatus
        : orderStatus.split(",");
      filter.order_status = { $in: statuses };
    }

    // Filter by payment status
    if (paymentStatus) {
      const payments = Array.isArray(paymentStatus)
        ? paymentStatus
        : paymentStatus.split(",");
      filter.payment_status = { $in: payments.map((s) => s.toLowerCase()) };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) filter.created_at.$gte = new Date(dateFrom);
      if (dateTo) filter.created_at.$lte = new Date(dateTo);
    }

    // Filter by amount range
    if (amountMin || amountMax) {
      filter.total_amount = {};
      if (amountMin) filter.total_amount.$gte = Number(amountMin);
      if (amountMax) filter.total_amount.$lte = Number(amountMax);
    }

    const totalRecords = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user_id", "name")
      .lean();

    const data = await Promise.all(
      orders.map(async (order) => {
        const totalItems = await OrderItem.countDocuments({
          order_id: order._id,
        });

        const orderDate = new Date(order.created_at);
        const dayName = orderDate.toLocaleDateString("en-US", {
          weekday: "long",
        });

        return {
          id: order._id,
          order_id: order.order_number,
          date: order.created_at,
          day: dayName,
          customerName: order.user_id?.name || "Unknown",
          totalItems,
          amount: order.total_amount,
          paymentStatus:
            order.payment_status.charAt(0).toUpperCase() +
            order.payment_status.slice(1),
          orderStatus:
            order.order_status.charAt(0).toUpperCase() +
            order.order_status.slice(1),
          pickupType: order.pickup_type || "delivery", 
          flagged: order.flagged || false,
          flaggedReason: order.flaggedReason || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalRecords,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


//@desc Get order details by ID
//@route GET /api/v1/ecom/orders/:id
//@access Private
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Get order
    const order = await Order.findById(id).lean();
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // 2️⃣ Get transaction
    const transaction = await Transaction.findOne({
      order_id: order._id,
    }).lean();
    // 3️⃣ Get order items
    const orderItems = await OrderItem.find({ order_id: order._id }).lean();
    const products = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product_id).lean();
        return {
          productId: item.product_id,
          productName: item.item_name || product?.product_name || "Unknown",
          imageUrl: product?.image_url || product?.product_icon || null,
          quantity: item.quantity,
          price: item.unit_price,
          subtotal: item.total_price,
        };
      })
    );

    // 4️⃣ Get shipping address
    const shippingAddress = order.shipping_address_id
      ? await ShippingAddress.findById(order.shipping_address_id).lean()
      : null;

    // 6️⃣ Prepare invoice
    const invoice = {
      invoiceId: order.order_number,
      itemTotal: order.subtotal,
      taxes: order.tax_amount || 0,
      loyaltyDiscount: order.locart_coins_value || 0,
      totalPayable: order.total_amount,
    };

    // 7️⃣ Build response
    const responseData = {
      order_id: order.order_number,
      transactionId: transaction?._id || null,
      date: order.created_at,
      paymentMethod: transaction?.payment_method || null,
      status: order.order_status,
      totalAmount: order.total_amount,
      products,
      shippingAddress,
      shippingDetails: null,
      invoice,
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

//@desc  update order status
//@route PATCH /api/v1/ecom/orders/:id
//@access Private
const updateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderIds must be a non-empty array",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    // Update orders by order_number (since your example uses "ORD1023...")
    const orders = await Order.updateMany(
      { order_number: { $in: orderIds } },
      {
        $set: {
          order_status: status,
          updated_at: new Date(),
        },
      }
    );

    if (orders.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found with given IDs",
      });
    }

    // Build response array
    const responseData = orderIds.map((id) => ({
      order_id: id,
      status,
    }));

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//@desc flag order
//@route PATCH /api/v1/ecom/orders/flag
//@access Private
const flagOrder = async (req, res) => {
  try {
    const { orderIds, reason } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderIds must be a non-empty array",
      });
    }

    const flaggedReason = [reason].filter(Boolean).join(" - ");

    // Bulk update
    const result = await Order.updateMany(
      { order_number: { $in: orderIds } },
      {
        $set: {
          flagged: true,
          flagged_at: new Date(),
          flagged_by: req.user?._id,
          flagged_reason: flaggedReason || null,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found with given IDs",
      });
    }

    // Build response data
    const responseData = orderIds.map((id) => ({
      order_id: id,
      flagged: true,
      reason: flaggedReason || null,
    }));

    return res.status(200).json({
      success: true,
      message: "Order(s) flagged successfully",
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createShopOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  flagOrder,
};
