// src/components/EditableAppRow.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";

/*
  EditableAppRow
  - Small row used by AdminPanel to edit/delete apps
  - Keeps its own local edit state and calls back onSaved/onDelete
*/

export default function EditableAppRow({ app, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: app.name || "",
    description: app.description || "",
    icon: app.icon || "📦",
    image: app.image || "",
    url: app.url || "",
    category: app.category || "other"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      name: app.name || "",
      description: app.description || "",
      icon: app.icon || "📦",
      image: app.image || "",
      url: app.url || "",
      category: app.category || "other"
    });
  }, [app._id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        icon: draft.icon,
        image: draft.image,
        url: draft.url,
        category: draft.category
      };
      const { data } = await api.put(`/api/admin/apps/${app._id}`, payload);
      onSaved?.(data);
      setEditing(false);
    } catch (e) {
      console.error("Save failed", e);
      alert(e?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
      <div className="flex items-start gap-3">
        <img src={app.image || "https://placehold.co/48"} alt={app.name} className="w-10 h-10 object-cover rounded" />
        <div className="text-sm">
          {!editing ? (
            <>
              <div className="font-medium">{app.name} <span className="opacity-60">{app.icon}</span></div>
              <div className="text-gray-400">Clicks: {app.clicks || 0}</div>
              <div className="text-gray-400 break-all">
                URL:{" "}
                {app.url ? (
                  <a href={app.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{app.url}</a>
                ) : "-"}
              </div>
              <div className="text-xs text-gray-400">Category: {app.category || "other"}</div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={draft.name} onChange={(e)=>setDraft(d=>({...d,name:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600" placeholder="Name"/>
              <input value={draft.icon} onChange={(e)=>setDraft(d=>({...d,icon:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600" placeholder="Icon"/>
              <input value={draft.description} onChange={(e)=>setDraft(d=>({...d,description:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600 sm:col-span-2" placeholder="Description"/>
              <input value={draft.image} onChange={(e)=>setDraft(d=>({...d,image:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600 sm:col-span-2" placeholder="Image URL"/>
              <input value={draft.url} onChange={(e)=>setDraft(d=>({...d,url:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600 sm:col-span-2" placeholder="App/Game URL"/>
              <select value={draft.category} onChange={(e)=>setDraft(d=>({...d,category:e.target.value}))} className="px-2 py-1 rounded border dark:bg-gray-800 dark:border-gray-600">
                <option value="games">games</option>
                <option value="tools">tools</option>
                <option value="daily">daily</option>
                <option value="professional">professional</option>
                <option value="technology">technology</option>
                <option value="other">other</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {!editing ? (
          <>
            <button type="button" onClick={()=>setEditing(true)} className="px-3 py-1 bg-gray-200 rounded dark:bg-gray-600 dark:text-white">Edit</button>
            <a
              href={app.url || "#"}
              target="_blank"
              rel="noreferrer"
              className={`px-3 py-1 rounded ${app.url ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
              onClick={(e) => { if (!app.url) e.preventDefault(); }}
            >
              Open
            </a>
            <button type="button" onClick={() => onDelete(app._id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
          </>
        ) : (
          <>
            <button type="button" onClick={save} disabled={saving} className="px-3 py-1 bg-indigo-600 text-white rounded">
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={()=>{ setEditing(false); setDraft({ name: app.name || "", description: app.description || "", icon: app.icon || "📦", image: app.image || "", url: app.url || "", category: app.category || "other" }); }} className="px-3 py-1 bg-gray-300 rounded dark:bg-gray-600 dark:text-white">Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
