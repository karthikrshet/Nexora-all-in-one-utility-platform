// backend/middleware/auth.js
// ESM module — used by routes with `import { authenticate } from "../middleware/auth.js";`
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // adjust path if your User model is elsewhere

// If your project uses a different secret, set it in .env as JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

/**
 * Authenticate middleware (keeps the same name 'authenticate' used in your routes)
 * - verifies Bearer token
 * - sets req.user = user document (lean object) on success
 */
export async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ ok: false, error: "Missing token" });
    const token = auth.replace(/^Bearer\s+/i, "");

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ ok: false, error: "Invalid token", details: err.message });
    }

    // payload.sub or payload.userId depending on how you sign tokens
    const userId = payload.sub || payload.userId || payload.id;
    if (!userId) return res.status(401).json({ ok: false, error: "Invalid token payload" });

    const user = await User.findById(userId).select("-password").lean();
    if (!user) return res.status(401).json({ ok: false, error: "User not found" });

    // attach user to req
    req.user = user;
    next();
  } catch (err) {
    console.error("authenticate error:", err);
    return res.status(500).json({ ok: false, error: "Auth failure", details: err.message });
  }
}

/**
 * Backwards-compatible alias (some files expect isAuthenticated)
 */
export const isAuthenticated = authenticate;

/**
 * Admin middleware
 */
export function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, error: "Unauthorized" });
  if (req.user.role !== "admin" && !req.user.isAdmin) return res.status(403).json({ ok: false, error: "Admin required" });
  next();
}
