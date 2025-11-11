// routes/commentRoutes.js
import express from "express";
import CommentModel from "../models/Comment.js";
import AppModel from "../models/App.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// list (optionally by appId)
router.get("/", authenticate, async (req, res) => {
  const { appId } = req.query;
  const q = appId ? { appId } : {};
  const comments = await CommentModel.find(q).sort({ timestamp: -1 }).lean();
  res.json(comments);
});

// create (per-app)
router.post("/", authenticate, async (req, res) => {
  const { text, appId } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });
  let payload = { text, user: req.user.username, userId: req.user.id };
  if (appId) {
    const app = await AppModel.findById(appId);
    if (!app) return res.status(404).json({ error: "App not found" });
    payload.appId = appId;
  }
  const comment = await CommentModel.create(payload);
  res.json(comment);
});

export default router;
