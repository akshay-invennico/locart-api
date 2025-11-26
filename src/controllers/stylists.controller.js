const mongoose = require("mongoose");
const Stylist = require("../models/stylists.model");
const Role = require("../models/role.model");
const User = require("../models/user.model");
const Merchant = require("../models/merchant.model");
const Salon = require("../models/salons.model");
const Booking = require("../models/booking.model");
const Notification = require("../models/notification.model");
const moment = require("moment");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcrypt")

// @desc Create stylist
// @route POST /api/v1/store/stylists
// @access Merchant
const createStylist = async (req, res) => {
  try {
    const {
      fullName,
      email,
      dialing_code,
      phoneNumber,
      specialization,
      services,
      workingDays,
      workingHours,
      experience,
      status,
      password,
      about
    } = req.body;

    const profilePhoto = req.file ? req.file.path : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const merchantUserId = req.user.id;
    const merchantRole = await Role.findOne({
      role_name: "merchant",
      users: merchantUserId,
    });

    if (!merchantRole) {
      return res.status(403).json({
        success: false,
        message: "Only merchants can create stylists",
      });
    }

    const merchant = await Merchant.findOne({
      user_id: merchantUserId,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    const salon = await Salon.findOne({ merchant_id: merchant._id });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found for this merchant",
      });
    }

    const existingUser = await User.findOne({ email_address: email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Stylist with this email already exists",
      });
    }

    const user = await User.create({
      name: fullName,
      email_address: email,
      password: hashedPassword,
      dialing_code,
      phone_number: phoneNumber,
      profile_photo: profilePhoto,
    });

    const stylist = await Stylist.create({
      user_id: user._id,
      saloon_id: salon._id,
      experience_years: parseInt(experience) || 0,
      specialties: specialization,
      bio: about,
      services,
      workingDays,
      workingHours,
      status: status || "active",
    });

    let stylistRole = await Role.findOne({ role_name: "loctitian" });

    if (!stylistRole) {
      stylistRole = await Role.create({
        role_name: "loctitian",
        description: "Stylist specializing in locs",
        users: [user._id],
      });
    } else {
      if (!stylistRole.users.includes(user._id)) {
        stylistRole.users.push(user._id);
        await stylistRole.save();
      }
    }

    const totalBookings = stylist.total_bookings || 0;
    const rating = parseFloat(stylist.ratings?.toString() || "0");
    const totalEarnings = calculateTotalEarnings(stylist);

    await sendEmail({
      to: email,
      subject: "Stylist Credentials",
      text: `You can login with this ${password} to your account`,
    });

    const users = await User.find({}, "_id");
    const notifications = users.map(u => ({
      user_id: u._id,
      title: "New Stylist Joined",
      message: `Welcome Stylist ${user.name} 🌟 – now available at Locart Studio`,
      type: "stylish",
    }));

    Notification.insertMany(notifications);
  
    return res.status(201).json({
      success: true,
      message: "Stylist created successfully",
      stylist: {
        id: stylist._id,
        fullName: user.name,
        email: user.email_address,
        phone: user.phone_number,
        services: stylist.services,
        workingDays: stylist.workingDays,
        workingHours: stylist.workingHours,
        experience_years: stylist.experience_years,
        specialization: stylist.specialization,
        status: stylist.status,
        profilePhoto: user.profile_photo,
        totalBookings,
        totalEarnings,
        rating,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// @desc Update stylist
// @route Patch /api/v1/store/stylists
// @access Merchant
const updateStylist = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullName,
      email,
      phoneNumber,
      services,
      workingDays,
      workingHours,
      experience,
      status,
    } = req.body;

    const profilePhoto = req.file ? req.file.path : null;

    // ✅ Get stylistId from query instead of params
    const stylistId = req.query.stylistId;
    if (!stylistId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "stylistId query parameter is required",
      });
    }

    // ✅ Check if requester has merchant role
    const merchantUserId = req.user.id;
    const merchantRole = await Role.findOne({
      role_name: "merchant",
      users: merchantUserId,
    }).session(session);

    if (!merchantRole) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only merchants can update stylists",
      });
    }

    // ✅ Find the merchant profile
    const merchant = await Merchant.findOne({
      user_id: merchantUserId,
    }).session(session);

    if (!merchant) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    // ✅ Find the salon linked to this merchant
    const salon = await Salon.findOne({ merchant_id: merchant._id }).session(
      session
    );

    if (!salon) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Salon not found for this merchant",
      });
    }

    // ✅ Find stylist by ID and make sure they belong to this salon
    const stylist = await Stylist.findOne({
      _id: stylistId.toString(),
      saloon_id: salon._id,
    }).session(session);

    if (!stylist) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Stylist not found or does not belong to this salon",
      });
    }

    // ✅ Update User (linked to stylist)
    const user = await User.findById(stylist.user_id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "User linked to stylist not found" });
    }

    if (fullName) user.name = fullName;
    if (email) user.email_address = email;
    if (phoneNumber) user.phone_number = phoneNumber;
    if (profilePhoto) user.profile_photo = profilePhoto;

    await user.save({ session });

    // ✅ Update Stylist
    if (services) stylist.services = services;
    if (workingDays) stylist.workingDays = workingDays;
    if (workingHours) stylist.workingHours = workingHours;
    if (experience) stylist.experience_years = parseInt(experience);
    if (status) stylist.status = status;

    await stylist.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Stylist updated successfully",
      stylist: {
        id: stylist._id,
        fullName: user.name,
        email: user.email_address,
        phone: user.phone_number,
        services: stylist.services,
        workingDays: stylist.workingDays,
        workingHours: stylist.workingHours,
        experience_years: stylist.experience_years,
        status: stylist.status,
        profilePhoto: user.profile_photo,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// @desc Get all stylists
// @route GET /api/v1/store/stylists
// @access Merchant/Loctitian
const getAllStylists = async (req, res) => {
  try {
    // Pagination query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch stylists with linked user
    const stylists = await Stylist.find()
      .populate({
        path: "user_id",
        select: "name email_address phone_number profile_photo",
      })
      .skip(skip)
      .limit(limit);

    const total = await Stylist.countDocuments();
    const totalPages = Math.ceil(total / limit);

    // Format response
    const formattedStylists = stylists.map((stylist) => ({
      _id: stylist._id,
      avatarUrl: stylist.user_id?.profile_photo || null,
      fullName: stylist.user_id?.name || "N/A",
      email: stylist.user_id?.email_address || "N/A",
      phone: stylist.user_id?.phone_number || "N/A",
      joinedOn: stylist.hire_date || stylist.created_at || null, 
      totalBookings: stylist.total_bookings || 0, 
      totalEarnings: calculateTotalEarnings(stylist),
      rating: Number(stylist.ratings || 0),
      status: stylist.status || "active",
    }));

    return res.status(200).json({
      success: true,
      data: {
        stylists: formattedStylists,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

const getAvailableStylists = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const dayName = moment(date, "YYYY-MM-DD").format("dddd");

    const stylists = await Stylist.find({
      status: "active",
      workingDays: { $in: [dayName] },
      deleted_at: null,
    })
      .populate("user_id", "name profile_picture")
      .populate("services", "serviceName duration")
      .lean();

    const formatted = stylists.map((stylist) => ({
      _id: stylist._id,
      name: stylist?.user_id?.name,
      avatar: stylist?.user_id?.profile_picture || "null",
      experience_years: stylist.experience_years,
      ratings: stylist.ratings?.toString() || 0,
      total_bookings: stylist.total_bookings,
      workingHours: stylist.workingHours,
      workingDays: stylist.workingDays,
      services: stylist.services,
      is_featured: stylist.is_featured,
      specialities: stylist.specialties || "none",
    }));

    return res.status(200).json({
      success: true,
      date,
      dayName,
      count: formatted.length,
      stylists: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// @desc Get stylist by ID
// @route GET /api/v1/store/stylists/:id
// @access Merchant
const getStylistById = async (req, res) => {
  try {
    const stylistId = req.params.id;
    if (!stylistId) {
      return res.status(400).json({
        success: false,
        message: "stylistId parameter is required",
      });
    }

    const stylist = await Stylist.findById(stylistId)
      .populate({
        path: "user_id",
        select: "name email_address phone_number profile_photo",
      })
      .populate({
        path: "saloon_id",
        select: "name streetAddress city state zipCode mapLink",
      });

    if (!stylist) {
      return res.status(404).json({
        success: false,
        message: "Stylist not found",
      });
    }

    let salonInfo = null;
    if (stylist.saloon_id) {
      const salon = stylist.saloon_id;
      salonInfo = {
        id: salon._id,
        name: salon.name,
        location: `${salon.streetAddress}, ${salon.city}, ${salon.state} ${salon.zipCode}`,
        mapLink: salon.mapLink || null,
      };
    }

    // Return full stylist details
    return res.status(200).json({
      success: true,
      stylist: {
        id: stylist._id,
        fullName: stylist.user_id?.name || null,
        email: stylist.user_id?.email_address || null,
        phone: stylist.user_id?.phone_number || null,
        profilePhoto: stylist.user_id?.profile_photo || null,
        salon: salonInfo,
        services: stylist.services,
        workingDays: stylist.workingDays,
        workingHours: stylist.workingHours,
        experience_years: stylist.experience_years,
        rating: stylist.rating || 0,
        status: stylist.status || "Active",
        createdAt: stylist.createdAt,
        updatedAt: stylist.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// @desc Delete stylist
// @route DELETE /api/v1/store/stylists/:id
// @access Merchant
const deleteStylist = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stylistId = req.params.id;
    if (!stylistId) {
      return res.status(400).json({
        success: false,
        message: "stylistId query parameter is required",
      });
    }

    // Check if requester has merchant role
    const merchantUserId = req.user.id;
    const merchantRole = await Role.findOne({
      role_name: "merchant",
      users: merchantUserId,
    }).session(session);

    if (!merchantRole) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only merchants can delete stylists",
      });
    }

    // Find the merchant profile
    const merchant = await Merchant.findOne({
      user_id: merchantUserId,
    }).session(session);
    if (!merchant) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    // Find the salon linked to this merchant
    const salon = await Salon.findOne({ merchant_id: merchant._id }).session(
      session
    );
    if (!salon) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Salon not found" });
    }

    // Find the stylist
    const stylist = await Stylist.findOne({
      _id: stylistId,
      saloon_id: salon._id,
      deleted_at: null,
    }).session(session);

    if (!stylist) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Stylist not found or already deleted",
      });
    }

    // Soft delete stylist
    stylist.deleted_at = new Date();
    stylist.status = "inactive"; // optional
    await stylist.save({ session });

    // Optional: Soft delete linked user
    const user = await User.findById(stylist.user_id).session(session);
    if (user) {
      user.deleted_at = new Date();
      user.status = "inactive"; // optional
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Stylist soft-deleted successfully",
      stylist: {
        id: stylist._id,
        fullName: user?.name || null,
        status: stylist.status,
        deleted_at: stylist.deleted_at,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      err: err.message,
    });
  }
};

// @desc get stylist time slots
// @route GET /api/store/stylists/timeslots
// @access Private (merchant role)
const getTimeSlots = async (req, res) => {
  try {
    const { stylist_id, date } = req.query;
    let duration = parseInt(req.query.duration) || 60; // ensure number

    if (!stylist_id) {
      return res
        .status(400)
        .json({ success: false, message: "stylist_id is required" });
    }

    const stylist = await Stylist.findById(stylist_id);
    if (!stylist) {
      return res
        .status(404)
        .json({ success: false, message: "Stylist not found" });
    }

    const generateSlots = async (day) => {
      const dayName = moment(day).format("dddd");
      if (!stylist.workingDays.includes(dayName)) {
        return { am: [], pm: [] };
      }

      const startTime = moment(
        `${day} ${stylist.workingHours.start}`,
        "YYYY-MM-DD hh:mm A"
      );
      const endTime = moment(
        `${day} ${stylist.workingHours.end}`,
        "YYYY-MM-DD hh:mm A"
      );

      let slots = [];
      let current = startTime.clone();
      while (current.isBefore(endTime)) {
        slots.push(current.format("HH:mm"));
        current.add(duration, "minutes");
      }

      const bookings = await Booking.find({
        stylist_id,
        service_date: { $eq: new Date(day) },
        booking_status: {
          $in: ["pending", "confirmed", "processing", "completed"],
        },
      });

      const bookedTimes = bookings.map((b) => b.service_start_time);

      slots = slots.filter((s) => !bookedTimes.includes(s));

      return {
        am: slots.filter((s) => moment(s, "HH:mm").hour() < 12),
        pm: slots.filter((s) => moment(s, "HH:mm").hour() >= 12),
      };
    };

    if (date) {
      const slots = await generateSlots(date);
      return res.json({ success: true, slots });
    } else {
      // next 7 days, use Promise.all for parallelism
      const days = Array.from({ length: 7 }, (_, i) =>
        moment().add(i, "days").format("YYYY-MM-DD")
      );
      const results = await Promise.all(days.map((d) => generateSlots(d)));

      let availability = {};
      days.forEach((d, i) => {
        availability[d] = results[i];
      });

      return res.json({ success: true, availability });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllStylistsDetails = async (req, res) => {
  try {
    const stylists = await Stylist.aggregate([
      {
        $match: { deleted_at: null }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },

      {
        $lookup: {
          from: "reviews",
          let: { stylistUserId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$stylist_id", "$$stylistUserId"] }
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "customer_id",
                foreignField: "_id",
                as: "customerDetails"
              }
            },
            { $unwind: "$customerDetails" }
          ],
          as: "reviews"
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "All Stylists with Reviews fetched successfully",
      data: stylists
    });

  } catch (error) {
    console.error("Error fetching stylists:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

function calculateTotalEarnings(stylist) {
  try {
    const rate = parseFloat(stylist.hourly_rate?.toString() || "0");
    const bookings = stylist.total_bookings || 0;
    return rate * bookings;
  } catch (error) {
    return 0;
  }
}

module.exports = {
  createStylist,
  updateStylist,
  getAllStylists,
  getStylistById,
  deleteStylist,
  getTimeSlots,
  getAvailableStylists,
  getAllStylistsDetails
};
