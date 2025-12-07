const mongoose = require("mongoose");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Order = require("../models/order.model");
const OrderItem = require("../models/order_item.model");
const Role = require("../models/role.model");
const PasswordResetToken = require("../models/password_reset.model");
const sendEmail = require("../utils/sendEmail");
const { passwordResetTemplate } = require("../emailtemaplate/reset_password");
const crypto = require("crypto");

// @desc get all clients
// @route GET /api/v1/client
// @access Private
const getClients = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      status,
      joinedFrom,
      joinedTo,
      minSpent,
      maxSpent,
      sortBy = "joinedOn",
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // ✅ Get customer role users
    const customerRole = await Role.findOne({ role_name: "customer" });
    if (!customerRole) {
      return res.json({
        success: true,
        meta: { currentPage: 1, totalPages: 0, totalClients: 0 },
        clients: [],
      });
    }

    const filter = { _id: { $in: customerRole.users }, deleted_at: null };

    // ✅ Search (name, email, phone)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email_address: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Status
    if (status) filter.status = status;

    // ✅ Joined date range
    if (joinedFrom || joinedTo) {
      filter.created_at = {};
      if (joinedFrom) filter.created_at.$gte = new Date(joinedFrom);
      if (joinedTo) filter.created_at.$lte = new Date(joinedTo);
    }

    // ✅ Fetch total clients count
    const totalClients = await User.countDocuments(filter);

    // ✅ Pagination & sort
    const sortMap = {
      name: "name",
      joinedOn: "created_at",
      totalSpent: "totalSpent",
      loyaltyPoints: "loyaltyPoints",
    };
    const sortField = sortMap[sortBy] || "created_at";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // ✅ Fetch clients
    const clients = await User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const clientIds = clients.map((c) => c._id);

    // ✅ Aggregate orders & bookings
    const orders = await Order.aggregate([
      { $match: { user_id: { $in: clientIds }, deleted_at: null } },
      {
        $group: {
          _id: "$user_id",
          productOrders: { $sum: 1 },
          totalSpent: { $sum: "$total_amount" },
        },
      },
    ]);

    const bookings = await Booking.aggregate([
      { $match: { user_id: { $in: clientIds }, deleted_at: null } },
      {
        $group: {
          _id: "$user_id",
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    // Map stats
    const orderMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});
    const bookingMap = bookings.reduce((acc, b) => {
      acc[b._id.toString()] = b;
      return acc;
    }, {});

    // ✅ Format response
    const formatted = clients.map((c) => {
      const orderStats = orderMap[c._id.toString()] || {};
      const bookingStats = bookingMap[c._id.toString()] || {};

      return {
        id: c._id,
        avatar: c.profile_picture || null,
        name: c.name,
        email: c.email_address,
        phone: c.phone_number,
        joinedOn: c.created_at,
        totalBookings: bookingStats.totalBookings || 0,
        productOrders: orderStats.productOrders || 0,
        totalSpent: orderStats.totalSpent || 0,
        loyaltyPoints: 0,
        status: c.status,
      };
    });

    // ✅ Filter by minSpent & maxSpent after aggregation
    const spentFiltered = formatted.filter((f) => {
      if (minSpent && f.totalSpent < minSpent) return false;
      if (maxSpent && f.totalSpent > maxSpent) return false;
      return true;
    });

    return res.json({
      success: true,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalClients / limit),
        totalClients,
      },
      clients: spentFiltered,
    });
  } catch (err) {
    console.error("Error fetching clients:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching clients" });
  }
};

