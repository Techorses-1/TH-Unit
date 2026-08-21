const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const expenseSchema = new mongoose.Schema(
  {
    expenseId: {
      type: String,
      default: uuidv4,
      unique: true,
    },

    expenseNo: {
      type: String,
      required: true,
      unique: true,
    },

    // Date Range
    dateFrom: {
      type: Date,
      required: true,
    },
    dateTo: {
      type: Date,
      required: true,
    },

    // Category - REMOVED ENUM to allow custom categories
    category: {
      type: String,
      required: true,
      trim: true,
    },
    customCategory: {
      type: String,
      default: "",
      trim: true,
    },

    // Expense Details
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment Details
    paymentMode: {
      type: String,
      required: true,
      enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "UPI"],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["PAID", "PENDING"],
      default: "PENDING",
    },

    // Vendor Details
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    vendorType: {
      type: String,
      required: true,
      enum: ["INDIVIDUAL", "COMPANY"],
    },
    vendorContact: {
      type: String,
      default: "",
      trim: true,
    },

    // Document Details
    documentUrl: {
      type: String,
      default: "",
    },
    documentFileName: {
      type: String,
      default: "",
    },
    documentOriginalName: {
      type: String,
      default: "",
    },
    documentSize: {
      type: Number,
      default: 0,
    },
    documentMimeType: {
      type: String,
      default: "",
    },

    // Update History
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updateHistory: [
      {
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: String, default: "admin" },
        changes: { type: Object },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for faster queries
expenseSchema.index({ expenseNo: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paymentStatus: 1 });
expenseSchema.index({ vendorName: 1 });
expenseSchema.index({ dateFrom: 1, dateTo: 1 });
expenseSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Expense", expenseSchema);