const Merchant = require("../models/merchant.model");
const Service = require("../models/service.model");
const Salon = require("../models/salons.model");
const SalonService = require("../models/salonService.model");

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (merchant)
const createService = async (req, res) => {
  try {
    const { name, description, icon, duration, base_price } = req.body;

    if (duration < 15) {
      return res.status(400).json({
        success: false,
        message: "Service duration must be at least 15 minutes",
      });
    }

    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant)
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });

    const service = new Service({
      name,
      description,
      icon,
      duration,
      base_price,
    });
    await service.save();

    const salons = await Salon.find({
      merchant_id: merchant._id,
      deleted_at: null,
    });
    const salonServices = salons.map((salon) => ({
      salon_id: salon._id,
      service_id: service._id,
      is_available: true,
    }));

    if (salonServices.length > 0) await SalonService.insertMany(salonServices);

    res.status(201).json({
      success: true,
      message: "Service created successfully and added to your salons",
      data: service,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get all active services for merchant
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const {
      search,
      status,
      minPrice,
      maxPrice,
      duration,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object for Service
    let serviceFilter = { deleted_at: null };

    if (search) {
      serviceFilter.name = { $regex: search, $options: "i" }; // case-insensitive
    }

    if (status) {
      if (status.toLowerCase() === "active") serviceFilter.deleted_at = null;
      else if (status.toLowerCase() === "inactive")
        serviceFilter.deleted_at = { $ne: null };
    }

    if (minPrice)
      serviceFilter.base_price = {
        ...serviceFilter.base_price,
        $gte: Number(minPrice),
      };
    if (maxPrice)
      serviceFilter.base_price = {
        ...serviceFilter.base_price,
        $lte: Number(maxPrice),
      };
    if (duration) serviceFilter.duration = duration;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Find services via SalonService to ensure only services linked to salons
    const salonServices = await SalonService.find({
      deleted_at: null,
    }).populate({
      path: "service_id",
      match: serviceFilter,
    });

    let services = salonServices
      .map((ss) => ss.service_id)
      .filter((s) => s);

    const uniqueServicesMap = new Map();
    services.forEach((s) => uniqueServicesMap.set(s._id.toString(), s));
    services = Array.from(uniqueServicesMap.values());

    const total = services.length;

    // Apply pagination
    services = services.slice(skip, skip + Number(limit));

    // Format output
    const formattedServices = services.map((s) => ({
      _id: s._id,
      serviceName: s.name,
      iconUrl: s.icon,
      basePrice: s.base_price,
      duration: s.duration,
      serviceStatus: s.deleted_at ? "Inactive" : "Active",
    }));

    res.status(200).json({
      success: true,
      data: {
        services: formattedServices,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get single service by ID for merchant
// @route   GET /api/services/:id
// @access  Private (merchant)
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Service ID is required",
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const salonService = await SalonService.findOne({
      service_id: id,
      deleted_at: null,
    }).populate("salon_id");

    if (!salonService || !salonService.salon_id) {
      return res.status(404).json({
        success: false,
        message: "Salon not found for this service",
      });
    }

    const salon = salonService.salon_id;
    const formattedLocation = `${salon.streetAddress}, ${salon.city}, ${salon.state} ${salon.zipCode}`;

    return res.status(200).json({
      success: true,
      data: {
        service,
        salon: {
          id: salon._id,
          name: salon.name,
          logo: salon.logo,
          coverImage: salon.coverImage,
          location: formattedLocation,
          mapLink: salon.mapLink || null,
          phone: salon.phone || null,
          email: salon.email || null,
        },
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

// @desc    Update a service
// @route   PATCH /api/services/:id
// @access  Private (merchant)
const updateService = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant)
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });

    const salons = await Salon.find({
      merchant_id: merchant._id,
      deleted_at: null,
    });
    const salonIds = salons.map((s) => s._id);

    const salonService = await SalonService.findOne({
      salon_id: { $in: salonIds },
      service_id: req.params.id,
      deleted_at: null,
    });

    if (!salonService)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    const service = await Service.findById(req.params.id);
    Object.assign(service, req.body);
    await service.save();

    res
      .status(200)
      .json({ success: true, message: "Service updated", data: service });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete a service
// @route   DELETE /api/services/:id
// @access  Private (merchant)
const deleteService = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.id });
    if (!merchant)
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });

    const salons = await Salon.find({
      merchant_id: merchant._id,
      deleted_at: null,
    });
    const salonIds = salons.map((s) => s._id);

    const salonService = await SalonService.findOne({
      salon_id: { $in: salonIds },
      service_id: req.params.id,
      deleted_at: null,
    });

    if (!salonService)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    const service = await Service.findById(req.params.id);
    service.deleted_at = new Date();
    await service.save();

    res.status(200).json({
      success: true,
      message: "Service soft deleted successfully",
      data: { id: service._id, deleted_at: service.deleted_at },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
