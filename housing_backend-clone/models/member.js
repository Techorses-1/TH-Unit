const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      default: uuidv4,
      unique: true,
    },

    flatNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    type: {
      type: String,
      enum: ["OWNER", "RENT", "SHOP", "CLOSE"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    unitsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

memberSchema.index({ flatNumber: 1 }, { unique: true });

module.exports = mongoose.model("Member", memberSchema);
