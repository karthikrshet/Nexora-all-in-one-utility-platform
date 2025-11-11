// backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";
import User, { INTERESTS } from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
// NOTE: removed sendVerificationMail import since verification is disabled

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

/**
 * Helper: sign JWT with a consistent payload used across the app
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      isSuperAdmin: !!user.isSuperAdmin
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/**
 * POST /api/auth/register
 * Creates a new user and auto-verifies them (no email flow).
 * Returns token + user object so frontend can store session immediately.
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, username, password, role: requestedRole } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    // check duplicate by email or username (case-insensitive email)
    const duplicate = await User.findOne({
      $or: [
        { email: new RegExp(`^${String(email)}$`, "i") },
        ...(username ? [{ username }] : [])
      ]
    });
    if (duplicate) return res.status(400).json({ error: "Email or username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const isFirst = (await User.countDocuments()) === 0;

    const user = await User.create({
      name,
      email,
      username: username || email.split("@")[0],
      password: hashed,
      role: isFirst ? "admin" : (requestedRole || "user"),
      isSuperAdmin: !!isFirst,
      verified: true, // AUTO-VERIFY
      interests: [],
      darkMode: false,
      points: 0
    });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isSuperAdmin: !!user.isSuperAdmin,
        interests: user.interests,
        darkMode: user.darkMode,
        points: user.points
      }
    });
  } catch (e) {
    console.error("register error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate (by username or email) and return token + user.
 * No verification gate (since verification removed).
 */
router.post("/login", async (req, res) => {
  try {
    // Accept either emailOrUsername, username, or email for compatibility
    const identifier = req.body.emailOrUsername || req.body.username || req.body.email;
    const { password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/Email and password required" });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: new RegExp(`^${String(identifier)}$`, "i") }
      ]
    });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isSuperAdmin: !!user.isSuperAdmin,
        interests: user.interests || [],
        darkMode: !!user.darkMode,
        points: user.points || 0
      }
    });
  } catch (e) {
    console.error("login error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * PUT /api/auth/preferences
 * Save preferences (requires auth)
 */
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { interests, darkMode } = req.body || {};
    const update = {};
    if (Array.isArray(interests)) update.interests = interests;
    if (typeof darkMode === "boolean") update.darkMode = darkMode;

    const u = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select("-password");
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user: u });
  } catch (e) {
    console.error("preferences save error:", e && e.stack ? e.stack : e);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

/* ------------------------------
   Avatar upload endpoint(s)
   ------------------------------ */
// Ensure uploads folder exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) { /* ignore */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter
});

/**
 * POST /api/auth/upload-avatar
 * Auth required. Stores file in /uploads and saves URL on user.
 */
router.post("/upload-avatar", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { $set: { avatar: url } }, { new: true }).select("-password");
    return res.json({ ok: true, avatar: url });
  } catch (e) {
    console.error("Avatar upload error:", e && e.stack ? e.stack : e);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// Update profile
router.put("/profile", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, email } = req.body || {};
    if (!name && !email) return res.status(400).json({ error: "Nothing to update" });

    const update = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof email === "string") update.email = email.trim();

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ error: "User not found" });

    return res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    console.error("PUT /api/auth/profile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



export default router;
