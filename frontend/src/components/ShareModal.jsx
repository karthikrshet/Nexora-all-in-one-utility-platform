// src/components/ShareModal.jsx
import React, { useState, useMemo } from "react";
import api from "../services/api";

export default function ShareModal({ open, onClose, app, onLike, onComments }) {
  const [creating, setCreating] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);
  const [shortError, setShortError] = useState(null);

  if (!open || !app) return null;

  const appId = app._id ?? app.id;

  // Ensure external URL is absolute
  const directAppUrl = useMemo(() => {
    const u = String(app.url || "").trim();
    if (!u) return "";
    try {
      // absolute? fine
      new URL(u);
      return u;
    } catch {
      // relative -> prefix with origin
      return `${window.location.origin}${u.startsWith("/") ? "" : "/"}${u}`;
    }
  }, [app.url]);

  // Your public preview page (always absolute)
  const publicDetailUrl = `${window.location.origin}/apps/${appId}`;

  const handleCopy = async (value) => {
    if (!value) return alert("Nothing to copy");
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  };

  // Create short link for the public preview page (recommended)
  const createShortLink = async () => {
    setShortError(null);
    setShortUrl(null);
    setCreating(true);
    try {
      const res = await api.post("/api/share", {
        url: publicDetailUrl,
        appId,
        expiresInDays: 30,
      });
      if (res?.data?.ok && res?.data?.shortUrl) {
        setShortUrl(res.data.shortUrl);
      } else {
        setShortError(res?.data?.error || "Short link creation failed");
      }
    } catch (err) {
      console.error("createShortLink error", err);
      if (err?.response?.status === 401) setShortError("Not authenticated. Please login.");
      else setShortError("Short link error (check console)");
    } finally {
      setCreating(false);
    }
  };

  // Social share uses short link if available; otherwise public preview
  const shareTo = async (provider) => {
    const urlToShare = shortUrl ?? publicDetailUrl;

    // optional: record share analytics (non-blocking)
    if (appId) {
      api.post(`/api/apps/${appId}/share`, { method: provider }).catch(() => {});
    }

    const encoded = encodeURIComponent(urlToShare);
    const text = encodeURIComponent(
      `${app.name}${app.description ? " — " + app.description : ""}`
    );

    let url = null;
    if (provider === "twitter") url = `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`;
    else if (provider === "facebook") url = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    else if (provider === "linkedin") url = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
    else if (provider === "whatsapp") url = `https://api.whatsapp.com/send?text=${encodeURIComponent(app.name + " " + urlToShare)}`;
    else if (provider === "mailto") url = `mailto:?subject=${encodeURIComponent(app.name)}&body=${encodeURIComponent(urlToShare)}`;

    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {app.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {app.description}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500">✖</button>
        </div>

        {/* External app (no login) */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500">Open app (external URL)</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              readOnly
              value={directAppUrl}
              className="flex-1 px-3 py-2 rounded border bg-gray-100 dark:bg-gray-700 dark:text-white"
            />
            <a
              href={directAppUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className={`px-3 py-2 rounded ${directAppUrl ? "bg-emerald-600 text-white" : "bg-gray-400 cursor-not-allowed text-white"}`}
            >
              Open
            </a>
            <button
              onClick={() => handleCopy(directAppUrl)}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Public detail page (your hosted preview) */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500">Public preview page</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              readOnly
              value={shortUrl ?? publicDetailUrl}
              className="flex-1 px-3 py-2 rounded border bg-gray-100 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={() => handleCopy(shortUrl ?? publicDetailUrl)}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Copy
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={createShortLink}
              disabled={creating}
              className={`px-3 py-2 rounded ${creating ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 text-white"}`}
            >
              {creating ? "Creating..." : (shortUrl ? "Recreate short link" : "Create short link")}
            </button>
            {shortError && <div className="text-sm text-red-500 ml-2">{shortError}</div>}
          </div>
        </div>

        {/* Social buttons use shortUrl (or preview page) */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-2">Share to</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => shareTo("twitter")} className="px-3 py-2 rounded bg-sky-500 text-white">Twitter</button>
            <button onClick={() => shareTo("facebook")} className="px-3 py-2 rounded bg-blue-600 text-white">Facebook</button>
            <button onClick={() => shareTo("linkedin")} className="px-3 py-2 rounded bg-blue-800 text-white">LinkedIn</button>
            <button onClick={() => shareTo("whatsapp")} className="px-3 py-2 rounded bg-green-600 text-white">WhatsApp</button>
            <button onClick={() => shareTo("mailto")} className="px-3 py-2 rounded border">Email</button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => onLike?.()} className="px-3 py-1 bg-white border rounded shadow text-sm">
            ❤️ {app.likesCount ?? 0}
          </button>
          <button
            onClick={() => { onComments?.(); onClose?.(); }}
            className="px-3 py-1 bg-white border rounded shadow text-sm"
          >
            💬 Comments
          </button>
          <div className="text-xs text-gray-500 ml-auto">
            {(app.clicks || 0)} clicks • {(app.likesCount ?? 0)} likes
          </div>
        </div>
      </div>
    </div>
  );
}
