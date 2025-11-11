// routes/appRoutes.js
import express from "express";
import mongoose from "mongoose";
import AppModel from "../models/App.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();
const { ObjectId } = mongoose.Types;

/** Admin helper (optional: if you already have requireAdmin in middleware, use that) */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
};

/** Validate :id params to avoid Mongoose CastError */
function validateAppId(req, res, next) {
  const id = req.params.id;
  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid app id" });
  }
  next();
}

/* -------------------------------------------
 * LIST (supports ?category=, ?interests=true, ?sort=clicks|likes|new|trending)
 * Default sort = clicks (Top Clicked first)
 * -----------------------------------------*/
router.get("/", authenticate, async (req, res) => {
  try {
    const { category, interests, sort } = req.query;
    const q = {};

    // filter by category (games/tools/daily/professional/technology/other)
    if (category) q.category = category;

    // filter by user interests if requested
    if (interests === "true" && req.user?.interests?.length) {
      q.category = q.category ? q.category : { $in: req.user.interests };
    }

    // DB sorts (likes is handled in-memory because likedBy is an array)
    const sortMap = {
      clicks:   { clicks: -1, createdAt: -1 },
      new:      { createdAt: -1 },
      trending: { clicks: -1, createdAt: -1 }, // simple fallback
    };
    const wantLikes = sort === "likes";
    const sortSpec = wantLikes ? { createdAt: -1 } : (sortMap[sort] || sortMap.clicks);

    const apps = await AppModel.find(q).sort(sortSpec).lean();
    const userId = req.user.id;

    // map common fields + like flags
    let mapped = apps.map(a => ({
      _id: a._id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      image: a.image,
      url: a.url,
      category: a.category,
      tags: a.tags || [],
      clicks: a.clicks || 0,
      likesCount: (a.likedBy || []).length,
      liked: (a.likedBy || []).some(u => String(u) === String(userId)),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    // in-memory likes sort (desc)
    if (wantLikes) {
      mapped.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }

    res.json(mapped);
  } catch (err) {
    console.error("GET /api/apps failed:", err);
    res.status(500).json({ error: "Failed to fetch apps" });
  }
});

/* -------------------------------------------
 * STATS (dashboard)
 * -----------------------------------------*/
router.get("/stats", authenticate, async (_req, res) => {
  try {
    const totalApps = await AppModel.countDocuments();

    const clicksAgg = await AppModel.aggregate([{ $group: { _id: null, sum: { $sum: "$clicks" } } }]);
    const totalClicks = clicksAgg[0]?.sum || 0;

    const likesAgg = await AppModel.aggregate([
      { $project: { sz: { $size: { $ifNull: ["$likedBy", []] } } } },
      { $group: { _id: null, sum: { $sum: "$sz" } } },
    ]);
    const totalLikes = likesAgg[0]?.sum || 0;

    res.json({
      apps: totalApps,
      clicks: totalClicks,
      liked: totalLikes,
      appsThisMonth: 0,
      clicksToday: 0,
      likesThisWeek: 0,
    });
  } catch (err) {
    console.error("GET /api/apps/stats failed:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* -------------------------------------------
 * ANALYTICS (demo)
 * -----------------------------------------*/
router.get("/analytics/overview", authenticate, async (_req, res) => {
  res.json({ totalVisits: 1542, activeUsers: 87 });
});

/* -------------------------------------------
 * CREATE / UPDATE / DELETE (admin)
 * -----------------------------------------*/
router.post("/create", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  const { name, description, icon, image, url, category, tags } = req.body;
  const app = await AppModel.create({
    name,
    description,
    icon,
    image,
    url,
    category: category || "tools",
    tags: tags || [],
  });
  res.json(app);
});

router.put("/:id", authenticate, requireAdmin, validateAppId, async (req, res) => {
  const { name, description, icon, image, url, category, tags } = req.body;
  const app = await AppModel.findByIdAndUpdate(
    req.params.id,
    { $set: { name, description, icon, image, url, category, tags } },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: "Not found" });
  res.json(app);
});

router.delete("/:id", authenticate, requireAdmin, validateAppId, async (req, res) => {
  await AppModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* -------------------------------------------
 * CLICK + LIKE
 * -----------------------------------------*/
router.post("/:id/click", authenticate, validateAppId, async (req, res) => {
  const app = await AppModel.findByIdAndUpdate(
    req.params.id,
    { $inc: { clicks: 1 } },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: "Not found" });
  res.json({ id: app._id, clicks: app.clicks });
});

router.post("/:id/like", authenticate, validateAppId, async (req, res) => {
  const app = await AppModel.findById(req.params.id);
  if (!app) return res.status(404).json({ error: "Not found" });

  const userId = req.user.id;
  const likedBy = app.likedBy || [];
  const idx = likedBy.findIndex(u => String(u) === String(userId));

  if (idx >= 0) likedBy.splice(idx, 1);
  else likedBy.push(userId);

  app.likedBy = likedBy;
  await app.save();

  res.json({ liked: idx < 0, likesCount: likedBy.length });
});

/* -------------------------------------------
 * GET single app (public)
 * NOTE: keep this simple — no double res.json
 * -----------------------------------------*/
router.get("/:id", validateAppId, async (req, res) => {
  try {
    const app = await AppModel.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ error: "App not found" });
    res.json(app);
  } catch (err) {
    console.error("GET /api/apps/:id failed:", err);
    res.status(500).json({ error: "Failed to load app" });
  }
});

export default router;
