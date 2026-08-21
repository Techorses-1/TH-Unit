const mongoose = require("mongoose");

const maintenanceRateSchema = new mongoose.Schema(
  {
    ownerRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rentRate: {
      type: Number,
      required: true,
      min: 0,
    },

     shopRate: {  // ADD THIS
      type: Number,
      required: true,
      min: 0,
    },
    closeRate: {  // ADD THIS
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaintenanceRate", maintenanceRateSchema);
