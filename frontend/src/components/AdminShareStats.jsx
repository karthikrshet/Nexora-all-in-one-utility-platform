// src/components/AdminShareStats.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminShareStats() {
  const [overview, setOverview] = useState(null);
  const [top, setTop] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ov, t, r] = await Promise.all([
          api.get("/api/admin/shares/overview"),
          api.get("/api/admin/shares/top?limit=10"),
          api.get("/api/admin/shares/recent?limit=10"),
        ]);
        setOverview(ov.data);
        setTop(t.data.data || []);
        setRecent(r.data.data || []);
      } catch (e) {
        console.error("AdminShareStats load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">Loading share stats...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-3">Share Analytics</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500">Short links</div>
          <div className="text-2xl font-bold">{overview?.totalShortLinks ?? 0}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500">Total share clicks</div>
          <div className="text-2xl font-bold">{overview?.totalClicks ?? 0}</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-medium mb-2">Top short links</h4>
        {top.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-1">ShortId</th>
                <th>Clicks</th>
                <th>AppId</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {top.map((t) => (
                <tr key={t._id} className="border-t">
                  <td className="py-2"><a className="text-indigo-600" href={t.originalUrl} target="_blank" rel="noreferrer">{t.shortId}</a></td>
                  <td>{t.analytics?.clicks ?? 0}</td>
                  <td>{t.appId ?? "-"}</td>
                  <td className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-sm text-gray-500">No short links yet.</div>}
      </div>

      <div>
        <h4 className="font-medium mb-2">Recent links</h4>
        {recent.length ? (
          <ul className="space-y-2 text-sm">
            {recent.map(r => (
              <li key={r._id} className="flex items-center justify-between">
                <div>
                  <div><a href={r.originalUrl} target="_blank" rel="noreferrer" className="text-indigo-600">{r.shortId}</a></div>
                  <div className="text-xs text-gray-500">{r.appId ?? "—"} • {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-xs text-gray-600">{r.analytics?.clicks ?? 0} clicks</div>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-gray-500">No recent links</div>}
      </div>
    </div>
  );
}
