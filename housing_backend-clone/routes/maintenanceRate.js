const express = require("express");
const router = express.Router();
const MaintenanceRate = require("../models/MaintenanceRate");

/* GET */
router.get("/get", async (req, res) => {
  const rate = await MaintenanceRate.findOne();
  res.json(rate);
});

/* CREATE (ONLY IF NOT EXISTS) */
router.post("/create", async (req, res) => {
  const existing = await MaintenanceRate.findOne();
  if (existing) {
    return res.status(400).json({
      message: "Maintenance rate already exists",
    });
  }

  // Set default values for new rates if not provided
  const rateData = {
    ownerRate: req.body.ownerRate || 0,
    rentRate: req.body.rentRate || 0,
    shopRate: req.body.shopRate || 0,  // ADD THIS
    closeRate: req.body.closeRate || 0,  // ADD THIS
  };

  const rate = await MaintenanceRate.create(rateData);

  console.info("[MAINTENANCE RATE CREATED]", {
    ownerRate: rate.ownerRate,
    rentRate: rate.rentRate,
    shopRate: rate.shopRate,  // ADD THIS
    closeRate: rate.closeRate,  // ADD THIS
    time: new Date().toISOString(),
  });

  res.status(201).json(rate);
});

/* UPDATE */
router.put("/update/:id", async (req, res) => {
  const updated = await MaintenanceRate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Rate not found" });
  }

  console.info("[MAINTENANCE RATE UPDATED]", {
    ownerRate: updated.ownerRate,
    rentRate: updated.rentRate,
    shopRate: updated.shopRate,  // ADD THIS
    closeRate: updated.closeRate,  // ADD THIS
    time: new Date().toISOString(),
  });

  res.json(updated);
});

/* DELETE */
router.delete("/delete/:id", async (req, res) => {
  const deleted = await MaintenanceRate.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ message: "Rate not found" });
  }

  console.warn("[MAINTENANCE RATE DELETED]", {
    time: new Date().toISOString(),
  });

  res.json({ message: "Maintenance rate deleted" });
});

module.exports = router;