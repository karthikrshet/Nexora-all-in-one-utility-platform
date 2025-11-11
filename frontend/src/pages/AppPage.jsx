// frontend/src/pages/AppPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AppPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get(`/api/apps/${id}`);
        setApp(data);
      } catch (e) {
        console.error("Failed to load app", e);
        setErr(e?.response?.data?.error || e?.message || "Failed to load app");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading app…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err} <button onClick={() => navigate(-1)} className="ml-2 underline">Go back</button></div>;
  if (!app) return <div className="p-6">App not found <button onClick={() => navigate(-1)} className="ml-2 underline">Go back</button></div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{app.name}</h1>
          <p className="text-sm text-gray-500">{app.description}</p>
          <div className="text-xs text-gray-400 mt-1">{app.clicks || 0} clicks • {app.likesCount ?? 0} likes</div>
        </div>
        <div>
          <button onClick={() => navigate(-1)} className="px-3 py-1 bg-gray-200 rounded">Back</button>
        </div>
      </div>

      {app.url ? (
        // render in an iframe so the app "works there". Caution: some sites block iframe (X-Frame-Options).
        <div className="border rounded overflow-hidden" style={{ height: "70vh" }}>
          <iframe title={app.name} src={app.url} className="w-full h-full" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow dark:bg-gray-800">
          <p>No external URL for this app. You can add one in the admin panel.</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <a href={app.url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-indigo-600 text-white rounded">Open in new tab</a>
      </div>
    </div>
  );
}
