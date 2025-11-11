// backend/routes/adminShareRoutes.js
import express from "express";
import ShareLink from "../models/ShareLink.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Require admin role on these endpoints
const requireAdmin = [authenticate, (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}];

// GET /api/admin/shares/overview
// returns summary stats: totalShortLinks, totalClicks
router.get("/overview", requireAdmin, async (req, res) => {
  try {
    const totalShortLinks = await ShareLink.countDocuments();
    const agg = await ShareLink.aggregate([
      { $group: { _id: null, clicks: { $sum: "$analytics.clicks" } } }
    ]);
    const totalClicks = (agg[0] && agg[0].clicks) || 0;
    res.json({ ok: true, totalShortLinks, totalClicks });
  } catch (e) {
    console.error("admin share overview", e);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/shares/top?limit=10
// returns top short links by clicks
router.get("/top", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || "10", 10));
    const docs = await ShareLink.find().sort({ "analytics.clicks": -1 }).limit(limit).lean();
    res.json({ ok: true, data: docs });
  } catch (e) {
    console.error("admin share top", e);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/shares/recent?limit=20
router.get("/recent", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const docs = await ShareLink.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ ok: true, data: docs });
  } catch (e) {
    console.error("admin share recent", e);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
