// backend/routes/gamesRoutes.js
import express from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";
import GameSession from "../models/GameSession.js";

const router = express.Router();

// Use mongoose Types safely
const ObjectId = mongoose.Types.ObjectId;

/**
 * Helper: safe parse ObjectId
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (ObjectId.isValid(id)) return new ObjectId(String(id));
  return null;
}

/**
 * GET /api/games/user-stats
 * Returns aggregate per-user game stats and totals
 */
router.get("/user-stats", authenticate, async (req, res) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    const userObjId = toObjectId(userIdStr);
    if (!userObjId) {
      console.warn("user-stats: invalid user id", userIdStr);
      return res.status(400).json({ ok: false, error: "Invalid user id" });
    }

    const agg = await GameSession.aggregate([
      { $match: { userId: userObjId } },
      {
        $group: {
          _id: "$gameSlug",
          plays: { $sum: 1 },
          wins: { $sum: { $cond: ["$won", 1, 0] } },
          totalPoints: { $sum: { $ifNull: ["$points", 0] } }
        }
      },
      { $project: { gameSlug: "$_id", plays: 1, wins: 1, totalPoints: 1, _id: 0 } }
    ]);

    const totals = agg.reduce((acc, g) => {
      acc.totalPoints += g.totalPoints || 0;
      acc.plays += g.plays || 0;
      return acc;
    }, { totalPoints: 0, plays: 0 });

    res.json({ ok: true, totals, perGame: agg });
  } catch (err) {
    console.error("user-stats error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: "Failed to load user stats" });
  }
});

/**
 * POST /api/games/sessions
 * Save a session (from frontend GameWrapper when a play finishes)
 * Body: { gameSlug, points, won, durationSeconds }
 * Requires auth. Updates user's points quickly (increment).
 */
router.post("/sessions", authenticate, async (req, res) => {
  try {
    const userIdStr = req.user?.id || req.user?._id;
    const userObjId = toObjectId(userIdStr);
    if (!userObjId) return res.status(400).json({ ok: false, error: "Invalid user id" });

    const { gameSlug, points = 0, won = false, durationSeconds = 0, meta = {} } = req.body || {};
    if (!gameSlug) return res.status(400).json({ ok: false, error: "Missing gameSlug" });

    // inside router.post("/sessions")
let pts = Number(points) || 0;

// If game was won but no points assigned, give default win points
if (won && pts === 0) {
  pts = 10; // <-- change this value as your default win points
}

const sessionDoc = await GameSession.create({
  userId: userObjId,
  userName: req.user.name || req.user.username || "user",
  gameSlug,
  points: pts,
  won: !!won,
  durationSeconds: Number(durationSeconds) || 0,
  meta: meta || {},
});

// Increment user's points
await User.findByIdAndUpdate(userObjId, { $inc: { points: pts, plays: 1 } }).lean();


    // Increment user's points (fast feedback); non-blocking
    try {

    } catch (e) {
      console.warn("Failed to increment user.points (non-blocking):", e && e.message ? e.message : e);
    }

    // emit socket event if io available (app.locals.io should be set by server)
    try {
      const io = req.app?.locals?.io;
      if (io) io.emit("game-session", { session: sessionDoc });
    } catch (e) {
      console.warn("socket emit game-session failed (non-blocking):", e && e.message ? e.message : e);
    }

    res.json({ ok: true, session: sessionDoc });
  } catch (err) {
    console.error("save-session error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: "Failed to save session" });
  }
});

/**
 * GET /api/games/sessions/by-game
 * Admin: returns sessions grouped by game slug (limited)
 */
router.get("/sessions/by-game", authenticate, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") return res.status(403).json({ ok: false, error: "Admins only" });

    const agg = await GameSession.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      {
        $group: {
          _id: "$gameSlug",
          sessions: { $push: { userId: "$userId", userName: "$userName", points: "$points", won: "$won", createdAt: "$createdAt" } },
          totalPlays: { $sum: 1 },
          totalPoints: { $sum: { $ifNull: ["$points", 0] } }
        }
      },
      { $project: { gameSlug: "$_id", sessions: 1, totalPlays: 1, totalPoints: 1, _id: 0 } }
    ]);

    res.json({ ok: true, byGame: agg });
  } catch (err) {
    console.error("sessions/by-game error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: "Failed to load sessions" });
  }
});

/**
 * GET /api/games/leaderboard
 * Top users by points
 */
router.get("/leaderboard", async (_req, res) => {
  try {
    const top = await User.find({}).sort({ points: -1 }).limit(20).select("name points username").lean();
    res.json({ ok: true, top });
  } catch (err) {
    console.error("leaderboard error:", err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: "Failed to load leaderboard" });
  }
});

export default router;
