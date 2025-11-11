// src/pages/AppDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function AppDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/api/apps/${id}`); // <-- public endpoint
        if (mounted) setApp(data);
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.error || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }
  if (err || !app) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-red-600">{err || "App not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/" className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold">{app.icon} {app.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Open in new tab
          </a>
        </div>
      </header>

      <main className="p-4">
        {app.description && (
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {app.description}
          </p>
        )}

        <div className="h-[80vh] border rounded overflow-hidden border-gray-200 dark:border-gray-700">
          {/* Keep sandbox relaxed enough for most apps but still safer */}
          <iframe
            title={app.name}
            src={app.url}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </main>
    </div>
  );
}
