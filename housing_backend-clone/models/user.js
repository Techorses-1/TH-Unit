const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ name: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userId: 1 });

module.exports = mongoose.model("User", userSchema);
