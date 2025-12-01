const BookedService = require("../models/booked_service.model");
const Booking = require("../models/booking.model");
const Order = require("../models/order.model");
const OrderItem = require("../models/order_item.model");
const Product = require("../models/product.model");
const Role = require("../models/role.model");
const Stylist = require("../models/stylists.model");
const User = require("../models/user.model");
const Service = require("../models/service.model");

// @desc Get dashboard summary
// @route GET /api/v1/summary
// @access Merchant/Admin
const getSummary = async (req, res) => {
  try {
    const roles = req.user.roles.map((r) => r.role_name);
    const userId = req.user.id;

    if (roles.includes("loctitian")) {
      return await stylistSummary(req, res, userId);
    }

    if (roles.includes("admin")) {
      return await adminSummary(req, res);
    }

    return res.status(403).json({
      success: false,
      message: "Unauthorized role",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const stylistSummary = async (req, res, userId) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaysAppointments = await BookedService.countDocuments({
      stylist_id: userId,
      created_at: { $gte: startOfDay, $lte: endOfDay },
      deleted_at: null,
    });

    const upcomingAppointments = await BookedService.countDocuments({
      stylist_id: userId,
      booking_date: { $gt: new Date() },
      deleted_at: null,
    });

    const totalAppointments = await BookedService.countDocuments({
      stylist_id: userId,
      deleted_at: null,
    });

    return res.status(200).json({
      success: true,
      role: "stylist",
      summary: {
        todaysAppointments,
        upcomingAppointments,
        totalAppointments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching stylist summary",
      error: error.message,
    });
  }
};


const adminSummary = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const customerRole = await Role.findOne({ role_name: "customer" });
    let monthlyClients = Array(12).fill(0);

    if (customerRole) {
      const clientsAgg = await User.aggregate([
        {
          $match: {
            _id: { $in: customerRole.users },
            created_at: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        { $group: { _id: { $month: "$created_at" }, count: { $sum: 1 } } },
      ]);

      clientsAgg.forEach((i) => (monthlyClients[i._id - 1] = i.count));
    }

    const stylistRole = await Role.findOne({ role_name: "loctitian" });
    let monthlyStylists = Array(12).fill(0);

    if (stylistRole) {
      const stylistsAgg = await User.aggregate([
        {
          $match: {
            _id: { $in: stylistRole.users },
            created_at: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        { $group: { _id: { $month: "$created_at" }, count: { $sum: 1 } } },
      ]);

      stylistsAgg.forEach((i) => (monthlyStylists[i._id - 1] = i.count));
    }

    let monthlyBookingRevenue = Array(12).fill(0);
    const bookingRevenueAgg = await BookedService.aggregate([
      {
        $match: {
          created_at: { $gte: startOfYear, $lte: endOfYear },
          deleted_at: null,
        },
      },
      { $group: { _id: { $month: "$created_at" }, total: { $sum: "$total" } } },
    ]);
    bookingRevenueAgg.forEach((i) => (monthlyBookingRevenue[i._id - 1] = i.total));

    let monthlyProductRevenue = Array(12).fill(0);
    const productRevenueAgg = await Order.aggregate([
      {
        $match: {
          order_type: "product",
          created_at: { $gte: startOfYear, $lte: endOfYear },
          deleted_at: null,
        },
      },
      { $group: { _id: { $month: "$created_at" }, total: { $sum: "$total_amount" } } },
    ]);
    productRevenueAgg.forEach((i) => (monthlyProductRevenue[i._id - 1] = i.total));

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaysAppointments = await BookedService.countDocuments({
      created_at: { $gte: startOfDay, $lte: endOfDay },
      deleted_at: null,
    });

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    return res.status(200).json({
      success: true,
      role: "admin",
      year,
      chartData: monthNames.map((month, index) => ({
        month,
        newClients: monthlyClients[index],
        newStylists: monthlyStylists[index],
        bookingRevenue: monthlyBookingRevenue[index],
        productRevenue: monthlyProductRevenue[index],
      })),
      summaryBoxes: [
        {
          key: "todaysAppointments",
          value: todaysAppointments,
          message: "Bookings scheduled for today.",
        },
        {
          key: "totalClients",
          value: monthlyClients.reduce((a, b) => a + b, 0),
        },
        {
          key: "activeStylists",
          value: monthlyStylists.reduce((a, b) => a + b, 0),
        },
        {
          key: "bookingRevenue",
          value: monthlyBookingRevenue.reduce((a, b) => a + b, 0),
        },
        {
          key: "productRevenue",
          value: monthlyProductRevenue.reduce((a, b) => a + b, 0),
        },
      ],
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin summary",
      error: error.message,
    });
  }
};

// @desc Get Booking Summary
// @route GET /api/v1/dashboard/booking-overview
// @access Merchant/Admin
const getBookingOverview = async (req, res) => {
  try {
    const { filter = "year", year, month } = req.query;

    const roleNames = req.user.roles.map((role) => role.role_name);
    const userId = req.user.id;

    const now = new Date();
    const selectedYear = year ? parseInt(year) : now.getFullYear();
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();

    let startDate, endDate, groupBy, projectStage;

    switch (filter) {
      case "month": {
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 1);
        groupBy = { $dayOfMonth: "$service_date" };
        projectStage = {
          $project: { label: "$_id", bookings: 1 },
        };
        break;
      }

      case "week": {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        groupBy = { $dayOfWeek: "$service_date" };
        projectStage = {
          $project: {
            label: {
              $let: {
                vars: {
                  days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                },
                in: { $arrayElemAt: ["$$days", { $subtract: ["$_id", 1] }] },
              },
            },
            bookings: 1,
          },
        };
        break;
      }

      case "day": {
        startDate = new Date(selectedYear, selectedMonth, now.getDate());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        groupBy = { $hour: "$service_date" };
        projectStage = {
          $project: {
            label: { $concat: [{ $toString: "$_id" }, ":00"] },
            bookings: 1,
          },
        };
        break;
      }

      case "year":
      default: {
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear + 1, 0, 1);

        groupBy = { $month: "$service_date" };
        projectStage = {
          $project: {
            label: {
              $let: {
                vars: {
                  months: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ],
                },
                in: { $arrayElemAt: ["$$months", { $subtract: ["$_id", 1] }] },
              },
            },
            bookings: 1,
          },
        };
        break;
      }
    }

    const matchQuery = {
      service_date: { $gte: startDate, $lt: endDate },
      deleted_at: null,
    };

    if (roleNames.includes("loctitian")) {
      const stylist = await Stylist.findOne({ user_id: userId });

      if (!stylist) {
        return res.status(404).json({
          success: false,
          message: "Stylist profile not found for this user",
        });
      }
      
      matchQuery.stylist_id = stylist.user_id;
    } else if (roleNames.includes("merchant") || roleNames.includes("admin")) {
      // all bookings
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Invalid role for this endpoint",
      });
    }

    const data = await Booking.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: groupBy,
          bookings: { $sum: 1 },
        },
      },
      projectStage,
      { $sort: { _id: 1 } },
    ]);

    return res.json({ success: true, filter, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
// @desc Get Today Appointments
// @route GET /api/v1/dashboard/today-appointments
// @access Merchant/Admin
const getTodaysAppointments = async (req, res) => {
  try {
    const roleNames = req.user.roles.map((role) => role.role_name);
    const userId = req.user.id;

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const matchQuery = {
      service_date: { $gte: startOfDay, $lt: endOfDay },
      deleted_at: null,
    };

    if (roleNames.includes("loctitian")) {
      const stylist = await Stylist.findOne({ user_id: userId });
      
      if (!stylist) {
        return res.status(404).json({
          success: false,
          message: "Stylist profile not found for this user",
        });
      }
      
      matchQuery.stylist_id = stylist.user_id;
    } else if (roleNames.includes("merchant") || roleNames.includes("admin")) {
      // all bookings
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Invalid role for this endpoint",
      });
    }

    const data = await Booking.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: "$booking_status",
          count: { $sum: 1 },
        },
      },
    ]);

    let pending = 0;
    let completed = 0;

    data.forEach((item) => {
      if (
        item._id === "pending" ||
        item._id === "confirmed" ||
        item._id === "processing" ||
        item._id === "upcoming" ||
        item._id === "ongoing"
      ) {
        pending += item.count;
      }
      if (item._id === "completed") {
        completed += item.count;
      }
    });

    return res.json({
      success: true,
      pending,
      completed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc Get Top Stylists
// @route GET /api/v1/dashboard/top-stylists
// @access Merchant/Admin
const getTopStylists = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 5;

    let topStylists = await Booking.aggregate([
      {
        $match: {
          deleted_at: null,
          booking_status: { $in: ["completed", "confirmed"] },
        },
      },
      {
        $group: {
          _id: "$stylist_id",
          appointments: { $sum: 1 },
          revenueGenerated: { $sum: "$grand_total" },
        },
      },
      { $sort: { appointments: -1 } },
      { $limit: limit },
    ]);

    // 📌 If no booking data exists → fallback to stylists in system
    if (!topStylists || topStylists.length === 0) {
      const fallbackStylists = await Stylist.find({ deleted_at: null })
        .populate("saloon_id", "name")
        .populate("user_id", "name")
        .limit(limit)
        .lean();

      const stylistsData = fallbackStylists.map((sty, idx) => ({
        rank: idx + 1,
        stylist: sty.user_id
          ? { _id: sty.user_id._id, name: sty.user_id.name }
          : { _id: null, name: "Unknown Stylist" },
        salon: sty.saloon_id
          ? { _id: sty.saloon_id._id, name: sty.saloon_id.name }
          : { _id: null, name: "Unknown Salon" },
        appointments: 0,
        avgRating: parseFloat(sty?.ratings?.toString() || 0),
        revenueGenerated: 0,
      }));

      return res.json({ success: true, stylists: stylistsData });
    }

    // 🧩 If we have bookings → enrich each with stylist + salon details
    const stylistsData = await Promise.all(
      topStylists.map(async (sty, idx) => {
        const stylistDoc = await Stylist.findById(sty._id)
          .populate("saloon_id", "name")
          .populate("user_id", "name")
          .lean();

        return {
          rank: idx + 1,
          stylist: stylistDoc?.user_id
            ? { _id: stylistDoc.user_id._id, name: stylistDoc.user_id.name }
            : { _id: null, name: "Unknown Stylist" },
          salon: stylistDoc?.saloon_id
            ? { _id: stylistDoc.saloon_id._id, name: stylistDoc.saloon_id.name }
            : { _id: null, name: "Unknown Salon" },
          appointments: sty.appointments,
          avgRating: parseFloat(stylistDoc?.ratings?.toString() || 0),
          revenueGenerated: sty.revenueGenerated,
        };
      })
    );

    res.json({ success: true, stylists: stylistsData });
  } catch (err) {
    console.error("Error fetching top stylists:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc Get Top Selling Products
// @route GET /api/v1/dashboard/top-selling-products
// @access Merchant/Admin
const getTopSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const topProducts = await OrderItem.aggregate([
      { $match: { deleted_at: null, item_type: "product" } },
      {
        $group: {
          _id: "$product_id",
          unitsSold: { $sum: "$quantity" },
          revenueGenerated: { $sum: "$total_price" },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: limit },
    ]);

    const productsData = await Promise.all(
      topProducts.map(async (prod, idx) => {
        const product = await Product.findById(prod._id).lean();
        return {
          rank: idx + 1,
          product: product?.name || "Unknown Product",
          unitPrice: parseFloat(product?.unit_price?.toString() || 0),
          unitsSold: prod.unitsSold,
          revenueGenerated: parseFloat(prod.revenueGenerated.toFixed(2)),
          image: product?.featured_image || null,
        };
      })
    );

    return res.json({ success: true, products: productsData });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// @desc Get Recent Activities
// @route GET /api/v1/dashboard/recent-activities
// @access Merchant/Admin
const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = [];

    // 1️⃣ Recent bookings
    const recentBookings = await Booking.find({ deleted_at: null })
      .sort({ created_at: -1 })
      .limit(limit)
      .populate("user_id", "name")
      .populate("saloon_id", "name city state")
      .lean();

    recentBookings.forEach((b) => {
      const salon = b.saloon_id;
      const location = salon
        ? `${salon.city || ""}, ${salon.state || ""}`.trim()
        : "";
      activities.push({
        type: "booking",
        message: `${b.user_id?.name || "Someone"} completed a booking at ${
          salon?.name || "Unknown Salon"
        }${location ? ", " + location : ""}`,
        timeAgo: timeAgo(b.created_at),
        user: b.user_id || null,
        created_at: b.created_at,
      });
    });

    // 2️⃣ New users registered
    const recentUsers = await User.find({})
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    recentUsers.forEach((u) => {
      activities.push({
        type: "user_registration",
        message: `${u.name || "Someone"} registered.`,
        timeAgo: timeAgo(u.created_at),
        user: u,
        created_at: u.created_at,
      });
    });

    // 3️⃣ Recent orders
    const recentOrders = await Order.find({ order_type: "product" })
      .sort({ created_at: -1 })
      .limit(limit)
      .populate("user_id", "name")
      .lean();

    recentOrders.forEach((o) => {
      activities.push({
        type: "order",
        message: `Order #${o.order_number} was placed by ${
          o.user_id?.name || "Someone"
        }`,
        timeAgo: timeAgo(o.created_at),
        user: o.user_id || null,
        created_at: o.created_at,
      });
    });

    // Sort all activities by created_at descending
    activities.sort((a, b) => b.created_at - a.created_at);

    // Limit final activities to requested limit
    const recentActivities = activities.slice(0, limit);

    return res.json({ success: true, activities: recentActivities });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

const universalSearch = async (req, res) => {
  try {
    const query = req.query.query?.trim();
    if (!query || query.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const searchRegex = new RegExp(query, "i");

    const productResults = await Product.find({
      name: searchRegex,
      deleted_at: null,
      status: "active",
    })
      .select("name featured_image unit_price currency")
      .limit(10);

    const serviceResults = await Service.find({
      name: searchRegex,
      deleted_at: null,
      status: "active",
    })
      .select("name icon base_price duration")
      .limit(10);

    const stylists = await Stylist.find({
      deleted_at: null,
      status: "active",
    }).populate({
      path: "user_id",
      match: { name: searchRegex },
      select: "name avatar",
    });

    const stylistResults = stylists
      .filter((s) => s.user_id)
      .map((s) => ({
        _id: s._id,
        name: s.user_id.name,
        avatar: s.user_id.avatar,
        ratings: s.ratings,
        reviews_count: s.reviews_count,
      }));

    const response = [
      ...stylistResults.map((item) => ({ type: "stylist", data: item })),
      ...serviceResults.map((item) => ({ type: "service", data: item })),
      ...productResults.map((item) => ({ type: "product", data: item })),
    ];

    return res.status(200).json({
      success: true,
      count: response.length,
      data: response,
    });
  } catch (error) {
    console.error("Search Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Helper function to convert date to "time ago"
function timeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toDateString();
}

module.exports = {
  getSummary,
  getBookingOverview,
  getTodaysAppointments,
  getTopStylists,
  getTopSellingProducts,
  getRecentActivity,
  universalSearch
};
