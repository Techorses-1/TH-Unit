const express = require("express");
const router = express.Router();
const WaterRate = require("../models/WaterRate");

/* GET */
router.get("/get", async (req, res) => {
  const rate = await WaterRate.findOne();
  res.json(rate);
});

/* CREATE (ONLY IF NOT EXISTS) */
router.post("/create", async (req, res) => {
  const existing = await WaterRate.findOne();
  if (existing) {
    return res.status(400).json({
      message: "Water rate already exists",
    });
  }

  const rate = await WaterRate.create(req.body);

  console.info("[WATER RATE CREATED]", {
    unitRate: rate.unitRate,
    time: new Date().toISOString(),
  });

  res.status(201).json(rate);
});

/* UPDATE */
router.put("/update/:id", async (req, res) => {
  const updated = await WaterRate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Rate not found" });
  }

  console.info("[WATER RATE UPDATED]", {
    unitRate: updated.unitRate,
    time: new Date().toISOString(),
  });

  res.json(updated);
});

/* DELETE */
router.delete("/delete/:id", async (req, res) => {
  const deleted = await WaterRate.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ message: "Rate not found" });
  }

  console.warn("[WATER RATE DELETED]", {
    time: new Date().toISOString(),
  });

  res.json({ message: "Water rate deleted" });
});

module.exports = router;
