const express = require("express");
const router = express.Router();
const Member = require("../models/member");

// CREATE MEMBER
router.post("/create-member", async (req, res) => {
  try {
    const { flatNumber } = req.body;

    const exists = await Member.findOne({ flatNumber });
    if (exists) {
      return res.status(400).json({
        field: "flatNumber",
        message: "Flat number already exists",
      });
    }

    const member = await Member.create(req.body);

    console.info("[MEMBER CREATED]", {
      memberId: member.memberId,
      flatNumber: member.flatNumber,
      time: new Date().toISOString(),
    });

    res.status(201).json(member);
  } catch (err) {
    console.error("[CREATE MEMBER ERROR]", err);
    res.status(500).json({ message: "Failed to create member" });
  }
});

// GET ALL MEMBERS
router.get("/get-members", async (req, res) => {
  const members = await Member.find({}).sort({ createdAt: -1 });
  res.json(members);
});

// UPDATE MEMBER
router.put("/update-member/:id", async (req, res) => {
  try {
    const updated = await Member.findOneAndUpdate(
      { memberId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Member not found" });
    }

    console.info("[MEMBER UPDATED]", {
      memberId: updated.memberId,
      time: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    console.error("[UPDATE MEMBER ERROR]", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE MEMBER
router.delete("/delete-member/:id", async (req, res) => {
  const deleted = await Member.findOneAndDelete({
    memberId: req.params.id,
  });

  if (!deleted) {
    return res.status(404).json({ message: "Member not found" });
  }

  console.warn("[MEMBER DELETED]", {
    memberId: deleted.memberId,
    flatNumber: deleted.flatNumber,
  });

  res.json({ message: "Member deleted" });
});

// BULK CREATE MEMBERS
// BULK CREATE MEMBERS
router.post("/bulk-create-members", async (req, res) => {
  const { members } = req.body;

  const result = { successful: [], failed: [] };

  for (const m of members) {
    try {
      if (!m.flatNumber || !m.name) { // Removed type check
        throw new Error("Flat Number & Name are required");
      }

      // Clean up mobile and email (trim and handle empty strings)
      const cleanMember = {
        flatNumber: m.flatNumber.trim().toUpperCase(),
        type: m.type?.trim() || "OWNER", // Default to OWNER if not provided
        name: m.name.trim(),
        mobile: m.mobile?.trim() || "", // Allow empty string
        email: m.email?.trim()?.toLowerCase() || "", // Allow empty string
        unitsUsed: Number(m.unitsUsed) || 0,
        pendingAmount: Number(m.pendingAmount) || 0
      };

      const exists = await Member.findOne({ flatNumber: cleanMember.flatNumber });
      if (exists) throw new Error("Flat number already exists");

      const saved = await Member.create(cleanMember);
      result.successful.push(saved);
    } catch (err) {
      result.failed.push({
        member: m,
        error: err.message,
        flatNumber: m.flatNumber
      });
    }
  }

  console.info("[MEMBER BULK UPLOAD]", {
    success: result.successful.length,
    failed: result.failed.length,
  });

  res.json({
    message: "Bulk upload completed",
    result,
  });
});

module.exports = router;
