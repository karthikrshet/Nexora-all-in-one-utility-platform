// backend/models/ShareLink.js
import mongoose from "mongoose";

const ShareLinkSchema = new mongoose.Schema({
  appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: false },
  originalUrl: { type: String, required: true },
  shortId: { type: String, required: true, index: { unique: true } },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  expiresAt: { type: Date, default: null },
  meta: { type: mongoose.Mixed, default: {} },
  analytics: {
    clicks: { type: Number, default: 0 },
    byReferrer: { type: Map, of: Number, default: {} },
    byPlatform: { type: Map, of: Number, default: {} },
    lastClickAt: { type: Date, default: null }
  }
}, { timestamps: true });

export default mongoose.model("ShareLink", ShareLinkSchema);
