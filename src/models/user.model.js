const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, maxlength: 100 },
    email_address: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    password: { type: String, minlength: 6, select: false },

    phone_number: { type: String, maxlength: 100 },
    dialing_code: { type: String, maxlength: 10 },

    date_of_birth: { type: Date },
    gender: { type: String, maxlength: 25, enum: ["male", "female", "other"] },

    auth_provider: { type: String, maxlength: 100 },
    auth_provider_id: { type: String, maxlength: 100 },

    profile_picture: { type: String },
    specialities: { type: String },

    status: {
      type: String,
      maxlength: 50,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },
    suspension_reason: { type: String },

    last_login: { type: Date },
    otp: { type: Number },
    isVerified: { type: Boolean, default: false },
    otpExpiresAt: { type: Date },

    deleted_at: { type: Date },
    deleted_reason: { type: String }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 🔐 Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Method to check password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
