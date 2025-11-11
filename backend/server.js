// server.js
// server.js (top)
import dotenv from "dotenv";
dotenv.config();
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import appRoutes from "./routes/appRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import shareRoutes from "./routes/shareRoutes.js";
import expressStatic from "express";
import adminShareRoutes from "./routes/adminShareRoutes.js";
import gamesRoutes from "./routes/gamesRoutes.js";



const app = express();

// --- CORS: allow your frontend origin (needed for email verify flow redirect/UI) ---
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// --- DB connect ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mern_dashboard";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));

// --- health + root ---
app.get("/", (_req, res) => res.json({ ok: true, message: "API running" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- routes ---//

app.use("/api/auth", authRoutes);        // /register, /verify, /resend, /login, /preferences
app.use("/api/apps", appRoutes);         // apps list, stats, click, like, etc.
app.use("/api/comments", commentRoutes); // global/app comment endpoints
app.use("/api/admin", adminRoutes);      // admin-only APIs
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/api/share", shareRoutes);
app.use("/s", shareRoutes); 
app.use("/api/admin/shares", adminShareRoutes);
app.use("/api/games", gamesRoutes);

// --- error fallback ---
app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});
console.log("[env] SMTP_USER:", process.env.SMTP_USER ? "set" : "missing");


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
