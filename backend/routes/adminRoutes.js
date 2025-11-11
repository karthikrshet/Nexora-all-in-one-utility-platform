// routes/adminRoutes.js
import express from "express";
import User from "../models/User.js";
import AppModel from "../models/App.js";
import CommentModel from "../models/Comment.js";
import { authenticate } from "../middleware/auth.js";
import { sendNewAppMail } from "../utils/mailer.js";

const router = express.Router();

// --- helpers ---
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};
const requireSuperAdmin = async (req, res, next) => {
  // only super admin can change roles
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Super admin only" });
  }
  next();
};

// all admin routes require auth + admin role
router.use(authenticate, requireAdmin);

/* -------------------------------------------
 * 📊 Admin stats
 * -----------------------------------------*/
router.get("/analytics", authenticate, async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admins only" });
  // compute/return analytics data
  res.json({ totalVisits: 1542, activeUsers: 87, apps: 10, clicks: 500 });
});

router.get("/stats", async (_req, res) => {
  try {
    const users = await User.countDocuments();
    const apps  = await AppModel.countDocuments();
    const comments = await CommentModel.countDocuments();

    const clicksAgg = await AppModel.aggregate([
      { $group: { _id: null, total: { $sum: "$clicks" } } }
    ]);
    const clicks = clicksAgg[0]?.total || 0;

    // total likes across all apps
    const likesAgg = await AppModel.aggregate([
      { $project: { sz: { $size: { $ifNull: ["$likedBy", []] } } } },
      { $group: { _id: null, sum: { $sum: "$sz" } } }
    ]);
    const liked = likesAgg[0]?.sum || 0;

    res.json({ users, apps, comments, clicks, liked }); // ✅ expose liked
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});


/* -------------------------------------------
 * 👤 Users (list / change role / delete)
 * -----------------------------------------*/
router.get("/users", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json(users);
});

// change role — super admin only
router.put("/users/:id", requireSuperAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.role = role;
  await user.save();
  res.json({ ok: true, user });
});

// delete user — admin allowed (prevent deleting super admin)
router.delete("/users/:id", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "User not found" });
  if (u.isSuperAdmin) {
    return res.status(403).json({ error: "Cannot delete super admin" });
  }
  await u.deleteOne();
  res.json({ ok: true });
});

/* -------------------------------------------
 * 📱 Apps (list / create / update / delete)
 * -----------------------------------------*/
router.get("/apps", async (_req, res) => {
  const apps = await AppModel.find().sort({ createdAt: -1 }).lean();
  res.json(apps);
});

router.post("/apps", async (req, res) => {
  const { name, description, icon, image, url, category } = req.body;
  const app = await AppModel.create({
    name,
    description,
    icon,
    image,
    url,
    category: category || "tools",  // ✅ fallback
    clicks: 0,
  });


  // Notify verified users who follow this category
  try {
    const recipients = await User.find({
      verified: true,
      interests: category,
      email: { $exists: true, $ne: null },
    }).select("email -_id");

    if (recipients.length) {
      const batch = recipients.map((r) =>
        sendNewAppMail(r.email, app).catch(() => {})
      );
      Promise.allSettled(batch); // fire-and-forget
    }
  } catch (e) {
    console.warn("Email notify failed (non-blocking):", e.message);
  }

  res.json(app);
});

// update app
router.put("/apps/:id", async (req, res) => {
  const { name, description, icon, image, url } = req.body;
  const updated = await AppModel.findByIdAndUpdate(
    req.params.id,
    { $set: { name, description, icon, image, url } },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "App not found" });
  res.json(updated);
});


// delete app
router.delete("/apps/:id", async (req, res) => {
  await AppModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* -------------------------------------------
 * 💬 Comments (list / reply / status / pin / delete)
 * -----------------------------------------*/
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
const isId = (v) => v && ObjectId.isValid(v);

// List with optional filters: ?appId=&status=open|resolved|hidden&q=search
router.get("/comments", async (req, res) => {
  const { appId, status, q, limit = 50, skip = 0 } = req.query;

  const find = {};
  if (isId(appId)) find.appId = appId;
  if (status) find.status = status;
  if (q && String(q).trim()) {
    const s = String(q).trim();
    find.$or = [
      { text: { $regex: s, $options: "i" } },
      { user: { $regex: s, $options: "i" } },
      { "adminReplies.text": { $regex: s, $options: "i" } },
    ];
  }

  const items = await CommentModel.find(find)
    .sort({ pinned: -1, timestamp: -1 })
    .skip(Number(skip) || 0)
    .limit(Math.min(Number(limit) || 50, 100))
    .lean();

  // Return a plain array because AdminPanel does `setCommentsList(data || [])`
  res.json(items);
});

// Admin reply: returns ONLY the new reply object so AdminPanel can append it
router.post("/comments/:id/reply", async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ error: "Invalid comment id" });

  const body = req.body.reply ?? req.body.text;
  const text = String(body || "").trim();
  if (!text) return res.status(400).json({ error: "Reply required" });

  const reply = {
    text,
    by: req.user._id,
    byName: req.user.name || req.user.username || "Admin",
    at: new Date(),
  };

  const updated = await CommentModel.findByIdAndUpdate(
    id,
    { $push: { adminReplies: reply }, $set: { status: "open" } },
    { new: true, select: { adminReplies: { $slice: -1 } } } // only last reply
  ).lean();

  if (!updated) return res.status(404).json({ error: "Comment not found" });
  // send just the new reply object
  res.json(updated.adminReplies[0]);
});

// Update status (open/resolved/hidden)
router.put("/comments/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!isId(id)) return res.status(400).json({ error: "Invalid comment id" });
  if (!["open", "resolved", "hidden"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const doc = await CommentModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: "Comment not found" });
  res.json(doc);
});

// Pin/unpin
router.put("/comments/:id/pin", async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ error: "Invalid comment id" });
  const doc = await CommentModel.findByIdAndUpdate(
    id,
    { $set: { pinned: !!req.body.pinned } },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: "Comment not found" });
  res.json(doc);
});

// Delete comment
router.delete("/comments/:id", async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ error: "Invalid comment id" });
  await CommentModel.findByIdAndDelete(id);
  res.json({ ok: true });
});

// Delete a specific admin reply
router.delete("/comments/:id/replies/:replyId", async (req, res) => {
  const { id, replyId } = req.params;
  if (!isId(id) || !isId(replyId)) return res.status(400).json({ error: "Invalid id" });
  const doc = await CommentModel.findByIdAndUpdate(
    id,
    { $pull: { adminReplies: { _id: replyId } } },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: "Comment not found" });
  res.json({ ok: true });
});


export default router;
