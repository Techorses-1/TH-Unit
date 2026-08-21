const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const GlobalCounter = require("../models/globalCounter");
const upload = require("../middlewares/upload");
const fs = require("fs");
const path = require("path");

/* ================= HELPER FUNCTIONS ================= */
function getExpenseNo(counter) {
  return `EXP${new Date().getFullYear()}${String(counter).padStart(4, "0")}`;
}

/* ================= CREATE EXPENSE (UPDATED) ================= */
router.post("/create", upload.single("document"), async (req, res) => {
  const startTime = Date.now();
  const requestId = `EXP_CREATE_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  try {
    console.log(`🔄 [${requestId}] Expense creation started`);
    console.log("📝 Request body:", req.body); // Debug log

    const {
      dateFrom,
      dateTo,
      category,
      customCategory = "",
      description,
      amount,
      paymentMode,
      paymentStatus,
      vendorName,
      vendorType,
      vendorContact = "",
    } = req.body;

    /* ================= CATEGORY HANDLING (FIXED) ================= */
    let finalCategory = category;
    let finalCustomCategory = "";

    // If category is "OTHER" and customCategory is provided
    if (category === "OTHER" && customCategory && customCategory.trim() !== "") {
      // Use the custom text as the actual category
      finalCategory = customCategory.trim();
      finalCustomCategory = customCategory.trim();
    } else if (category === "OTHER") {
      // If "OTHER" but no customCategory provided
      finalCategory = "Other";
      finalCustomCategory = "";
    } else {
      // For predefined categories
      finalCategory = category;
      finalCustomCategory = "";
    }

    console.log(`📋 Category processing:`);
    console.log(`   Original category: ${category}`);
    console.log(`   Custom category: ${customCategory}`);
    console.log(`   Final category: ${finalCategory}`);
    console.log(`   Final customCategory: ${finalCustomCategory}`);

    /* ================= VALIDATION ================= */
    if (!dateFrom || !dateTo || !description || !amount || 
        !paymentMode || !paymentStatus || !vendorName || !vendorType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missingFields: {
          dateFrom: !dateFrom,
          dateTo: !dateTo,
          description: !description,
          amount: !amount,
          paymentMode: !paymentMode,
          paymentStatus: !paymentStatus,
          vendorName: !vendorName,
          vendorType: !vendorType,
        }
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
        field: "amount",
        value: amount,
      });
    }

    // Validate dates
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
        field: "dates",
        dateFrom: dateFrom,
        dateTo: dateTo,
      });
    }
    
    if (fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
        field: "dateFrom",
        dateFrom: dateFrom,
        dateTo: dateTo,
      });
    }

    /* ================= GENERATE EXPENSE NUMBER ================= */
    const counter = await GlobalCounter.findOneAndUpdate(
      { id: "expense" },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    const expenseNo = getExpenseNo(counter.count);
    console.log(`🔢 [${requestId}] Expense No generated: ${expenseNo}`);

    /* ================= HANDLE UPLOADED FILE ================= */
    let documentData = {};
    if (req.file) {
      documentData = {
        documentUrl: `/uploads/expenses/${req.file.filename}`,
        documentFileName: req.file.filename,
        documentOriginalName: req.file.originalname,
        documentSize: req.file.size,
        documentMimeType: req.file.mimetype,
      };
      console.log(`📎 [${requestId}] File uploaded: ${req.file.originalname}`);
    }

    /* ================= CREATE EXPENSE RECORD ================= */
    const expense = new Expense({
      expenseNo,
      dateFrom: fromDate,
      dateTo: toDate,
      category: finalCategory, // Use the calculated category
      customCategory: finalCustomCategory, // Store custom category
      description,
      amount: amountNum,
      paymentMode,
      paymentStatus,
      vendorName,
      vendorType,
      vendorContact,
      ...documentData,
      updateHistory: [],
    });

    console.log(`💾 [${requestId}] Saving expense record:`, {
      expenseNo,
      category: finalCategory,
      customCategory: finalCustomCategory,
      amount: amountNum,
    });

    await expense.save();
    console.log(`✅ [${requestId}] Expense saved: ${expenseNo}`);

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense.toObject(),
      processingTime: `${Date.now() - startTime}ms`,
      categoryInfo: {
        original: category,
        custom: customCategory,
        savedAs: finalCategory,
      }
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Error creating expense:`, error.message);
    console.error(error.stack);
    
    // Clean up uploaded file if error occurred
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Failed to delete file: ${err.message}`);
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Expense number already exists",
        error: "Duplicate expense entry",
        field: "expenseNo",
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/* ================= UPDATE EXPENSE (Also needs update for consistency) ================= */
router.put("/update/:expenseId", upload.single("document"), async (req, res) => {
  const startTime = Date.now();
  const requestId = `EXP_UPDATE_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  let oldDocumentPath = null;

  try {
    console.log(`🔄 [${requestId}] Expense update started: ${req.params.expenseId}`);

    // Find existing expense
    const expense = await Expense.findOne({
      $or: [
        { expenseId: req.params.expenseId },
        { expenseNo: req.params.expenseId },
      ],
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    /* ================= VALIDATION ================= */
    const {
      dateFrom,
      dateTo,
      category,
      customCategory = "",
      description,
      amount,
      paymentMode,
      paymentStatus,
      vendorName,
      vendorType,
      vendorContact = "",
      updateReason = "Manual update",
      updatedBy = "admin",
      removeDocument = false,
    } = req.body;

    /* ================= CATEGORY HANDLING (SAME AS CREATE) ================= */
    let finalCategory = category;
    let finalCustomCategory = "";

    if (category === "OTHER" && customCategory && customCategory.trim() !== "") {
      finalCategory = customCategory.trim();
      finalCustomCategory = customCategory.trim();
    } else if (category === "OTHER") {
      finalCategory = "Other";
      finalCustomCategory = "";
    } else {
      finalCategory = category;
      finalCustomCategory = "";
    }

    // Track changes
    const changes = {};
    const oldData = {
      dateFrom: expense.dateFrom,
      dateTo: expense.dateTo,
      category: expense.category,
      customCategory: expense.customCategory,
      description: expense.description,
      amount: expense.amount,
      paymentMode: expense.paymentMode,
      paymentStatus: expense.paymentStatus,
      vendorName: expense.vendorName,
      vendorType: expense.vendorType,
      vendorContact: expense.vendorContact,
      documentFileName: expense.documentFileName,
    };

    // Update fields if provided
    if (dateFrom !== undefined) {
      const newDate = new Date(dateFrom);
      if (newDate.toString() !== "Invalid Date") {
        changes.dateFrom = { from: expense.dateFrom, to: newDate };
        expense.dateFrom = newDate;
      }
    }

    if (dateTo !== undefined) {
      const newDate = new Date(dateTo);
      if (newDate.toString() !== "Invalid Date") {
        changes.dateTo = { from: expense.dateTo, to: newDate };
        expense.dateTo = newDate;
      }
    }

    if (category !== undefined) {
      changes.category = { from: expense.category, to: finalCategory };
      expense.category = finalCategory;
      expense.customCategory = finalCustomCategory;
    }

    if (description !== undefined) {
      changes.description = { from: expense.description, to: description };
      expense.description = description;
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum) && amountNum >= 0) {
        changes.amount = { from: expense.amount, to: amountNum };
        expense.amount = amountNum;
      }
    }

    if (paymentMode !== undefined) {
      changes.paymentMode = { from: expense.paymentMode, to: paymentMode };
      expense.paymentMode = paymentMode;
    }

    if (paymentStatus !== undefined) {
      changes.paymentStatus = { from: expense.paymentStatus, to: paymentStatus };
      expense.paymentStatus = paymentStatus;
    }

    if (vendorName !== undefined) {
      changes.vendorName = { from: expense.vendorName, to: vendorName };
      expense.vendorName = vendorName;
    }

    if (vendorType !== undefined) {
      changes.vendorType = { from: expense.vendorType, to: vendorType };
      expense.vendorType = vendorType;
    }

    if (vendorContact !== undefined) {
      changes.vendorContact = { from: expense.vendorContact, to: vendorContact };
      expense.vendorContact = vendorContact;
    }

    /* ================= HANDLE DOCUMENT UPDATE ================= */
    if (removeDocument === "true" || removeDocument === true) {
      // Remove existing document
      if (expense.documentFileName) {
        oldDocumentPath = path.join("uploads/expenses", expense.documentFileName);
        changes.document = { 
          from: expense.documentFileName, 
          to: "Removed" 
        };
        
        expense.documentUrl = "";
        expense.documentFileName = "";
        expense.documentOriginalName = "";
        expense.documentSize = 0;
        expense.documentMimeType = "";
      }
    } else if (req.file) {
      // New document uploaded
      if (expense.documentFileName) {
        oldDocumentPath = path.join("uploads/expenses", expense.documentFileName);
      }
      
      changes.document = { 
        from: expense.documentFileName || "None", 
        to: req.file.filename 
      };
      
      expense.documentUrl = `/uploads/expenses/${req.file.filename}`;
      expense.documentFileName = req.file.filename;
      expense.documentOriginalName = req.file.originalname;
      expense.documentSize = req.file.size;
      expense.documentMimeType = req.file.mimetype;
    }

    /* ================= SAVE UPDATES ================= */
    expense.lastUpdated = new Date();
    
    if (Object.keys(changes).length > 0) {
      expense.updateHistory.push({
        updatedAt: new Date(),
        updatedBy,
        changes,
        reason: updateReason,
      });
    }

    await expense.save();
    console.log(`💾 [${requestId}] Expense updated: ${expense.expenseNo}`);

    /* ================= CLEANUP OLD DOCUMENT ================= */
    if (oldDocumentPath && fs.existsSync(oldDocumentPath)) {
      fs.unlink(oldDocumentPath, (err) => {
        if (err) {
          console.error(`Failed to delete old document: ${err.message}`);
        } else {
          console.log(`🗑️ [${requestId}] Old document deleted: ${path.basename(oldDocumentPath)}`);
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: {
        expense: expense.toObject(),
        changes: Object.keys(changes).length > 0 ? changes : null,
        processingTime: `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Update error:`, error.message);
    
    // Clean up new file if error occurred
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Failed to delete file: ${err.message}`);
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
    });
  }
});






/* ================= GET ALL EXPENSES ================= */
router.get("/get-all", async (req, res) => {
  try {
    const expenses = await Expense.find({})
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${expenses.length} expense records`);
    res.status(200).json(expenses);

  } catch (error) {
    console.error("❌ Error fetching expenses:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
});

/* ================= GET EXPENSE BY ID ================= */
router.get("/get/:expenseId", async (req, res) => {
  try {
    const expense = await Expense.findOne({
      $or: [
        { expenseId: req.params.expenseId },
        { expenseNo: req.params.expenseId },
      ],
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
    });

  } catch (error) {
    console.error("❌ Error fetching expense:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
      error: error.message,
    });
  }
});

/* ================= DELETE EXPENSE ================= */
router.delete("/delete/:expenseId", async (req, res) => {
  const startTime = Date.now();
  const requestId = `EXP_DELETE_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    console.log(`🗑️ [${requestId}] Expense deletion started: ${req.params.expenseId}`);

    // Find expense
    const expense = await Expense.findOne({
      $or: [
        { expenseId: req.params.expenseId },
        { expenseNo: req.params.expenseId },
      ],
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Delete associated document if exists
    if (expense.documentFileName) {
      const filePath = path.join("uploads/expenses", expense.documentFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ [${requestId}] Document deleted: ${expense.documentFileName}`);
      }
    }

    // Delete expense record
    await Expense.deleteOne({ _id: expense._id });
    console.log(`✅ [${requestId}] Expense deleted: ${expense.expenseNo}`);

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
      data: {
        deletedExpenseNo: expense.expenseNo,
        processingTime: `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Delete error:`, error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete expense",
      error: error.message,
    });
  }
});

/* ================= SERVE UPLOADED FILES ================= */
router.get("/document/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "..", "uploads", "expenses", filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".jpg" || ext === ".jpeg") {
      contentType = "image/jpeg";
    } else if (ext === ".png") {
      contentType = "image/png";
    } else if (ext === ".gif") {
      contentType = "image/gif";
    }

    // Set headers and send file
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.sendFile(filePath);

  } catch (error) {
    console.error("❌ Error serving document:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to serve document",
      error: error.message,
    });
  }
});

module.exports = router;