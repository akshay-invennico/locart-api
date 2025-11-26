const mongoose = require("mongoose");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Service = require("../models/service.model");
const Stylist = require("../models/stylists.model");
const Booking = require("../models/booking.model");
const BookedService = require("../models/booked_service.model");
const Transaction = require("../models/transation.model");
const Notification = require("../models/notification.model")
const stripe = require("../utils/stripe");
const { createEvents } = require("ics");

// @desc Create booking
// @route POST /api/v1/appointment
// @access Merchant
const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      client,
      service_id,
      stylist_id,
      date,
      time_slot,
      amount,
      discount = 0,
      payable_amount,
      payment_status,
      payment_method,
      booking_status,
      booking_note,
    } = req.body;

    if (!service_id || !stylist_id || !date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking details",
      });
    }

    // 1️⃣ Handle client (new / existing)
    let customer;

    if (!client || !client.type) {
      throw new Error("Client type is required");
    }

    if (client.type === "existing") {
      if (!client.user_id) {
        return res.status(400).json({
          success: false,
          message: "Client user_id is required for existing client type",
        });
      }

      customer = await User.findById(client.user_id).session(session);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Existing client not found",
        });
      }
    }

    else if (client.type === "new") {
      if (!client.name || !client.email || !client.phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required client details (name, email, phone)",
        });
      }

      // Check if user with same email/phone already exists
      const existingUser = await User.findOne({
        $or: [
          { email_address: client.email },
          { phone_number: client.phone }
        ],
      }).session(session);

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Client with this email or phone already exists. Please select 'existing' type.",
        });
      }

      // Create new client user
      const [newUser] = await User.create(
        [
          {
            name: client.name,
            email_address: client.email,
            phone_number: client.phone,
            isVerified: false,
          },
        ],
        { session }
      );
      customer = newUser;

      // Attach customer role
      let customerRole = await Role.findOne({ role_name: "customer" }).session(session);
      if (!customerRole) {
        customerRole = await Role.create(
          [
            {
              role_name: "customer",
              description: "General customer",
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
    }

    else {
      return res.status(400).json({
        success: false,
        message: "Invalid client type. Must be 'new' or 'existing'.",
      });
    }

    // 2️⃣ Fetch service
    const service = await Service.findById(service_id).session(session);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // 3️⃣ Fetch stylist
    const stylist = await Stylist.findById(stylist_id)
      .populate("user_id", "name")
      .session(session);
    if (!stylist) {
      return res.status(404).json({
        success: false,
        message: "Stylist not found",
      });
    }

    // 4️⃣ Check stylist availability
    const startDateTime = new Date(`${date}T${time_slot}:00`);
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

    const overlappingBooking = await Booking.findOne({
      stylist_id,
      service_date: new Date(date),
      $or: [
        {
          service_start_time: { $lt: endDateTime.toTimeString().split(" ")[0] },
          service_end_time: { $gt: startDateTime.toTimeString().split(" ")[0] },
        },
      ],
      booking_status: { $nin: ["cancelled"] },
    });

    if (overlappingBooking) {
      const bookedService = await BookedService.findOne({
        booking_id: overlappingBooking._id,
      }).populate("service_id", "name");
      return res.status(400).json({
        success: false,
        message: "Stylist is not available for the selected time slot",
        reason: `Already booked for service '${bookedService?.service_id?.name}' from ${overlappingBooking.service_start_time} to ${overlappingBooking.service_end_time}`,
      });
    }

    // 5️⃣ Create booking
    const booking = new Booking({
      user_id: customer._id,
      stylist_id,
      saloon_id: stylist.saloon_id,
      grand_total: amount,
      subtotal: amount,
      total_discount: discount,
      total_taxes: 0,
      total_duration: service.duration || 60,
      stylist_duration: service.duration || 60,
      notes: booking_note,
      payment_status: payment_status.toLowerCase(),
      booking_status: booking_status.toLowerCase(),
      service_date: new Date(date),
      service_start_time: time_slot,
      service_end_time: endDateTime.toTimeString().split(" ")[0],
      booking_mode: "store",
    });
    await booking.save({ session });

    // 6️⃣ Create booked service (like order items)
    const bookedService = new BookedService({
      booking_id: booking._id,
      service_id: service._id,
      stylist_id: stylist_id,
      quantity: 1,
      unit_price: amount,
      total: payable_amount,
      discount,
      taxes: 0,
      duration: service.duration || 60,
      service_status: "pending",
    });
    await bookedService.save({ session });

    // 7️⃣ Save transaction
    const transaction = new Transaction({
      user_id: customer._id,
      booking_id: booking._id,
      transaction_type: "payment",
      payment_method: payment_method.toLowerCase(),
      amount: amount,
      net_amount: payable_amount,
      currency: "INR",
      transaction_status:
        payment_status.toLowerCase() === "paid" ? "completed" : "pending",
      payment_status: payment_status.toLowerCase(),
      processed_at: payment_status.toLowerCase() === "paid" ? new Date() : null,
    });
    await transaction.save({ session });

    await session.commitTransaction();

    // ✅ Response
    const responseData = {
      bookingId: booking._id,
      bookingStatus: booking.booking_status,
      client: {
        id: customer._id,
        name: customer.name,
        email: customer.email_address,
        phone: customer.phone_number,
      },
      service: {
        id: service._id,
        name: service.service_name,
        duration: service.duration,
      },
      stylist: {
        id: stylist._id,
        name: stylist.user_id?.name || null,
      },
      payment: {
        amount,
        discount,
        payable_amount,
        method: payment_method,
        status: payment_status,
      },
    };

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: responseData,
    });
  } catch (error) {
    await session.abortTransaction();

    if (
      error.message.includes("Client not found") ||
      error.message.includes("Invalid client type") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc Get all bookings
// @route GET /api/v1/appointment
// @access Merchant
const getAllBookings = async (req, res) => {
  try {
    let {
      status,
      start_date,
      end_date,
      min_amount,
      max_amount,
      start_time,
      end_time,
      service_ids,
      page = 1,
      per_page = 10,
    } = req.query;

    const { stylist_ids } = req.body;

    page = parseInt(page);
    per_page = parseInt(per_page);

    const query = {};

    // 1️⃣ Status filter (multi-select)
    if (status) {
      let statusArray = Array.isArray(status) ? status : [status];
      query.booking_status = { $in: statusArray.map((s) => s.toLowerCase()) };
    }

    // 2️⃣ Date range
    if (start_date || end_date) {
      query.service_date = {};
      if (start_date) query.service_date.$gte = new Date(start_date);
      if (end_date) query.service_date.$lte = new Date(end_date);
    }

    // 3️⃣ Amount range
    if (min_amount || max_amount) {
      query.grand_total = {};
      if (min_amount) query.grand_total.$gte = Number(min_amount);
      if (max_amount) query.grand_total.$lte = Number(max_amount);
    }

    // 4️⃣ Time range
    if (start_time || end_time) {
      query.service_start_time = {};
      if (start_time) query.service_start_time.$gte = start_time;
      if (end_time) query.service_start_time.$lte = end_time;
    }

    // 5️⃣ Stylist filter
    if (stylist_ids && Array.isArray(stylist_ids) && stylist_ids.length > 0) {
      query.stylist_id = { $in: stylist_ids };
    }

    // 6️⃣ Service filter (via BookedService)
    let bookingIdsFromServices = null;
    if (service_ids && service_ids.length > 0) {
      const serviceArr = Array.isArray(service_ids) ? service_ids : [service_ids];
      const bookedServices = await BookedService.find({
        service_id: { $in: serviceArr },
      }).select("booking_id");
      bookingIdsFromServices = bookedServices.map((bs) => bs.booking_id);
      query._id = { $in: bookingIdsFromServices };
    }

    // 7️⃣ Pagination + Populate
    const bookings = await Booking.find(query)
      .populate("user_id", "name email_address phone_number")
      .populate({
        path: "stylist_id",
        populate: [
          {
            path: "user_id",
            select: "name email_address phone_number",
          }
        ],
      })
      .populate("saloon_id", "name address")
      .sort({ created_at: -1 })
      .skip((page - 1) * per_page)
      .limit(per_page)
      .lean();

    const total = await Booking.countDocuments(query);

    // 8️⃣ Fetch all booked services for these bookings in one query
    const bookingIds = bookings.map((b) => b._id);
    const bookedServices = await BookedService.find({
      booking_id: { $in: bookingIds },
    })
      .populate("service_id")
      .lean();

    // 9️⃣ Group booked services by booking_id
    const bookedServicesMap = bookedServices.reduce((acc, bs) => {
      const bid = bs.booking_id.toString();
      if (!acc[bid]) acc[bid] = [];
      acc[bid].push(bs.service_id); // full service object
      return acc;
    }, {});

    // 🔟 Format response
    const data = bookings.map((booking) => {
      const stylistUser = booking.stylist_id?.user_id;
      const stylist = booking.stylist_id
        ? {
            _id: booking.stylist_id._id,
            name: stylistUser?.name || null,
            email: stylistUser?.email_address || null,
            phone: stylistUser?.phone_number || null,
            experience: booking.stylist_id.experience || null,
            specialization: booking.stylist_id.specialization || null,
            salon: booking.stylist_id.salon_id || null,
          }
        : null;

      return {
        booking_id: booking._id,
        date: booking.service_date.toISOString().split("T")[0],
        time: booking.service_start_time,
        client: {
          id: booking.user_id?._id,
          name: booking.user_id?.name,
          email: booking.user_id?.email_address,
          phone: booking.user_id?.phone_number,
        },
        stylist,
        services: bookedServicesMap[booking._id.toString()] || [],
        amount: booking.grand_total,
        discount: booking.total_discount,
        status: booking.booking_status,
        payment_status: booking.payment_status,
        booking_mode: booking.booking_mode,
        saloon: booking.saloon_id
          ? {
              id: booking.saloon_id._id,
              name: booking.saloon_id.name,
              address: booking.saloon_id.address,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      message: "Bookings fetched successfully",
      data,
      pagination: {
        page,
        per_page,
        total,
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

// @desc Get booking by ID
// @route GET /api/v1/appointment/:id
// @access Merchant
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    // ✅ 1️⃣ Fetch booking with populated stylist and user
    const booking = await Booking.findById(id)
      .populate("user_id", "name email_address phone_number")
      .populate({
        path: "stylist_id",
        populate: {
          path: "user_id",
          select: "name email_address phone_number",
        },
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ✅ 2️⃣ Fetch all booked services with service details
    const bookedServices = await BookedService.find({
      booking_id: booking._id,
    })
      .populate("service_id", "service_name price duration description")
      .lean();

    // ✅ 3️⃣ Fetch associated transaction
    const transaction = await Transaction.findOne({
      booking_id: booking._id,
    }).lean();

    // ✅ 4️⃣ Compute payable and paid logic properly
    const totalPayable = booking.grand_total;
    const loyaltyDiscount = booking.total_discount || 0;

    // If loyalty discount = 0, paid amount = grand_total (not reduced)
    const paidAmount =
      loyaltyDiscount > 0
        ? totalPayable - loyaltyDiscount
        : totalPayable;

    // ✅ 5️⃣ Construct final response object
    const responseData = {
      booking_id: booking._id,
      invoice_id: transaction?.invoice_number || `INV-${booking._id.toString().slice(-6)}`,
      date: booking.service_date
        ? booking.service_date.toISOString().split("T")[0]
        : null,
      time: booking.service_start_time,
      booked_on: booking.created_at,
      status: booking.booking_status,
      booking_mode: booking.booking_mode,

      client: booking.user_id
        ? {
            name: booking.user_id.name,
            email: booking.user_id.email_address,
            phone: booking.user_id.phone_number,
          }
        : null,

      stylist: booking.stylist_id
        ? {
            id: booking.stylist_id._id,
            name: booking.stylist_id.user_id?.name,
            email: booking.stylist_id.user_id?.email_address,
            phone: booking.stylist_id.user_id?.phone_number,
          }
        : null,

      services: bookedServices.map((bs) => ({
        _id: bs.service_id?._id,
        name: bs.service_id?.service_name,
        price: bs.service_id?.price,
        duration: bs.service_id?.duration,
        description: bs.service_id?.description || null,
      })),

      payment: transaction
        ? {
            payment_status: transaction.payment_status,
            payment_method: transaction.payment_method,
            amount_paid: paidAmount,
            transaction_id: transaction.transaction_id || null,
            remarks: transaction.remarks || null,
          }
        : {
            payment_status: booking.payment_status,
            amount_paid: paidAmount,
          },

      invoice: {
        service_charges: booking.subtotal,
        taxes: booking.total_taxes,
        loyalty_discount: loyaltyDiscount,
        total_payable: totalPayable,
      },
    };

    return res.status(200).json({
      success: true,
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

// @desc Update booking only for store
// @route Patch /api/v1/appointment/:id
// @access Merchant
const updateBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.id;
    const { time_slot, booking_status, booking_note, stylist_duration, payment_status } = req.body;

    // 1️⃣ Fetch booking (from middleware or DB)
    const booking =
      req.booking ||
      (await Booking.findById(bookingId).session(session));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.booking_mode !== "store") {
      return res.status(403).json({
        success: false,
        message: "Only store-created bookings can be edited",
      });
    }

    // 2️⃣ Validate stylist availability if time_slot is changed
    if (time_slot) {
      const serviceEndTime = new Date(
        new Date(`${booking.service_date.toISOString().split("T")[0]}T${time_slot}:00`).getTime() +
          booking.total_duration * 60000
      );

      const overlappingBooking = await Booking.findOne({
        _id: { $ne: bookingId },
        stylist_id: booking.stylist_id,
        service_date: booking.service_date,
        service_start_time: { $lt: serviceEndTime.toTimeString().split(" ")[0] },
        service_end_time: { $gt: time_slot },
        booking_status: { $nin: ["cancelled", "completed", "no_show"] },
      }).session(session);

      if (overlappingBooking) {
        return res.status(400).json({
          success: false,
          message: "Stylist is not available for the selected time slot",
        });
      }

      booking.service_start_time = time_slot;
      booking.service_end_time = serviceEndTime.toTimeString().split(" ")[0];
    }

    // 3️⃣ Update allowed fields
    if (booking_status) booking.booking_status = booking_status.toLowerCase();
    if (booking_note) booking.notes = booking_note;
    if (stylist_duration) booking.stylist_duration = Number(stylist_duration);
    if (payment_status) booking.payment_status = payment_status.toLowerCase();

    await booking.save({ session });
    await Notification.create({
      user_id: booking.user_id,
      title: "Booking Updated",
      message: `Your booking (${booking.booking_number}) has been updated!!`,
      type: "booking",
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: {
        booking_id: booking._id,
        stylist_duration: booking.stylist_duration,
        time_slot: booking.service_start_time,
        booking_status: booking.booking_status,
        booking_note: booking.notes,
        payment_status: booking.payment_status,
      },
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

// @desc Update booking status in bulk (store-created bookings only)
// @route PATCH /api/v1/appointments/status
// @access Merchant
const updateBookingStatusBulk = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingIds, status, reason } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bookingIds must be a non-empty array",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Fetch bookings
    const bookings = await Booking.find({
      _id: { $in: bookingIds },
    }).session(session);

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for the provided IDs",
      });
    }

    // Update only store-created bookings
    const updatedBookings = [];
    for (const booking of bookings) {
      if (booking.booking_mode !== "store") continue;

      booking.booking_status = status.toLowerCase();
      if (reason) {
        booking.cancellation_reason = reason;
        booking.cancelled_at = new Date();
      }
      await booking.save({ session });
      updatedBookings.push(booking._id);
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Bookings updated successfully",
      updatedBookings,
      skippedBookings: bookings
        .filter((b) => b.booking_mode !== "store")
        .map((b) => b._id),
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

const markAsCompleted = async (req, res) => {
  try {
    const { booking_ids } = req.body;

    if (!Array.isArray(booking_ids) || booking_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one booking ID.",
      });
    }

    const bookings = await Booking.find({ _id: { $in: booking_ids } });

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for the given IDs.",
      });
    }

    const eligibleIds = bookings
      .filter(
        (b) =>
          b.booking_status !== "cancelled" &&
          b.booking_status !== "completed"
      )
      .map((b) => b._id);

    if (eligibleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All bookings are either cancelled or already completed.",
      });
    }

    const result = await Booking.updateMany(
      { _id: { $in: eligibleIds } },
      {
        $set: {
          booking_status: "completed",
          updated_at: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Bookings marked as completed successfully.",
      data: {
        total_requested: booking_ids.length,
        total_found: bookings.length,
        total_updated: result.modifiedCount,
        total_skipped: booking_ids.length - result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in bulk mark as completed:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc Update booking refund summary
// @route PATCH /api/v1/appointment/:id/refund
// @access Merchant
const refundBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.id;
    const { confirm_amount, remarks } = req.body;

    if (!confirm_amount || confirm_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid confirm_amount is required",
      });
    }

    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    // 1️⃣ Cancel the booking
    booking.booking_status = "cancelled";
    booking.cancellation_reason = remarks || "Refund processed";
    booking.cancelled_at = new Date();
    await booking.save({ session });

    // 2️⃣ Update all booked services
    const bookedServices = await BookedService.find({
      booking_id: booking._id,
    }).session(session);

    for (const service of bookedServices) {
      service.refund_status = "refunded";
      service.refund_amount = confirm_amount; // Could be distributed per service if needed
      service.service_status = "refunded";
      await service.save({ session });
    }

    // 3️⃣ Optionally, you can log this in Transaction collection
    const transaction = new Transaction({
      user_id: booking.user_id,
      booking_id: booking._id,
      transaction_type: "refund",
      payment_method: booking.payment_method || "cash",
      amount: confirm_amount,
      net_amount: confirm_amount,
      currency: "INR",
      payment_status: "paid",
      transaction_status: "completed",
      processed_at: new Date(),
      remarks,
    });
    await transaction.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Booking refunded and cancelled successfully",
      data: {
        bookingId: booking._id,
        refundedAmount: confirm_amount,
        remarks,
      },
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

// @desc Update booking refund summary
// @route PATCH /api/v1/appointment/:id/refund
// @access Merchant
const getRefundSummary = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "stylist_id",
        populate: { path: "user_id", select: "name" },
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const bookedServices = await BookedService.find({ booking_id: booking._id })
      .populate("service_id", "name")
      .lean();

    // Calculate total refunded amount
    const refundedAmount = bookedServices.reduce(
      (acc, svc) => acc + (svc.refund_amount || 0),
      0
    );

    // Determine overall refund status (if any service is not refunded yet, pending)
    const refundStatus = bookedServices.every(
      (svc) => svc.refund_status === "refunded"
    )
      ? "Completed"
      : "Pending";

    return res.status(200).json({
      success: true,
      booking: {
        booking_id: booking._id,
        date_time: new Date(
          `${booking.service_date.toISOString().split("T")[0]}T${
            booking.service_start_time
          }:00`
        ),
        services: bookedServices
          .map((svc) => svc.service_id?.name)
          .filter(Boolean),
        stylist: booking.stylist_id?.user_id?.name || null,
        booked_on: booking.created_at,
        status: booking.booking_status,
      },
      payment: {
        amount_paid: booking.grand_total,
        payment_method: booking.payment_method || "Cash",
        refundable_amount: refundedAmount,
        refund_status: refundStatus,
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

const createServiceBooking = async (req, res) => {
  try {
    const {
      service_id,
      stylist_id,
      service_date,
      service_start_time,
      service_end_time,
      is_partial_payment,
    } = req.body;

    const service = await Service.findById(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const price = Number(service.base_price);
    const tax_percentage = Number(process.env.TAX_PERCENTAGE) || 0;
    const partial_percentage =
      Number(process.env.PARTIAL_AMOUNT_PERCENTAGE) || 0;

    const taxes = (price * tax_percentage) / 100;
    const grand_total = price + taxes;

    let payable_amount = grand_total;

    if (is_partial_payment === true || is_partial_payment === "true") {
      payable_amount = (grand_total * partial_percentage) / 100;
    }

    const booking = await Booking.create({
      booking_number: "BOOK-" + Date.now(),
      user_id: req.user.id,
      stylist_id,
      subtotal: price,
      total_taxes: taxes,
      grand_total,
      total_discount: 0,
      total_duration: service.duration,
      stylist_duration: service.duration,
      service_date,
      service_start_time,
      service_end_time,
      is_partial_payment: is_partial_payment ? true : false,
      payable_amount,
      partial_percentage: is_partial_payment ? partial_percentage : 0,
      booking_mode: "online"
    });



    await BookedService.create({
      booking_id: booking._id,
      service_id: service._id,
      stylist_id: stylist_id,
      quantity: 1,
      unit_price: price,
      total: grand_total,
      discount: 0,
      taxes: taxes,
      duration: service.duration || 60,
      service_status: "pending",
    });

    const session = await createCheckoutSessionForService(
      booking,
      service,
      payable_amount,
      req
    );

    booking.stripe_session_id = session.sessionId;
    await booking.save();

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      checkoutUrl: session.url,
      booking_id: booking._id,
      payable_amount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createCheckoutSessionForService = async (
  booking,
  service,
  payable_amount,
  req
) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: service.name,
            description: booking.is_partial_payment
              ? `Partial payment (${booking.partial_percentage}%)`
              : `Full service payment`,
          },
          unit_amount: payable_amount * 100,
        },
        quantity: 1,
      },
    ],

    customer_email: req.user.email,

    metadata: {
      bookingId: booking._id.toString(),
      type: "service",
      is_partial_payment: booking.is_partial_payment,
    },

    payment_intent_data: {
      metadata: {
        bookingId: booking._id.toString(),
        type: "service",
        is_partial_payment: booking.is_partial_payment,
      },
    },

    success_url: `${process.env.FRONTEND_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/booking-cancelled`,
  });

  return {
    url: session.url,
    sessionId: session.id,
  };
};

const verifyPayment = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "session_id is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const bookingId = session.metadata.bookingId;
    const booking = await Booking.findById(bookingId);

    return res.json({
      success: true,
      payment_status: booking.payment_status,
      booking_status: booking.booking_status,
      booking_id: booking._id
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBookingSummary = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate("stylist_id")           
      .populate("user_id")              

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking summary fetched successfully",
      data: {
        booking_id: booking._id,
        booking_number: booking.booking_number,
        user: booking.user_id,
        stylist: booking.stylist_id,
        items: booking.items,
        payment: {
          subtotal: booking.subtotal,
          taxes: booking.total_taxes,
          discount: booking.total_discount,
          grand_total: booking.grand_total,
          payable_amount: booking.payable_amount,
          is_partial_payment: booking.isPartialPayment,
        },
        schedule: {
          date: booking.service_date,
          start_time: booking.service_start_time,
          end_time: booking.service_end_time,
        },
        status: booking.booking_status,
        stripe_session_id: booking.stripe_session_id,
        created_at: booking.createdAt,
      },
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      user_id: req.user.id, 
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (booking.booking_status !== "upcoming") {
      return res.status(400).json({
        success: false,
        message: "Only upcoming bookings can be cancelled",
      });
    }
    if (!booking.stripe_payment_intent) {
      return res.status(400).json({
        success: false,
        message: "No payment intent found for this booking",
      });
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(
      booking.stripe_payment_intent
    );

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed, cannot refund.",
      });
    }
    
    const refundAmount = Math.round(booking.payable_amount * 100);
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent,
      amount: refundAmount,
      metadata: {
        bookingId: booking._id.toString(),
        reason,
      },
    });

    booking.booking_status = "cancelled";
    booking.payment_status = "refunded";
    booking.cancelled_at = new Date();
    booking.cancellation_reason = reason || "Not specified";
    booking.cancelled_by = req.user.id;
    await booking.save();

    await Notification.create({
      user_id: req.user.id,
      title: "Booking Cancelled",
      message: `Your booking (${booking.booking_number}) has been cancelled!`,
      type: "booking",
    });

    return res.status(200).json({
      success: true,
      message: "Booking cancelled & refund initiated successfully",
      refund_id: refund.id,
      refund_status: refund.status,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const addToCalendar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await Booking.findById(id)
      .populate("user_id", "name email_address phone_number")
      .populate({
        path: "stylist_id",
        populate: {
          path: "user_id",
          select: "name email_address phone_number",
        },
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const bookedServices = await BookedService.find({
      booking_id: booking._id,
    })
      .populate("service_id", "service_name duration")
      .lean();

    const [year, month, day] = booking.service_date
      .toISOString()
      .split("T")[0]
      .split("-")
      .map(Number);

    const [hours, minutes] = booking.service_start_time
      .split(":")
      .map(Number);

    const totalDuration = bookedServices.reduce(
      (sum, bs) => sum + (bs.service_id?.duration || 0),
      0
    );

    const eventData = {
      title: `Salon Appointment - ${booking.user_id?.name}`,
      description: "Your appointment is confirmed",
      start: [year, month, day, hours, minutes],
      duration: { minutes: totalDuration > 0 ? totalDuration : 60 },
      location: booking.saloon_id?.address || "Salon Location",
      status: "CONFIRMED",
    };

    createEvents([eventData], (error, value) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Failed to generate calendar file",
          error,
        });
      }

      res.setHeader("Content-Type", "text/calendar");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=booking-${booking._id}.ics`
      );
      return res.send(value);
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
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  updateBookingStatusBulk,
  refundBooking,
  getRefundSummary,
  markAsCompleted,
  createServiceBooking,
  verifyPayment,
  getBookingSummary,
  addToCalendar,
  cancelBooking
};
