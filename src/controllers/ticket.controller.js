const Ticket = require("../models/ticket.model");
const { uploadMultipleToS3 } = require("../services/awsS3");

const createTicket = async (req, res) => {
  try {
    const { topic, description } = req.body;

    let attachments = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploaded = await uploadMultipleToS3(req.files, "support");
        attachments = uploaded.map((file) => file.Location || file.url);

      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload attachments",
          error: uploadError.message,
        });
      }
    }

    const ticket = await Ticket.create({
      topic,
      description,
      user_id: req.user.id,
      attachments,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user_id: req.user.id });
    return res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      ticket,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  updateTicketStatus
}