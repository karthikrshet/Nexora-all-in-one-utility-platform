// backend/routes/shareRoutes.js
import express from "express";
import { nanoid } from "nanoid";
import ShareLink from "../models/ShareLink.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// create a short link
router.post("/", authenticate, async (req, res) => {
  try {
    const { url, appId, expiresInDays = 30, meta } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });

    const shortId = nanoid(8);
    const expiresAt = expiresInDays ? new Date(Date.now() + (expiresInDays * 24 * 3600 * 1000)) : null;
    const doc = await ShareLink.create({
      appId,
      originalUrl: url,
      shortId,
      createdBy: req.user?.id,
      expiresAt,
      meta: meta || {}
    });

    // expose public short URL
    const shortUrl = `${req.protocol}://${req.get("host")}/s/${shortId}`;
    res.json({ ok: true, shortUrl, id: doc._id, shortId });
  } catch (e) {
    console.error("create share failed", e);
    res.status(500).json({ error: "Create failed" });
  }
});

// optional quick track endpoint (from client)
router.post("/track", authenticate, async (req, res) => {
  try {
    const { appId, kind } = req.body;
    // you can implement whatever analytics you want here
    // for now just log
    console.log("track share", req.user?.id, appId, kind);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "track failed" });
  }
});

// redirect endpoint - placed in server.js as a mounted route
// GET /s/:shortId  -> redirect to originalUrl and increment analytics
router.get("/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const doc = await ShareLink.findOne({ shortId });
    if (!doc) return res.status(404).send("Link not found");

    if (doc.expiresAt && new Date() > doc.expiresAt) return res.status(410).send("Link expired");

    // increment analytics
    doc.analytics.clicks = (doc.analytics.clicks || 0) + 1;
    const ref = req.get("referrer") || req.get("referer") || "direct";
    doc.analytics.byReferrer.set(ref, (doc.analytics.byReferrer.get(ref) || 0) + 1);

    const ua = req.get("user-agent") || "";
    let platform = "unknown";
    if (/mobile/i.test(ua)) platform = "mobile";
    else platform = "desktop";
    doc.analytics.byPlatform.set(platform, (doc.analytics.byPlatform.get(platform) || 0) + 1);
    doc.analytics.lastClickAt = new Date();
    await doc.save();

    // Redirect
    return res.redirect(302, doc.originalUrl);
  } catch (e) {
    console.error("redirect short", e);
    return res.status(500).send("Internal");
  }
});

export default router;
