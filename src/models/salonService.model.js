const mongoose = require("mongoose");

const salonServiceSchema = new mongoose.Schema(
  {
    salon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// ✅ Indexes for performance
salonServiceSchema.index({ salon_id: 1, service_id: 1 }, { unique: true });
salonServiceSchema.index({ is_available: 1 });
salonServiceSchema.index({ deleted_at: 1 });

const SalonService = mongoose.model("SalonService", salonServiceSchema);
module.exports = SalonService;
