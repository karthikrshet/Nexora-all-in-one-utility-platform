// src/components/Settings.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * -------------------------------
 * Feature Toggles (flip to true when backend is ready)
 * -------------------------------
 */
const SHOW_AVATAR = false;
const SHOW_SECURITY = false;
const SHOW_PREFERENCES = false;
const SHOW_CATEGORIES = false;      // super admin only
const SHOW_MANAGE_USERS = true;    // super admin only

// Also control whether we call backend endpoints or not
const ENABLE_PROFILE_API = false;       // PUT /api/auth/profile
const ENABLE_PREFS_API = false;         // GET/PUT /api/user/preferences
const ENABLE_CATEGORIES_API = false;    // /api/admin/categories CRUD

export default function Settings({ loadAdminUsers, adminUsers = [], onChangeRole }) {
  const { user } = useAuth();

  // ------- Profile (kept minimal and local) -------
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || `${user?.username || "user"}@example.com`);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // ------- Avatar (hidden by default) -------
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  // ------- Security (hidden by default) -------
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // ------- Preferences (hidden by default) -------
  const [notifications, setNotifications] = useState({ email: true, push: false, inApp: true });
  const [defaultDashboard, setDefaultDashboard] = useState("apps");
  const [language, setLanguage] = useState("en");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState("");

  // ------- Categories & Admin Users (hidden by default) -------
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryMsg, setCategoryMsg] = useState("");
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [localAdminUsers, setLocalAdminUsers] = useState(adminUsers || []);

  useEffect(() => {
    setLocalAdminUsers(adminUsers || []);
  }, [adminUsers]);

  // Load preferences if enabled (avoids 404)
  useEffect(() => {
    if (!ENABLE_PREFS_API) return;

    (async () => {
      try {
        const { data } = await api.get("/api/user/preferences");
        if (data) {
          setNotifications({
            email: !!data.notifications?.email,
            push: !!data.notifications?.push,
            inApp: !!data.notifications?.inApp,
          });
          setDefaultDashboard(data.defaultDashboard || "apps");
          setLanguage(data.language || "en");
        }
      } catch (e) {
        console.warn("Preferences load failed (disabled or missing endpoint).", e);
      }
    })();
  }, []);

  // Load categories if enabled and user is super admin (avoids 404)
  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    if (!ENABLE_CATEGORIES_API) return;
    loadCategories();
    if (typeof loadAdminUsers === "function" && SHOW_MANAGE_USERS) {
      try {
        loadAdminUsers();
      } catch (e) {
        console.warn("loadAdminUsers failed", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isSuperAdmin]);

  const loadCategories = async () => {
    if (!ENABLE_CATEGORIES_API) return;
    setLoadingCategories(true);
    setCategoryMsg("");
    try {
      const { data } = await api.get("/api/admin/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load categories", e);
      setCategories([]);
      setCategoryMsg("Could not load categories.");
      setTimeout(() => setCategoryMsg(""), 3000);
    } finally {
      setLoadingCategories(false);
    }
  };

  // ---------------- Handlers (guarded) ----------------

  const saveProfile = async () => {
    if (!user) return setProfileMsg("Not authenticated");
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const payload = { name: (name || "").trim(), email: (email || "").trim() };

      if (!ENABLE_PROFILE_API) {
        // Local-only success (no API call)
        setProfileMsg("Saved locally (API disabled).");
      } else {
        const { data } = await api.put("/api/auth/profile", payload);
        setProfileMsg(data?.message || "Profile saved.");
      }
    } catch (e) {
      console.error("Profile save failed", e);
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      setProfileMsg(serverMsg || "Save failed.");
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileMsg(""), 3000);
    }
  };

  const onAvatarSelected = (file) => {
    if (!file) return;
    setAvatarFile(file);
    try {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        try { URL.revokeObjectURL(avatarPreview); } catch {}
      }
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } catch {
      setAvatarPreview("");
    }
    setAvatarMsg("");
  };

  const uploadAvatar = async () => {
    if (!user) return setAvatarMsg("Not authenticated");
    if (!avatarFile) return setAvatarMsg("Select an image first");
    setUploadingAvatar(true);
    setAvatarMsg("");
    try {
      if (!ENABLE_PROFILE_API) {
        // No server upload — just keep preview
        setAvatarMsg("Preview updated (upload API disabled).");
      } else {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const { data } = await api.post("/api/auth/upload-avatar", fd, {
          headers: { Accept: "application/json" },
        });
        const avatarUrl = data?.avatar || data?.url || data?.data?.avatar;
        if (avatarUrl) {
          setAvatarPreview(avatarUrl);
          setAvatarFile(null);
          setAvatarMsg("Avatar updated.");
        } else {
          setAvatarMsg("Upload succeeded but no URL returned.");
        }
      }
    } catch (e) {
      console.error("Avatar upload failed", e);
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      setAvatarMsg(serverMsg || "Upload failed.");
    } finally {
      setUploadingAvatar(false);
      setTimeout(() => setAvatarMsg(""), 3000);
    }
  };

  const changePassword = async () => {
    if (!user) return setPasswordMsg("Not authenticated");
    if (!oldPassword || !newPassword || !confirmPassword) return setPasswordMsg("Fill all fields");
    if (newPassword !== confirmPassword) return setPasswordMsg("New passwords do not match");
    setChangingPassword(true);
    setPasswordMsg("");
    try {
      if (!ENABLE_PROFILE_API) {
        setPasswordMsg("Password change disabled (no API).");
      } else {
        const { data } = await api.put("/api/auth/change-password", { oldPassword, newPassword });
        setPasswordMsg(data?.message || "Password changed.");
      }
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      console.error("Change password failed", e);
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      setPasswordMsg(serverMsg || "Change failed.");
    } finally {
      setChangingPassword(false);
      setTimeout(() => setPasswordMsg(""), 3000);
    }
  };

  const savePreferences = async () => {
    if (!user) return setPrefsMsg("Not authenticated");
    setSavingPrefs(true);
    setPrefsMsg("");
    try {
      if (!ENABLE_PREFS_API) {
        setPrefsMsg("Saved locally (preferences API disabled).");
      } else {
        const payload = { notifications, defaultDashboard, language };
        const { data } = await api.put("/api/user/preferences", payload);
        setPrefsMsg(data?.message || "Preferences saved.");
      }
    } catch (e) {
      console.error("Save preferences failed:", e);
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      setPrefsMsg(serverMsg || "Save failed.");
    } finally {
      setSavingPrefs(false);
      setTimeout(() => setPrefsMsg(""), 3000);
    }
  };

  const addCategory = async () => {
    if (!user?.isSuperAdmin) return setCategoryMsg("Not allowed");
    const name = (newCategory || "").trim();
    if (!name) return setCategoryMsg("Category name required");
    setCategoryActionLoading(true);
    setCategoryMsg("");
    try {
      if (!ENABLE_CATEGORIES_API) {
        // fake-append locally
        const fake = { _id: `local-${Date.now()}`, name };
        setCategories((prev) => [fake, ...prev]);
        setNewCategory("");
        setCategoryMsg("Added locally (API disabled).");
      } else {
        const { data } = await api.post("/api/admin/categories", { name });
        if (data && (data._id || data.id)) {
          setCategories((prev) => [data, ...prev]);
          setNewCategory("");
          setCategoryMsg("Category added.");
        } else if (Array.isArray(data)) {
          setCategories(data);
          setNewCategory("");
          setCategoryMsg("Categories updated.");
        } else {
          setCategoryMsg("Added (unexpected response).");
        }
      }
    } catch (e) {
      console.error("Add category failed:", e);
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      setCategoryMsg(serverMsg || "Add failed.");
    } finally {
      setCategoryActionLoading(false);
      setTimeout(() => setCategoryMsg(""), 3000);
    }
  };

  const renameCategory = async (id, newName) => {
    if (!user?.isSuperAdmin) return setCategoryMsg("Not allowed");
    const name = (newName || "").trim();
    if (!name) return setCategoryMsg("New name required");
    setCategoryActionLoading(true);
    try {
      if (!ENABLE_CATEGORIES_API) {
        setCategories((prev) => prev.map((c) => (String(c._id) === String(id) ? { ...c, name } : c)));
        setCategoryMsg("Renamed locally (API disabled).");
      } else {
        const { data } = await api.put(`/api/admin/categories/${id}`, { name });
        setCategories((prev) => prev.map((c) => (String(c._id) === String(id) ? data : c)));
        setCategoryMsg("Category renamed.");
      }
    } catch (e) {
      console.error("Rename failed", e);
      setCategoryMsg(e?.response?.data?.error || e?.response?.data?.message || "Rename failed.");
    } finally {
      setCategoryActionLoading(false);
      setTimeout(() => setCategoryMsg(""), 3000);
    }
  };

  const deleteCategory = async (id) => {
    if (!user?.isSuperAdmin) return setCategoryMsg("Not allowed");
    if (!confirm("Delete this category?")) return;
    setCategoryActionLoading(true);
    try {
      if (!ENABLE_CATEGORIES_API) {
        setCategories((prev) => prev.filter((c) => String(c._id) !== String(id)));
        setCategoryMsg("Deleted locally (API disabled).");
      } else {
        await api.delete(`/api/admin/categories/${id}`);
        setCategories((prev) => prev.filter((c) => String(c._id) !== String(id)));
        setCategoryMsg("Category deleted.");
      }
    } catch (e) {
      console.error("Delete category failed", e);
      setCategoryMsg(e?.response?.data?.error || e?.response?.data?.message || "Delete failed.");
    } finally {
      setCategoryActionLoading(false);
      setTimeout(() => setCategoryMsg(""), 3000);
    }
  };

  const toggleNotification = (key) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  // ---------------- UI ----------------
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* PROFILE (keep visible) */}
      <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-3">Profile</h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 bg-gray-100 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 bg-gray-100 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Avatar block (hidden by toggle) */}
        {SHOW_AVATAR && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full overflow-hidden w-14 h-14 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-14 h-14 object-cover" />
                ) : (
                  <div className="text-gray-500">No avatar</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-gray-600 dark:text-gray-300">Upload avatar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onAvatarSelected(e.target.files?.[0])}
                    className="text-sm"
                  />
                  <button
                    type="button"
                    onClick={uploadAvatar}
                    disabled={!avatarFile || uploadingAvatar}
                    className="px-3 py-1 bg-indigo-600 text-white rounded"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload"}
                  </button>
                </div>
                {avatarMsg && <div className="text-xs text-gray-500">{avatarMsg}</div>}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            {savingProfile ? "Saving..." : "Save"}
          </button>
          {profileMsg && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{profileMsg}</div>
          )}
        </div>
      </div>

      {/* SECURITY (hidden by toggle) */}
      {SHOW_SECURITY && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-3">Security</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="password"
              placeholder="Old password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={changePassword}
              disabled={changingPassword}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              {changingPassword ? "Changing..." : "Change password"}
            </button>
            {passwordMsg && (
              <div className="text-sm text-gray-600 dark:text-gray-300">{passwordMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* PREFERENCES (hidden by toggle) */}
      {SHOW_PREFERENCES && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-3">Preferences</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notifications</p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() => toggleNotification("email")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Email</span>
              </label>
              <label className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={() => toggleNotification("push")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Push</span>
              </label>
              <label className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={notifications.inApp}
                  onChange={() => toggleNotification("inApp")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">In-app</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Dashboard
              </label>
              <select
                value={defaultDashboard}
                onChange={(e) => setDefaultDashboard(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
              >
                <option value="apps">Apps</option>
                <option value="games">Games</option>
                <option value="comments">Comments</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={savePreferences}
              disabled={savingPrefs}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              {savingPrefs ? "Saving..." : "Save preferences"}
            </button>
            {prefsMsg && <div className="text-sm text-gray-600 dark:text-gray-300">{prefsMsg}</div>}
          </div>
        </div>
      )}

      {/* SUPER ADMIN: Categories & Manage Users (hidden by toggles) */}
      {user?.isSuperAdmin && SHOW_CATEGORIES && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-3">App Categories</h3>

          <div className="flex gap-2 mb-3">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="px-3 py-2 rounded border dark:bg-gray-700 dark:text-white flex-1"
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={categoryActionLoading}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              {categoryActionLoading ? "Working..." : "Add"}
            </button>
          </div>
          {categoryMsg && <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">{categoryMsg}</div>}

          <div>
            {loadingCategories ? (
              <div className="text-gray-500">Loading categories…</div>
            ) : (
              <div className="space-y-2">
                {categories.length ? (
                  categories.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">({c._id})</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nn = prompt("New category name", c.name);
                            if (nn && nn.trim() && nn.trim() !== c.name) renameCategory(c._id, nn.trim());
                          }}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(c._id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No categories</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {user?.isSuperAdmin && SHOW_MANAGE_USERS && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-3">Manage Users (Super Admin)</h3>
          <div className="space-y-2">
            {localAdminUsers && localAdminUsers.length ? (
              localAdminUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                >
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">
                      {u.username} • {u.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onChangeRole?.(u._id, u.role === "admin" ? "user" : "admin");
                          setLocalAdminUsers((prev) =>
                            prev.map((x) =>
                              x._id === u._id ? { ...x, role: x.role === "admin" ? "user" : "admin" } : x
                            )
                          );
                        } catch (e) {
                          console.error("Role change failed", e);
                          alert("Role change failed (see console).");
                        }
                      }}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
                    >
                      {u.role === "admin" ? "Demote" : "Promote"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No users</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
