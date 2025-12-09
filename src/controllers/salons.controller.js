const Merchant = require("../models/merchant.model");
const Salon = require("../models/salons.model");
const Holiday = require("../models/holidays.model");
const mongoose = require("mongoose");
const { uploadToS3 } = require("../services/awsS3");


// @desc    Create a new salon (merchant only)
// @route   POST /api/salons
// @access  Private (merchant role)
const createSalon = async (req, res) => {
  try {
    const {
      name,
      streetAddress,
      city,
      state,
      zipCode,
      mapLink,
      phone,
      email,
      website,
      facebook,
      instagram,
      linkedin,
      twitter,
      about,
    } = req.body;

    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    const existingEmailSalon = await Salon.findOne({
      email: email.trim().toLowerCase(),
      deleted_at: null,
    });
    if (existingEmailSalon) {
      return res.status(400).json({
        success: false,
        message: "A salon with this email already exists",
      });
    }

    const existingSalon = await Salon.findOne({
      merchant_id: merchant._id,
      deleted_at: null,
    });
    if (existingSalon) {
      return res.status(400).json({
        success: false,
        message:
          "You can only create one salon at this time. Please edit your existing salon.",
      });
    }

    let logoUrl = null;
    let coverImageUrl = null;

    if (req.files?.logo?.[0]) {
      const uploadedLogo = await uploadToS3(req.files.logo[0], "salons");
      logoUrl = uploadedLogo.url;
    }

    if (req.files?.coverImage?.[0]) {
      const uploadedCover = await uploadToS3(req.files.coverImage[0], "salons");
      coverImageUrl = uploadedCover.url;
    }

    if (!logoUrl) logoUrl = "https://placehold.co/200x200?text=Logo";
    if (!coverImageUrl) coverImageUrl = "https://placehold.co/600x300?text=Cover";

    const salon = new Salon({
      merchant_id: merchant._id,
      logo: logoUrl,
      coverImage: coverImageUrl,
      name,
      streetAddress,
      city,
      state,
      zipCode,
      mapLink,
      phone,
      email: email.trim().toLowerCase(),
      website,
      facebook,
      instagram,
      linkedin,
      twitter,
      about,
    });

    await salon.save();

    res.status(201).json({
      success: true,
      message: "Salon created successfully",
      data: salon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create a new salon (merchant only)
// @route   GET /api/salons
// @access  Private (merchant role)
const getMySalon = async (req, res) => {
  try {
    const userId = req.user.id;

    const merchantId = await Merchant.findOne({
      user_id: userId,
    })

    const salon = await Salon.findOne({
      merchant_id: merchantId,
      deleted_at: null
    });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Salon retrieved successfully",
      data: salon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const getSalon = async (req, res) => {
  try {
    const salon = await Salon.findOne({});

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Salon retrieved successfully",
      data: salon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create a new salon (merchant only)
// @route   PATCH /api/salons/:id
// @access  Private (merchant role)
const updateSalon = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    const {
      name,
      streetAddress,
      city,
      state,
      zipCode,
      mapLink,
      phone,
      email,
      website,
      facebook,
      instagram,
      linkedin,
      twitter,
      about,
    } = req.body;

    const logoFile = req.files?.logo?.[0] || null;
    const coverFile = req.files?.coverImage?.[0] || null;

    let salon = null;
    if (req.params?.id) {
      salon = await Salon.findOne({
        _id: req.params.id,
        merchant_id: merchant._id,
        deleted_at: null,
      });
    }

    if (!salon) {
      salon = await Salon.findOne({
        merchant_id: merchant._id,
        deleted_at: null,
      });
    }

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found or not authorized",
      });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const isSameEmail = (salon.email || "").toLowerCase() === normalizedEmail;

      if (!isSameEmail) {
        const existingSalon = await Salon.findOne({
          email: normalizedEmail,
          _id: { $ne: salon._id },
        });
        if (existingSalon) {
          return res.status(400).json({
            success: false,
            message: "A salon with this email already exists",
          });
        }
        salon.email = normalizedEmail;
      }
    }

    salon.name = name ?? salon.name;
    salon.streetAddress = streetAddress ?? salon.streetAddress;
    salon.city = city ?? salon.city;
    salon.state = state ?? salon.state;
    salon.zipCode = zipCode ?? salon.zipCode;
    salon.mapLink = mapLink ?? salon.mapLink;
    salon.phone = phone ?? salon.phone;
    salon.website = website ?? salon.website;
    salon.facebook = facebook ?? salon.facebook;
    salon.instagram = instagram ?? salon.instagram;
    salon.linkedin = linkedin ?? salon.linkedin;
    salon.twitter = twitter ?? salon.twitter;
    salon.about = about ?? salon.about;

    if (logoFile) {
      const uploadedLogo = await uploadToS3(logoFile, "salons");
      salon.logo = uploadedLogo.url;
    }

    if (coverFile) {
      const uploadedCover = await uploadToS3(coverFile, "salons");
      salon.coverImage = uploadedCover.url;
    }

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Salon updated successfully",
      data: salon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Create a new salon (merchant only)
// @route   DELETE /api/salons/:id
// @access  Private (merchant role)
const deleteSalon = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    // ✅ Soft delete (set deleted_at timestamp)
    salon.deleted_at = new Date();
    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Salon deleted successfully (soft delete)",
      data: { id: salon._id, deleted_at: salon.deleted_at },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Add Salon Availability (merchant only)
// @route   POST /api/salons/availability
// @access  Private (merchant role)
const addAvailabilitySalons = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    const { salonId, availability } = req.body;
    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    if (!salon.merchant_id.equals(merchant._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add availability to this salon",
      });
    }

    // Validate that each availability item has a day field
    const invalidItems = availability.filter((item) => !item.day);
    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Each availability item must have a 'day' field",
      });
    }

    // Initialize operatingHours array if it doesn't exist
    if (!salon.operatingHours) {
      salon.operatingHours = [];
    }

    // Create a map of existing operating hours by day for easy lookup
    const existingHoursMap = {};
    salon.operatingHours.forEach((hour) => {
      existingHoursMap[hour.day] = hour;
    });

    // Process each availability item in the request
    availability.forEach((newHour) => {
      if (existingHoursMap[newHour.day]) {
        // Update existing day's operating hours
        const existingHour = existingHoursMap[newHour.day];
        existingHour.open =
          newHour.open !== undefined ? newHour.open : existingHour.open;
        existingHour.close =
          newHour.close !== undefined ? newHour.close : existingHour.close;
        existingHour.isOpen =
          newHour.isOpen !== undefined ? newHour.isOpen : existingHour.isOpen;
      } else {
        // Add new day's operating hours - ensure all required fields are present
        salon.operatingHours.push({
          day: newHour.day,
          open: newHour.open !== undefined ? newHour.open : null,
          close: newHour.close !== undefined ? newHour.close : null,
          isOpen: newHour.isOpen !== undefined ? newHour.isOpen : false,
        });
      }
    });

    // Validate the entire document before saving
    try {
      await salon.validate();
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validationError.message,
      });
    }

    await salon.save();

    return res.status(200).json({
      success: true,
      message: "Operating hours updated successfully",
      data: salon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get Salon Availability (merchant only)
// @route   GET /api/salons/availability
// @access  Private (merchant role)
const getMyAvailabilitySalons = async (req, res) => {
  try {
    const { id: salonId } = req.params;

    if (!salonId) {
      return res.status(400).json({
        success: false,
        message: "Salon ID is required",
      });
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Availability retrieved successfully",
      data: salon.operatingHours,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Add Holiday (merchant only)
// @route   POST /api/salons/availability/holidays
// @access  Private (merchant role)
const addHoliday = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    const { salonId, date, occasion, description } = req.body;

    // Validate required fields
    if (!salonId || !date || !occasion) {
      return res.status(400).json({
        success: false,
        message: "Salon ID, date, and occasion are required fields",
      });
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    if (!salon.merchant_id.equals(merchant._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add holidays to this salon",
      });
    }

    // Convert date string to Date object if needed
    const holidayDate = new Date(date);

    // Get day of week from the date
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = days[holidayDate.getDay()];

    // Check if holiday already exists for this date and salon
    const existingHoliday = await Holiday.findOne({
      salon_id: salonId,
      date: holidayDate,
      deleted_at: null,
    });

    if (existingHoliday) {
      return res.status(409).json({
        success: false,
        message: "A holiday already exists for this date",
        data: existingHoliday,
      });
    }

    // Create new holiday
    const holiday = new Holiday({
      date: holidayDate,
      day: dayOfWeek,
      occasion: occasion.trim(),
      description: description ? description.trim() : null,
      salon_id: salonId,
      merchant_id: merchant._id,
    });

    // Validate before saving
    try {
      await holiday.validate();
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validationError.message,
      });
    }

    await holiday.save();

    // Populate the salon details in the response
    await holiday.populate("salon_id", "name");

    return res.status(201).json({
      success: true,
      message: "Holiday added successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Edit Holiday (merchant only)
// @route   PUT /api/salons/availability/holidays/
// @access  Private (merchant role)
const editHoliday = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }
    const { id } = req.query;
    const { date, occasion, description } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Holiday ID is required",
      });
    }

    const holiday = await Holiday.findById(id);
    if (!holiday || holiday.deleted_at) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    if (!holiday.merchant_id.equals(merchant._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this holiday",
      });
    }

    // Update date if provided
    if (date) {
      const newDate = new Date(date);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      holiday.date = newDate;
      holiday.day = days[newDate.getDay()];
    }

    // Update occasion and description if provided
    if (occasion) holiday.occasion = occasion.trim();
    if (description !== undefined) holiday.description = description.trim();

    // Validate before saving
    try {
      await holiday.validate();
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validationError.message,
      });
    }

    await holiday.save();

    // Populate salon details
    await holiday.populate("salon_id", "name");

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Get Holiday (merchant only)
// @route   GET /api/salons/availability/holidays
// @access  Private (merchant role)
const getSalonHolidays = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate } = req.query;

    const merchantId = await Merchant.findOne({
      user_id: userId,
    })

    const salon = await Salon.findOne({
      merchant_id: merchantId,
      deleted_at: null
    });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    const query = { salon_id: salon._id, deleted_at: null };

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    const holidays = await Holiday.find(query)
      .sort({ date: 1 })
      .lean();

    const result = holidays.map((holiday) => ({
      ...holiday,
      salon_id: holiday.salon_id?.toString(),
    }));

    return res.status(200).json({
      success: true,
      message: "Holidays fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc    Delete Holiday (merchant only)
// @route   DELETE /api/salons/availability/holidays/
// @access  Private (merchant role)
const deleteHoliday = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    const holiday = await Holiday.findById(req.query.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found",
      });
    }

    if (!holiday.merchant_id.equals(merchant._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this holiday",
      });
    }

    holiday.deleted_at = new Date();
    await holiday.save();

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// @desc Add Amenities to Salon (merchant only)
// @route POST /api/store/
// @access Private (merchant role)
const addAmenitiesToSalon = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found for this user",
      });
    }

    // ✅ Find salon owned by merchant
    const salon = await Salon.findOne({ merchant_id: merchant._id });
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: "Salon not found",
      });
    }

    let { amenities = [] } = req.body;

    // ✅ Flatten & cast to ObjectId
    amenities = amenities
      .flat(Infinity)
      .map((id) => new mongoose.Types.ObjectId(id));

    if (amenities.length === 0) {
      salon.amenities = []; // clear all
    } else {
      salon.amenities = [...new Set(amenities.map(String))].map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    await salon.save();

    return res.status(200).json({
      success: true,
      message:
        amenities.length === 0
          ? "All amenities removed successfully"
          : "Amenities updated successfully",
      data: salon,
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
  createSalon,
  getMySalon,
  updateSalon,
  deleteSalon,
  addAvailabilitySalons,
  getMyAvailabilitySalons,
  addHoliday,
  getSalonHolidays,
  editHoliday,
  deleteHoliday,
  addAmenitiesToSalon,
  getSalon
};
