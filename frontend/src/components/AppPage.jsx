// src/pages/AppPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import GameWrapper from "../components/GameWrapper";
import { GAMES_MAP, gamesList as GAMES_LIST } from "../components/GamesCollection";

/**
 * Dedicated page for a single app.
 * - GET /api/apps/:id (backend)
 * - If the app matches a built-in game slug, render it via GameWrapper.
 * - Otherwise show preview + "Open in new tab" and record click when opened.
 */
export default function AppPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const { data } = await api.get(`/api/apps/${id}`);
        if (!mounted) return;
        setApp(data);
      } catch (e) {
        console.error("Failed to load app", e);
        setError(e?.response?.data?.error || "Failed to load app");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) return <div className="p-6">Loading app…</div>;
  if (error) return (
    <div className="p-6">
      <div className="text-red-600 mb-3">Error: {error}</div>
      <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
  if (!app) return <div className="p-6">App not found</div>;

  // Detect built-in game by slug in games list
  const key = (app.slug || app.id || "").toString();
  const gameMeta = (GAMES_LIST || []).find(g => g.slug === key);
  const GameComponent = gameMeta ? GAMES_MAP[gameMeta.slug] : null;

  return (
    <div className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <img src={app.image || "https://placehold.co/120"} alt={app.name} className="w-24 h-24 rounded object-cover" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{app.name}</h1>
          <p className="text-sm text-gray-500">{app.description}</p>
          <div className="mt-2 text-xs text-gray-500">Clicks: {app.clicks || 0} • Likes: {(app.likesCount ?? ((app.likedBy || []).length)) || 0}</div>
        </div>
        <div className="ml-auto">
          <button onClick={() => navigate(-1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">Back</button>
        </div>
      </div>

      {GameComponent ? (
        <div>
          <h2 className="text-lg font-medium mb-3">Play {app.name}</h2>
          <div className="bg-white dark:bg-gray-800 rounded p-4 shadow">
            <GameWrapper
              slug={gameMeta.slug}
              GameComponent={GameComponent}
              gameProps={{}}
              autoCloseOnWin={false}
              onSessionSaved={async () => {
                // optional: refresh app detail after session saved
                try { const { data } = await api.get(`/api/apps/${id}`); setApp(data); } catch (e) {}
              }}
            />
          </div>
        </div>
      ) : app.url ? (
        <div>
          <h2 className="text-lg font-medium mb-3">Open App</h2>

          <div className="mb-3 border rounded overflow-hidden" style={{ height: 420 }}>
            <iframe title={app.name} src={app.url} className="w-full h-full" sandbox="" />
          </div>

          <div className="flex gap-2">
            <a
              href={app.url}
              target="_blank"
              rel="noreferrer"
              onClick={async () => {
                // record click on backend when user opens in new tab
                try { await api.post(`/api/apps/${app._id || id}/click`); } catch (e) { /* non-blocking */ }
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Open in new tab
            </a>

            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded">Done</button>
          </div>
        </div>
      ) : (
        <div>No URL or playable game available for this app.</div>
      )}
    </div>
  );
}
