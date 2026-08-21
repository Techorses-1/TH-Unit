const mongoose = require("mongoose");

const waterRateSchema = new mongoose.Schema(
  {
    unitRate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaterRate", waterRateSchema);
