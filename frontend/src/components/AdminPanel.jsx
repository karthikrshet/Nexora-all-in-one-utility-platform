// src/components/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import AdminShareStats from "./AdminShareStats";

/*
  AdminPanel
  - Externalized admin UI (apps / users / comments)
  - Uses EditableAppRow and internal AdminComment
*/
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <AdminShareStats />
  {/* other admin cards */}
</div>

import EditableAppRow from "./EditableAppRow";

export default function AdminPanel({ refreshStats, onLoadUsers, adminUsers: parentAdminUsers = [] }) {
  const [tab, setTab] = useState("apps");
  const [appsList, setAppsList] = useState([]);
  const [users, setUsers] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [newApp, setNewApp] = useState({ name: "", description: "", icon: "📦", image: "", category: "other", url: "" });
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === "apps") loadApps();
    if (tab === "users") loadUsers();
    if (tab === "comments") loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // APPS
  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const { data } = await api.get("/api/admin/apps");
      const normalized = (data || []).map(a => ({ ...a, _id: a._id ?? a.id }));
      setAppsList(normalized);
    } catch (e) {
      console.error("Failed to load admin apps", e);
      setAppsList([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const addApp = async () => {
    if (!newApp.name.trim()) return alert("App name required");
    setSaving(true);
    try {
      const { data } = await api.post("/api/admin/apps", newApp);
      setAppsList(prev => [data, ...prev]);
      setNewApp({ name: "", description: "", icon: "📦", image: "", category: "other", url: "" });
      await refreshStats().catch(()=>{});
      setTab("apps");
    } catch (e) {
      console.error("Add app failed", e);
      alert(e?.response?.data?.error || "Add app failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteApp = async (id) => {
    if (!confirm("Delete this app?")) return;
    try {
      await api.delete(`/api/admin/apps/${id}`);
      setAppsList(prev => prev.filter(a => String(a._id) !== String(id)));
      await refreshStats().catch(()=>{});
    } catch (e) {
      console.error("Delete app failed", e);
      alert(e?.response?.data?.error || "Delete failed");
    }
  };

  // USERS
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/api/admin/users");
      setUsers(data || []);
      if (onLoadUsers) {
        try { onLoadUsers(); } catch(_) {}
      }
    } catch (e) {
      console.error("Failed to load admin users", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.put(`/api/admin/users/${id}`, { role });
      setUsers(prev => prev.map(u => (u._id === id ? { ...u, role } : u)));
    } catch (e) {
      console.error("Change role failed", e);
      alert(e?.response?.data?.error || "Role update failed");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (e) {
      console.error("Delete user failed", e);
      alert(e?.response?.data?.error || "Delete failed");
    }
  };

  // COMMENTS
  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await api.get("/api/admin/comments");
      setCommentsList(data || []);
    } catch (e) {
      console.error("Failed to load admin comments", e);
      setCommentsList([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const replyComment = async (commentId, text) => {
    if (!text || !text.trim()) return alert("Reply cannot be empty");
    try {
      const { data } = await api.post(`/api/admin/comments/${commentId}/reply`, { text });
      setCommentsList(prev => prev.map(c => (c._id === commentId ? { ...c, adminReplies: [...(c.adminReplies||[]), data] } : c)));
    } catch (e) {
      console.error("Reply failed", e);
      alert("Reply failed");
    }
  };

  const TabButtons = (
    <div className="flex items-center gap-3 mb-4">
      {[
        { k: "apps", label: "Apps" },
        { k: "users", label: "Users" },
        { k: "comments", label: "Comments" }
      ].map(({k,label}) => (
        <button
          key={k}
          type="button"
          onClick={() => setTab(k)}
          className={`px-3 py-2 rounded ${tab === k ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {(loadingApps || loadingUsers || loadingComments) && (
        <div className="mb-4">
          <div className="rounded p-3 bg-white dark:bg-gray-800 shadow flex items-center gap-3">
            <div className="w-5 h-5 border-t-2 border-b-2 rounded-full animate-spin" />
            <div className="text-sm text-gray-700 dark:text-gray-300">Loading admin data…</div>
          </div>
        </div>
      )}

      {TabButtons}

      {tab === "apps" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-3">Add New App</h3>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="Name"
                value={newApp.name} onChange={(e)=>setNewApp(n=>({...n,name:e.target.value}))}/>
              <input className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="Description"
                value={newApp.description} onChange={(e)=>setNewApp(n=>({...n,description:e.target.value}))}/>
              <input className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="Icon (emoji)"
                value={newApp.icon} onChange={(e)=>setNewApp(n=>({...n,icon:e.target.value}))}/>
              <input className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="Image URL"
                value={newApp.image} onChange={(e)=>setNewApp(n=>({...n,image:e.target.value}))}/>
              <select className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" value={newApp.category} onChange={(e)=>setNewApp(n=>({...n,category:e.target.value}))}>
                <option value="games">Games</option>
                <option value="tools">Tools</option>
                <option value="daily">Daily Needs</option>
                <option value="professional">Professional</option>
                <option value="technology">Technology</option>
                <option value="other">Other</option>
              </select>
              <input className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white" placeholder="App/Game URL (https://...)"
                value={newApp.url || ""} onChange={(e)=>setNewApp(n=>({...n,url:e.target.value}))}/>
              <button type="button" onClick={addApp} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                {saving ? "Saving..." : "Create App"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-3">Apps List</h3>
            <div className="space-y-3">
              {loadingApps ? (
                <div className="text-gray-500">Loading apps…</div>
              ) : appsList?.length ? appsList.map(a => (
                <EditableAppRow key={a._id} app={a} onSaved={(u)=>{ setAppsList(prev => prev.map(x => (String(x._id) === String(u._id) ? { ...x, ...u } : x))); }} onDelete={(id)=>deleteApp(id)} />
              )) : <div className="text-gray-500">No apps</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">Users</h3>
          {loadingUsers ? <div className="text-gray-500">Loading users…</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="p-2">Name</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Joined</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.username}</td>
                      <td className="p-2">
                        <select value={u.role} onChange={(e)=>changeRole(u._id, e.target.value)} className="border rounded p-1 dark:bg-gray-700 dark:text-white">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="p-2">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}</td>
                      <td className="p-2">
                        <button type="button" onClick={()=>deleteUser(u._id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={5} className="p-2 text-gray-500">No users</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "comments" && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">Comments</h3>
          {loadingComments ? <div className="text-gray-500">Loading comments…</div> : (
            <div className="space-y-3">
              {commentsList?.length ? commentsList.map(c => <AdminComment key={c._id} comment={c} onReply={replyComment} />) : <div className="text-gray-500">No comments</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Small AdminComment internal component */
function AdminComment({ comment, onReply }) {
  const [text, setText] = useState("");
  return (
    <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
      <div className="flex items-center justify-between">
        <div className="font-medium">{comment.user || "User"}</div>
        <div className="text-xs text-gray-500">{comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ""}</div>
      </div>
      <div className="text-sm mt-1 mb-2">{comment.text}</div>
      {comment.adminReplies?.length ? (
        <div className="mb-2">
          <div className="text-xs text-gray-400 mb-1">Admin replies</div>
          <div className="space-y-1">
            {comment.adminReplies.map((r, i) => (<div key={i} className="text-sm bg-white/60 dark:bg-gray-800/60 p-2 rounded">{r.text}</div>))}
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <input className="flex-1 px-3 py-2 rounded border dark:bg-gray-800 dark:text-white" placeholder="Write a reply..." value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={() => { onReply(comment._id, text); setText(""); }} className="px-3 py-2 bg-indigo-600 text-white rounded">Reply</button>
      </div>
    </div>
  );
}