// @desc suspend/archive client
// @route PUT /api/v1/client/:clientId/suspend
// @access Private
const archiveClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { client_ids, reason } = req.body;

    if (!client_ids || (Array.isArray(client_ids) && client_ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clientId",
      });
    }
    if (!Array.isArray(client_ids)) {
      client_ids = [client_ids];
    }

    const invalidIds = client_ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid client IDs provided",
        invalid_ids: invalidIds,
      });
    }

    const clients = await User.find({
      _id: { $in: client_ids },
      deleted_at: null,
    });

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const archivedClients = [];
    for (const client of clients) {
      client.status = "archived";
      client.archive_reason = reason || "Archived by admin";
      client.updated_at = new Date();

      await client.save({ session });

      archivedClients.push({
        _id: client._id,
        name: client.name,
        email: client.email_address,
        phone: client.phone_number,
        status: client.status,
        archive_reason: client.archive_reason,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Client archived successfully.",
      data: archivedClients,
      skipped: client_ids.filter(
        (id) => !clients.some((c) => c._id.toString() === id.toString())
      ),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error archiving client:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while archiving client",
      error: error.message,
    });
  }
};
// @desc Get client overview
// @route GET /api/v1/client/:clientId/overview
// @access Private
const getClientOverview = async (req, res) => {
  try {
    const clientId = req.params.clientId;

    // 🔍 Fetch client
    const client = await User.findById(clientId).lean();
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    // 1️⃣ Count total bookings
    const totalBookings = await Booking.countDocuments({
      user_id: client._id,
      deleted_at: null,
    });

    // 2️⃣ Count product orders
    const productOrders = await Order.countDocuments({
      user_id: client._id,
      order_type: "product",
      deleted_at: null,
    });

    // 3️⃣ Total spent = sum of all delivered/completed orders
    const spentAgg = await Order.aggregate([
      {
        $match: {
          user_id: client._id,
          deleted_at: null,
          order_status: { $in: ["delivered", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$total_amount" },
        },
      },
    ]);

    const totalSpent = spentAgg.length ? spentAgg[0].totalSpent : 0;

    // 4️⃣ Build response
    const response = {
      success: true,
      summaryBoxes: [
        {
          key: "totalBookings",
          value: totalBookings,
          message: `${totalBookings} Total Bookings`,
        },
        {
          key: "productOrders",
          value: productOrders,
          message: `${productOrders} Product Orders`,
        },
        {
          key: "totalSpent",
          value: parseFloat(totalSpent.toFixed(2)),
          message: `$${totalSpent.toFixed(2)} Total Spent`,
        },
      ],
      client: {
        id: client._id,
        avatar: client.profile_picture || null,
        name: client.name,
        email: client.email_address,
        phone: client.phone_number,
        joinedOn: client.created_at,
        status: client.status,
        suspendedReason: client.suspension_reason || null,
        archivedReason: client.deleted_at ? "Archived by admin" : null,
      },
    };

    return res.json(response);
  } catch (err) {
    console.error("Error fetching client overview:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

// @desc Get client All Bookings
// @route GET /api/v1/client/:clientId/bookings
// @access Private
const getClientBookings = async (req, res) => {
  try {
    const { clientId } = req.params;

    // ✅ Ensure clientId is valid
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clientId",
      });
    }

    let {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      timeFrom,
      timeTo,
      stylistId,
      serviceType,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { user_id: clientId, deleted_at: null };

    // ✅ Booking status filter
    if (status) {
      filter.booking_status = status.toLowerCase();
    }

    // ✅ Date range filter
    if (dateFrom || dateTo) {
      filter.service_date = {};
      if (dateFrom) filter.service_date.$gte = new Date(dateFrom);
      if (dateTo) filter.service_date.$lte = new Date(dateTo);
    }

    // ✅ Amount range filter
    if (minAmount || maxAmount) {
      filter.grand_total = {};
      if (minAmount) filter.grand_total.$gte = Number(minAmount);
      if (maxAmount) filter.grand_total.$lte = Number(maxAmount);
    }

    // ✅ Time range filter
    if (timeFrom || timeTo) {
      filter.service_start_time = {};
      if (timeFrom) filter.service_start_time.$gte = timeFrom;
      if (timeTo) filter.service_start_time.$lte = timeTo;
    }

    // ✅ Stylist filter
    if (stylistId && mongoose.Types.ObjectId.isValid(stylistId)) {
      filter.stylist_id = stylistId;
    }

    // ✅ Service filter (if you link services later)
    if (serviceType) {
      filter.service_type = serviceType; // only if exists in schema
    }

    // ✅ Count total bookings
    const totalBookings = await Booking.countDocuments(filter);

    // ✅ Paginate results
    const bookings = await Booking.find(filter)
      .populate({
        path: "stylist_id",
        populate: {
          path: "user_id",
          select: "name",
        },
      })
      .populate("saloon_id", "name")
      .sort({ service_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 🧾 Format the response
    const formatted = bookings.map((b) => ({
      booking_id: b._id,
      date: b.service_date ? b.service_date.toISOString().split("T")[0] : null,
      time: b.service_start_time,
      stylist: b.stylist_id?.user_id
        ? {
            _id: b.stylist_id.user_id._id,
            name: b.stylist_id.user_id.name,
          }
        : { _id: null, name: "Unknown Stylist" },
      salon: b.saloon_id
        ? {
            _id: b.saloon_id._id,
            name: b.saloon_id.name,
          }
        : { _id: null, name: "Unknown Salon" },
      amount_paid: b.grand_total,
      status: b.booking_status,
    }));

    return res.json({
      success: true,
      meta: {
        current_page: page,
        total_pages: Math.ceil(totalBookings / limit),
        total_bookings: totalBookings,
      },
      bookings: formatted,
    });
  } catch (error) {
    console.error("Error fetching client bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching client bookings",
    });
  }
};

// @desc Get client All Orders
// @route GET /api/v1/client/:clientId/orders
// @access Private
const getClientOrders = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clientId",
      });
    }

    let {
      page = 1,
      limit = 10,
      deliveryStatus,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      category,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { user_id: clientId, deleted_at: null };

    // ✅ Delivery status filter
    if (deliveryStatus) {
      filter.order_status = deliveryStatus.toLowerCase();
    }

    // ✅ Date range filter
    if (dateFrom || dateTo) {
      filter.created_at = {};
      if (dateFrom) filter.created_at.$gte = new Date(dateFrom);
      if (dateTo) filter.created_at.$lte = new Date(dateTo);
    }

    // ✅ Amount filter
    if (minAmount || maxAmount) {
      filter.total_amount = {};
      if (minAmount) filter.total_amount.$gte = Number(minAmount);
      if (maxAmount) filter.total_amount.$lte = Number(maxAmount);
    }

    // ✅ Count total
    const totalOrders = await Order.countDocuments(filter);

    // ✅ Fetch orders
    const orders = await Order.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (orders.length === 0) {
      return res.json({
        success: true,
        meta: { current_page: page, total_pages: 0, total_orders: 0 },
        orders: [],
      });
    }

    // ✅ Fetch order items
    const orderIds = orders.map((o) => o._id);

    const items = await OrderItem.find({
      order_id: { $in: orderIds },
      deleted_at: null,
    })
      .populate({
        path: "product_id",
        select: "name featured_image category_id",
        populate: {
          path: "category_id",
          select: "name _id",
        },
      })
      .lean();

    let filteredItems = items;

    // ✅ Filter by category unless "all"
    if (category && category.toLowerCase() !== "all") {
      const categoryIds = category.split(",").map((id) => id.trim());
      filteredItems = items.filter((item) => {
        const catIds = item.product_id?.category_id || [];
        return catIds.some((cat) => categoryIds.includes(cat.toString()));
      });
    }

    // 🧩 Group items by order
    const itemsByOrder = filteredItems.reduce((acc, item) => {
      acc[item.order_id] = acc[item.order_id] || [];
      acc[item.order_id].push({
        productId: item.product_id?._id || null,
        name: item.product_id?.name || item.item_name || "Unknown Product",
        avatar: item.product_id?.featured_image || null,
        category:
          Array.isArray(item.product_id?.category_id)
            ? item.product_id.category_id.map((c) => ({
                id: c._id,
                name: c.name,
              }))
            : [],
      });
      return acc;
    }, {});

    // ✅ Format orders
    const formatted = orders
      .map((o) => {
        const products = itemsByOrder[o._id] || [];
        if (category && category.toLowerCase() !== "all" && products.length === 0)
          return null;

        return {
          order_id: o._id,
          order_number: `#${o.order_number}`,
          order_date: o.created_at
            ? o.created_at.toISOString().split("T")[0]
            : null,
          amount_paid: o.total_amount,
          delivery_status: o.order_status,
          products,
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      meta: {
        current_page: page,
        total_pages: Math.ceil(totalOrders / limit),
        total_orders: totalOrders,
      },
      orders: formatted,
    });
  } catch (error) {
    console.error("Error fetching client orders:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching client orders",
    });
  }
};

const suspendClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { client_ids, reason } = req.body;

    if (!client_ids || (Array.isArray(client_ids) && client_ids.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one client ID",
      });
    }
    if (!Array.isArray(client_ids)) {
      client_ids = [client_ids];
    }

    const invalidIds = client_ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid client IDs provided",
        invalid_ids: invalidIds,
      });
    }

    const customerRole = await Role.findOne({ role_name: "customer" }).lean();
    if (!customerRole) {
      return res.status(404).json({
        success: false,
        message: "Customer role not found in the system",
      });
    }

    const users = await User.find({
      _id: { $in: client_ids },
      _id: { $in: customerRole.users },
      deleted_at: null,
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid clients found to suspend",
      });
    }

    const suspendedClients = [];
    for (const user of users) {
      user.status = "suspended";
      user.suspension_reason = reason || "Suspended by admin";
      await user.save({ session });

      suspendedClients.push({
        _id: user._id,
        name: user.name,
        email: user.email_address,
        phone: user.phone_number,
        status: user.status,
        suspension_reason: user.suspension_reason,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `${suspendedClients.length} client(s) suspended successfully`,
      data: suspendedClients,
      skipped: client_ids.filter(
        (id) => !users.some((u) => u._id.toString() === id.toString())
      ),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: "Server error while suspending clients",
      error: error.message,
    });
  }
};

const reactivateClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const customerRole = await Role.findOne({ role_name: "customer" }).lean();
    if (!customerRole) {
      return res.status(404).json({
        success: false,
        message: "Customer role not found in the system",
      });
    }

    const user = await User.findOne({
      _id: clientId,
      _id: { $in: customerRole.users },
      deleted_at: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found or not a customer",
      });
    }

    if (user.status !== "suspended") {
      return res.status(400).json({
        success: false,
        message: "Client is not suspended",
      });
    }

    user.status = "active";
    user.suspension_reason = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Client reactivated successfully",
      client: {
        _id: user._id,
        name: user.name,
        email: user.email_address,
        phone: user.phone_number,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while reactivating client",
      error: error.message,
    });
  }
};

const sendResetPasswordLinkToClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const user = await User.findOne({
      _id: clientId,
      deleted_at: null,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (user.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Client account is not active. Reactivate before sending reset link.",
      });
    }

    await PasswordResetToken.updateMany({ userId: user._id }, { used: true });
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL}auth?token=${resetToken}`;
    await sendEmail({
      to: user.email_address,
      subject: "Password Reset Requested by Admin",
      text: "Reset your password",
      html: passwordResetTemplate({
        name: user.name,
        resetLink,
      }),
    });

    return res.json({
      success: true,
      message: `Password reset link sent successfully to ${user.email_address}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error while sending reset link",
      error: err.message,
    });
  }
};

const getExistingClients = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      status,
      joinedFrom,
      joinedTo,
      minSpent,
      maxSpent,
      sortBy = "joinedOn",
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const customerRole = await Role.findOne({
      role_name: "customer",
      deleted_at: null,
    }).lean();

    if (!customerRole) {
      return res.json({
        success: true,
        meta: { currentPage: 1, totalPages: 0, totalClients: 0 },
        clients: [],
      });
    }

    const serviceClients = await Booking.distinct("user_id", {
      deleted_at: null,
    });

    if (!serviceClients.length) {
      return res.json({
        success: true,
        meta: { currentPage: 1, totalPages: 0, totalClients: 0 },
        clients: [],
      });
    }

    const filter = {
      _id: { $in: serviceClients },
      deleted_at: null,
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email_address: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ];
    }

    if (status) filter.status = status;

    if (joinedFrom || joinedTo) {
      filter.created_at = {};
      if (joinedFrom) filter.created_at.$gte = new Date(joinedFrom);
      if (joinedTo) filter.created_at.$lte = new Date(joinedTo);
    }

    const sortMap = {
      name: "name",
      joinedOn: "created_at",
      totalSpent: "totalSpent",
      loyaltyPoints: "loyaltyPoints",
    };
    const sortField = sortMap[sortBy] || "created_at";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const totalClients = await User.countDocuments(filter);

    const clients = await User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const clientIds = clients.map((c) => c._id);

    const bookings = await Booking.aggregate([
      { $match: { user_id: { $in: clientIds }, deleted_at: null } },
      {
        $group: {
          _id: "$user_id",
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$total_amount" },
        },
      },
    ]);

    const orders = await Order.aggregate([
      { $match: { user_id: { $in: clientIds }, deleted_at: null } },
      {
        $group: {
          _id: "$user_id",
          productOrders: { $sum: 1 },
          productSpent: { $sum: "$total_amount" },
        },
      },
    ]);

    const bookingMap = bookings.reduce((acc, b) => {
      acc[b._id.toString()] = b;
      return acc;
    }, {});

    const orderMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});

    const formatted = clients.map((c) => {
      const b = bookingMap[c._id.toString()] || {};
      const o = orderMap[c._id.toString()] || {};
      const totalSpent = (b.totalSpent || 0) + (o.productSpent || 0);

      return {
        id: c._id,
        avatar: c.profile_picture || null,
        name: c.name,
        email: c.email_address,
        phone: c.phone_number,
        joinedOn: c.created_at,
        totalBookings: b.totalBookings || 0,
        totalSpent,
        productOrders: o.productOrders || 0,
        loyaltyPoints: 0,
        status: c.status,
      };
    });

    const spentFiltered = formatted.filter((f) => {
      if (minSpent && f.totalSpent < minSpent) return false;
      if (maxSpent && f.totalSpent > maxSpent) return false;
      return true;
    });

    return res.json({
      success: true,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalClients / limit),
        totalClients,
      },
      clients: spentFiltered,
    });
  } catch (err) {
    console.error("Error fetching existing clients:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching clients" });
  }
};


module.exports = {
  getClientOverview,
  getClientBookings,
  getClientOrders,
  getClients,
  archiveClient,
  suspendClient,
  reactivateClient,
  sendResetPasswordLinkToClient,
  getExistingClients
};
