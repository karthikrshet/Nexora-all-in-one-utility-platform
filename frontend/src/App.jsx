// src/App.jsx
import React, { useEffect, useMemo, useRef, useState, useContext, useCallback } from "react";
import { io } from "socket.io-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import api from "./services/api";
import { useAuth } from "./context/AuthContext.jsx";
import AppDetail from "./pages/AppDetail.jsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminPanel from "./components/AdminPanel";
import Settings from "./components/Settings";
import ShareModal from "./components/ShareModal";
import AppCard from "./components/AppCard";
import GameWrapper from "./components/GameWrapper";

import {
  GamesLauncher,
  GAMES_MAP,
  gamesList as GAMES_LIST,
} from "./components/GamesCollection";

/* -------------------------
   Context
   ------------------------- */
export const AppContext = React.createContext({
  darkMode: false,
  toggleDarkMode: () => {},
  user: null,
  socket: null,
});

/* -------------------------
   Small helpers
   ------------------------- */
// Unique avatar using DiceBear seed
function avatarUrl(seed, size = 64) {
  const safe = encodeURIComponent(String(seed || "user"));
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${safe}&radius=50&backgroundType=gradientLinear&size=${size}`;
}
function formatNumber(n) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString() : "-";
}
function prettyChange(n, suffix = "today") {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return null;
  const sign = num > 0 ? "+" : "−";
  const abs = Math.abs(num).toLocaleString();
  return `${sign}${abs} ${suffix}`;
}

/* -------------------------
   Router wrapper
   ------------------------- */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/apps/:id" element={<AppDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

/* =====================================================
   Tiny Toasts (no library)
   ===================================================== */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info", ms = 2000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ms);
  }, []);
  const Toasts = () => (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-3 py-2 rounded-lg shadow text-sm text-white ${
            t.type === "error"
              ? "bg-rose-500"
              : t.type === "success"
              ? "bg-emerald-500"
              : "bg-gray-900"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { addToast: add, Toasts };
}

/* =====================================================
   Markdown-lite + sanitize
   - **bold**, *italic*, links [text](url)
   ===================================================== */
function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function mdLite(input = "") {
  let s = escapeHtml(input);
  // links
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noreferrer" class="text-indigo-600 hover:underline">${text}</a>`
  );
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

/* =====================================================
   Auto-grow Textarea
   ===================================================== */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder = "Write a comment…",
  maxLength = 500,
  onEnter,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
      }}
      placeholder={placeholder}
      rows={1}
      className="w-full resize-none text-[14px] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      style={{ lineHeight: "1.35" }}
    />
  );
}

/* -------------------------
   App
   ------------------------- */
export default function App() {
  const { user, logout, darkMode, toggleDarkMode } = useAuth();
  const [socket, setSocket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null); // pagination cursor
  const { addToast, Toasts } = useToasts();

  // theme init + persist
  useEffect(() => {
    try {
      const saved = localStorage.getItem("darkMode");
      const on = saved != null ? saved === "true" : darkMode;
      document.documentElement.classList.toggle("dark", on);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("darkMode", String(darkMode));
    } catch {}
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // sockets (optional)
  useEffect(() => {
    const enableSockets = import.meta.env.VITE_ENABLE_SOCKETS === "true";
    if (!user || !enableSockets) {
      if (socket) {
        try {
          socket.disconnect();
        } catch {}
        setSocket(null);
      }
      return;
    }
    const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
    let s;
    try {
      s = io(url, { autoConnect: true, transports: ["websocket"] });
      setSocket(s);
      s.on("connect", () => console.log("socket connected", s.id));
      s.on("comment", (comment) => {
        setComments((prev) => [...prev, comment]);
      });
      s.on("disconnect", () => console.log("socket disconnected"));
    } catch (err) {
      console.warn("Socket init failed", err);
    }
    return () => {
      try {
        s && s.disconnect();
      } catch {}
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // initial comments (paged)
  const fetchComments = async (opts = {}) => {
    const { before = null, append = false } = opts;
    setLoadingComments(true);
    try {
      const params = {};
      if (before) params.before = before; // backend optional
      params.limit = 20;
      const res = await api.get("/api/comments", { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setComments((prev) => (append ? [...data, ...prev] : data.reverse()));
      // naive cursor: use earliest timestamp/id received
      const earliest = data[0];
      setMoreCursor(earliest?.timestamp || earliest?._id || null);
    } catch (e) {
      console.error("Failed to load comments", e);
      // fallback one-shot
      try {
        const { data } = await api.get("/api/comments");
        setComments(Array.isArray(data) ? data.reverse() : []);
        setMoreCursor(null);
      } catch {}
    } finally {
      setLoadingComments(false);
    }
  };
  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendComment = async (parentId = null) => {
    const text = newComment.trim();
    if (!text) return;
    try {
      const payload = parentId ? { text, parentId } : { text };
      const { data } = await api.post("/api/comments", payload);
      setNewComment("");
      // show at bottom (newest last)
      setComments((prev) => [...prev, data]);
      socket?.emit?.("comment", data);
      addToast("Comment posted", "success");
    } catch (e) {
      console.error("Send comment failed", e);
      addToast("Failed to post comment", "error");
    }
  };

  return (
    <AppContext.Provider value={{ darkMode, toggleDarkMode, user, socket }}>
      <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
        <Dashboard
          user={user}
          logout={logout}
          comments={comments}
          setComments={setComments}
          newComment={newComment}
          setNewComment={setNewComment}
          sendComment={sendComment}
          fetchMore={() => fetchComments({ before: moreCursor, append: true })}
          hasMore={!!moreCursor}
          loadingComments={loadingComments}
          addToast={addToast}
        />
      </div>
      <Toasts />
    </AppContext.Provider>
  );
}

/* -------------------------
   Dashboard (main UI)
   ------------------------- */
function Dashboard({
  user,
  logout,
  comments,
  setComments,
  newComment,
  setNewComment,
  sendComment,
  fetchMore,
  hasMore,
  loadingComments,
  addToast,
}) {
  const appCtx = useContext(AppContext);
  const { darkMode, toggleDarkMode, socket } = appCtx;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || "dashboard");
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gamesSearch, setGamesSearch] = useState("");
  const [selectedAppCategory, setSelectedAppCategory] = useState("all");
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("appsSortBy") || "topClicks"); // default Top Clicked

  const [appModal, setAppModal] = useState({
    open: false,
    app: null,
    thread: [],
    loading: false,
    text: "",
    replyTo: null,
  });
  const [gameModal, setGameModal] = useState({ open: false, slug: null });
  const [shareModal, setShareModal] = useState({ open: false, app: null });
  const [adminUsers, setAdminUsers] = useState([]);
  const [gameStats, setGameStats] = useState(null);
  const [appViewModal, setAppViewModal] = useState({
    open: false,
    app: null,
    loading: false,
  });

  const CATEGORIES = ["all", "games", "tools", "daily", "professional", "technology", "other"];

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);
  useEffect(() => {
    localStorage.setItem("appsSortBy", sortBy);
  }, [sortBy]);

  // load apps (ask backend for top-clicked by default)
  const loadApps = async () => {
    try {
      const { data } = await api.get("/api/apps?sort=clicks");
      const normalized = (data || []).map((a) => ({
        ...a,
        _id: a._id ?? a.id,
        category: a.category || "other",
        likesCount: a.likesCount ?? (a.likedBy ? a.likedBy.length : 0),
      }));
      setApps(normalized);
    } catch (e) {
      console.error("Load apps failed", e);
    }
  };
  useEffect(() => {
    loadApps();
  }, []);

  // load stats
  const loadStats = async () => {
    try {
      const url = user?.role === "admin" ? "/api/admin/stats" : "/api/apps/stats";
      const { data } = await api.get(url);
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };
  useEffect(() => {
    loadStats();
  }, [user?.role]);

  // admin analytics (fallback if needed)
  useEffect(() => {
    if (user?.role === "admin") {
      (async () => {
        try {
          const { data } = await api.get("/api/admin/analytics");
          setAnalytics(data);
        } catch (err) {
          try {
            const { data } = await api.get("/api/apps/analytics/overview");
            setAnalytics(data);
          } catch (e) {
            console.error("Failed to load analytics", e);
          }
        }
      })();
    }
  }, [user?.role]);

  const loadAdminUsers = async () => {
    if (!user) return;
    try {
      const res = await api.get("/api/admin/users");
      setAdminUsers(res.data);
    } catch (e) {
      console.error("loadAdminUsers failed", e);
    }
  };
  useEffect(() => {
    if (user?.isSuperAdmin) loadAdminUsers();
  }, [user?.isSuperAdmin]);

  const refreshStats = async () => {
    await loadStats();
    await loadApps();
  };

  // game stats loader
  const loadUserGameStats = async () => {
    if (!user) {
      setGameStats(null);
      return;
    }
    try {
      const res = await api.get("/api/games/user-stats");
      const data = res?.data ?? res;
      if (data && (data.totals || data.perGame)) {
        setGameStats({
          totals: data.totals || { totalPoints: 0, plays: 0, wins: 0 },
          perGame: data.perGame || [],
          _raw: data,
        });
        return;
      }
      if (Array.isArray(data)) {
        const perGame = data.map((g) => ({
          gameSlug: g.gameSlug || g._id || g.slug || g.name,
          plays: Number(g.plays || 0),
          wins: Number(g.wins || 0),
          totalPoints: Number(g.totalPoints || g.points || 0),
        }));
        const totals = perGame.reduce(
          (acc, g) => {
            acc.totalPoints += g.totalPoints || 0;
            acc.plays += g.plays || 0;
            acc.wins += g.wins || 0;
            return acc;
          },
          { totalPoints: 0, plays: 0, wins: 0 }
        );
        setGameStats({ totals, perGame, _raw: data });
        return;
      }
      setGameStats({
        totals: { totalPoints: 0, plays: 0, wins: 0 },
        perGame: [],
        _raw: data,
      });
    } catch (e) {
      console.error("Failed to load user game stats", e);
      setGameStats({
        totals: { totalPoints: 0, plays: 0, wins: 0 },
        perGame: [],
        _rawError: e?.response?.data || e?.message || String(e),
      });
    }
  };
  useEffect(() => {
    if (user) loadUserGameStats();
    else setGameStats(null);
  }, [user]);

  // filtering
  const filteredApps = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return apps.filter((app) => {
      if (selectedAppCategory && selectedAppCategory !== "all" && app.category !== selectedAppCategory) return false;
      if (!q) return true;
      return (
        (app.name || "").toLowerCase().includes(q) ||
        (app.description || "").toLowerCase().includes(q)
      );
    });
  }, [apps, searchQuery, selectedAppCategory]);

  // sort
  const sortedApps = useMemo(() => {
    const base = selectedAppCategory === "all" ? filteredApps : filteredApps.filter((a) => a.category === selectedAppCategory);
    const arr = [...base];
    if (sortBy === "new") {
      arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === "topLikes") {
      arr.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === "topClicks") {
      arr.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else {
      arr.sort(
        (a, b) =>
          ((b.likesCount || 0) * 2 + (b.clicks || 0) * 0.4) -
          ((a.likesCount || 0) * 2 + (a.clicks || 0) * 0.4)
      );
    }
    return arr;
  }, [filteredApps, selectedAppCategory, sortBy]);

  const filteredGames = useMemo(() => {
    const q = (gamesSearch || "").trim().toLowerCase();
    const map = new Map();
    for (const g of GAMES_LIST || []) {
      const key = g.slug ?? g.id ?? g.title;
      if (!map.has(key)) map.set(key, g);
    }
    const unique = Array.from(map.values());
    if (!q) return unique;
    return unique.filter(
      (g) =>
        (g.title || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q)
    );
  }, [gamesSearch]);

  const gamesTotal = useMemo(() => (GAMES_LIST || []).length, []);
  const appsTotal = apps.length;
  const totalClicks = useMemo(() => apps.reduce((s, a) => s + (a.clicks || 0), 0), [apps]);

  function openGame(slug) {
    setGameModal({ open: true, slug });
  }

  // open app in a modal (no hard navigation)
  const handleAppOpen = async (appOrId) => {
    let app = null;
    let id = null;
    try {
      setAppViewModal({ open: true, app: null, loading: true });

      if (typeof appOrId === "string") {
        id = appOrId;
        const res = await api.get(`/api/apps/${id}`);
        app = res.data;
      } else {
        app = appOrId;
        id = app._id || app.id;
      }

      setApps((prev) => prev.map((a) => (a._id === id ? { ...a, clicks: (a.clicks || 0) + 1 } : a)));
      try {
        await api.post(`/api/apps/${id}/click`);
      } catch {}
      refreshStats().catch(() => {});
    } catch (e) {
      console.error("handleAppOpen failed:", e);
    } finally {
      setAppViewModal({ open: true, app, loading: false });
    }
  };

  const toggleLike = async (id) => {
    try {
      const { data } = await api.post(`/api/apps/${id}/like`);
      setApps((prev) =>
        prev.map((a) => {
          if (a._id !== id) return a;
          const wasLiked = a.liked;
          const nextLiked = data.liked;
          const delta = nextLiked && !wasLiked ? 1 : !nextLiked && wasLiked ? -1 : 0;
          return {
            ...a,
            liked: nextLiked,
            likesCount: Math.max(0, (a.likesCount ?? 0) + delta),
          };
        })
      );
      await loadStats();
    } catch (e) {
      console.error("toggleLike failed", e);
    }
  };

  const [trending, setTrending] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/apps/trending?limit=12");
        setTrending(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("load trending failed", e);
        setTrending([]);
      }
    })();
  }, []);

  // open app's comments thread (with 1-level replies)
  const openAppComments = async (app) => {
    setAppModal({ open: true, app, thread: [], loading: true, text: "", replyTo: null });
    try {
      const { data } = await api.get(`/api/comments?appId=${app._id}`);
      // Shape to include children: assume backend returns flat list; group by parentId
      const list = Array.isArray(data) ? data : [];
      const byParent = new Map();
      list.forEach((c) => {
        const p = c.parentId || null;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(c);
      });
      const top = (byParent.get(null) || []).map((c) => ({
        ...c,
        children: (byParent.get(c._id) || []).sort((a, b) =>
          new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
        ),
      }));
      setAppModal((m) => ({ ...m, loading: false, thread: top }));
    } catch (e) {
      console.error("openAppComments failed", e);
      setAppModal((m) => ({ ...m, loading: false, thread: [] }));
    }
  };

  // post within app modal
  const postAppComment = async () => {
    if (!appModal.text.trim() || !appModal.app) return;
    try {
      const payload = {
        text: appModal.text,
        appId: appModal.app._id,
        parentId: appModal.replyTo || null,
      };
      const { data } = await api.post("/api/comments", payload);
      setAppModal((m) => {
        if (m.replyTo) {
          // add to a child array
          const next = m.thread.map((t) =>
            t._id === m.replyTo
              ? { ...t, children: [...(t.children || []), data] }
              : t
          );
          return { ...m, text: "", thread: next, replyTo: null };
        } else {
          return { ...m, text: "", thread: [...m.thread, { ...data, children: [] }] };
        }
      });
      socket?.emit?.("comment", data);
      await loadStats();
      addToast("Comment added", "success");
    } catch (e) {
      console.error("Posting app comment failed", e);
      addToast("Failed to add comment", "error");
    }
  };

  // delete comment (best effort)
  const deleteComment = async (id) => {
    try {
      await api.delete(`/api/comments/${id}`);
      // remove from state (handles both top level & child)
      setAppModal((m) => {
        const removeChild = (arr) => arr.filter((x) => x._id !== id);
        const next = m.thread
          .filter((t) => t._id !== id)
          .map((t) => ({ ...t, children: removeChild(t.children || []) }));
        return { ...m, thread: next };
      });
      addToast("Comment deleted", "success");
    } catch (e) {
      console.error("delete failed", e);
      addToast("Delete failed (no permission?)", "error");
    }
  };

  // reactions (local; POST best effort)
  const reactTo = async (id, emoji) => {
    try {
      // optimistic UI for app modal list
      setAppModal((m) => {
        const bump = (c) => {
          const r = { ...(c.reactions || {}) };
          r[emoji] = (r[emoji] || 0) + 1;
          return { ...c, reactions: r };
        };
        const next = m.thread.map((t) =>
          t._id === id
            ? bump(t)
            : { ...t, children: (t.children || []).map((ch) => (ch._id === id ? bump(ch) : ch)) }
        );
        return { ...m, thread: next };
      });
      await api.post(`/api/comments/${id}/react`, { emoji }).catch(() => {});
    } catch {}
  };

  // report placeholder
  const reportComment = (id) => {
    addToast("Reported — a moderator will review", "info");
  };

  // Keyboard shortcuts in Applications tab
  const focusIdx = useRef(0);
  const cardsRef = useRef([]);
  useEffect(() => {
    function onKey(e) {
      if (activeTab !== "applications") return;
      if (!["j", "k", "Enter", "l", "L"].includes(e.key)) return;
      if (e.key === "j") {
        focusIdx.current = Math.min(sortedApps.length - 1, focusIdx.current + 1);
      } else if (e.key === "k") {
        focusIdx.current = Math.max(0, focusIdx.current - 1);
      } else if (e.key.toLowerCase() === "l") {
        const app = sortedApps[focusIdx.current];
        if (app) toggleLike(app._id);
      } else if (e.key === "Enter") {
        const app = sortedApps[focusIdx.current];
        if (app) handleAppOpen(app);
      }
      const el = cardsRef.current[focusIdx.current];
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, sortedApps]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------
     UI
     ------------------------- */
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Sidebar */}
      <div
        className={`sidebar bg-white/90 backdrop-blur dark:bg-gray-800/90 ${
          sidebarOpen ? "w-64" : "w-20"
        } flex flex-col transition-all border-r border-gray-100 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/10 grid place-items-center">
                <span className="text-indigo-600 text-lg">✦</span>
              </div>
              <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Nexora</h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg grid place-items-center text-white text-sm">N</div>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={<span className="w-6 h-6 inline-block">🏠</span>} text="Dashboard" active={activeTab === "dashboard"} expanded={sidebarOpen} onClick={() => setActiveTab("dashboard")} />
          <SidebarItem icon={<span className="w-6 h-6 inline-block">📁</span>} text="Applications" active={activeTab === "applications"} expanded={sidebarOpen} onClick={() => setActiveTab("applications")} />
          {sidebarOpen && activeTab === "applications" && (
            <div className="mt-2 flex flex-wrap gap-2 px-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedAppCategory(cat)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition ${
                    selectedAppCategory === cat
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {cat[0].toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}
          <SidebarItem icon={<span className="w-6 h-6 inline-block">🎮</span>} text="Games" active={activeTab === "games"} expanded={sidebarOpen} onClick={() => setActiveTab("games")} />
          <SidebarItem icon={<span className="w-6 h-6 inline-block">💬</span>} text="Comments" active={activeTab === "comments"} expanded={sidebarOpen} onClick={() => setActiveTab("comments")} />
          <SidebarItem icon={<span className="w-6 h-6 inline-block">🔗</span>} text="Share" active={activeTab === "share"} expanded={sidebarOpen} onClick={() => setActiveTab("share")} />
          <SidebarItem icon={<span className="w-6 h-6 inline-block">⚙️</span>} text="Settings" active={activeTab === "settings"} expanded={sidebarOpen} onClick={() => setActiveTab("settings")} />
          {user?.role === "admin" && (
            <SidebarItem icon={<span className="w-6 h-6 inline-block">🛡️</span>} text="Admin" active={activeTab === "admin"} expanded={sidebarOpen} onClick={() => setActiveTab("admin")} />
          )}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur shadow-sm z-10 dark:bg-gray-800/80">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="relative mr-4 w-1/2 max-w-xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="w-full py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-3">
                <img
                  src={
                    user?.avatar ||
                    avatarUrl(user?.id || user?._id || user?.email || user?.name || "user", 64)
                  }
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-600/20"
                />
                <div className="text-sm leading-tight">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{user?.name || "User"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">({user?.role || "guest"})</div>
                </div>
                <button onClick={logout} className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Welcome back, {user?.name || "there"}!
              </h1>

              {/* Stats */}
              <div className="mb-8 grid gap-4 sm:gap-6 grid-cols-1 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                <StatCard title="Apps" value={stats?.totalApps ?? appsTotal} change={prettyChange(stats?.appsThisMonth, "this month")} icon="📦" accent="indigo" />
                <StatCard title="Games (built-in)" value={gamesTotal} change={null} icon="🎮" accent="amber" />
                <StatCard title="Total Clicks" value={stats?.totalClicks ?? totalClicks} change={prettyChange(stats?.clicksToday, "today")} icon="🖱️" accent="cyan" />
                <StatCard title="Liked Apps" value={stats?.liked ?? apps.filter((a) => a.liked).length} change={prettyChange(stats?.likesThisWeek, "this week")} icon="❤️" accent="rose" />
              </div>

              {/* Trending now */}
              {trending.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending now</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Based on recent activity</div>
                  </div>

                  <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-4 overflow-x-auto pb-2 snap-x">
                    {trending.map((app, i) => (
                      <div key={app._id} className="relative snap-start">
                        {/* badge demo */}
                        <BadgeChips app={app} />
                        <AppCard
                          app={app}
                          onClick={() => handleAppOpen(app)}
                          onLike={() => toggleLike(app._id)}
                          onShare={() => setShareModal({ open: true, app })}
                          onComments={() => openAppComments(app)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Points */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Your Game Points</h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Summary Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Points</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{gameStats?.totals?.totalPoints ?? 0}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {gameStats?.totals?.plays ?? 0} plays • {gameStats?.totals?.wins ?? 0} wins
                        </div>
                      </div>
                      <div className="rounded-full px-3 py-1 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">🏆 Keep it up!</div>
                    </div>

                    {/* Simple progress feel */}
                    {Array.isArray(gameStats?.perGame) && gameStats.perGame.length > 0 ? (
                      (() => {
                        const maxPts = Math.max(...gameStats.perGame.map((g) => g.totalPoints || 0), 1);
                        const top = [...gameStats.perGame].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))[0];
                        const pct = Math.round(((top?.totalPoints || 0) / maxPts) * 100);
                        return (
                          <div className="mt-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Top game: <span className="font-medium text-gray-800 dark:text-gray-200">{top?.gameSlug}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded mt-2 overflow-hidden">
                              <div className="h-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">Play any game to start earning points.</div>
                    )}
                  </div>

                  {/* Per-game mini cards */}
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.isArray(gameStats?.perGame) && gameStats.perGame.length ? (
                        gameStats.perGame
                          .slice()
                          .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
                          .map((g) => (
                            <div key={g.gameSlug || g._id || Math.random()} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-gray-100">{g.gameSlug}</div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{g.plays} plays</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{g.wins} wins • {g.totalPoints} pts</div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded mt-2 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round(
                                        ((g.totalPoints || 0) / Math.max(1, gameStats?.totals?.totalPoints || 0)) * 100
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 p-4 border border-dashed rounded-lg dark:border-gray-700">No game activity yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Applications (Top Clicked first + badges) */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Applications</h2>
                  
                </div>
                {(() => {
                  const topClicked = [...sortedApps]; // already sorted by chosen sort
                  return (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {topClicked.map((app, idx) => (
                        <div
                          key={app._id}
                          ref={(el) => (cardsRef.current[idx] = el)}
                          className="relative focus-within:ring-2 focus-within:ring-indigo-500 rounded-lg"
                          tabIndex={-1}
                        >
                          <BadgeChips app={app} />
                          <AppCard
                            app={app}
                            onClick={() => handleAppOpen(app)}
                            onLike={() => toggleLike(app._id)}
                            onShare={() => setShareModal({ open: true, app })}
                            onComments={() => openAppComments(app)}
                          />
                        </div>
                      ))}
                      {!topClicked.length && (
                        <div className="text-gray-500 dark:text-gray-400">No apps found.</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Comments (page) */}
          {activeTab === "comments" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Comments</h1>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{comments?.length || 0} total</span>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow ring-1 ring-black/5 dark:ring-gray-700 overflow-hidden">
                {/* composer */}
                <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex">
                    <img
                      src={avatarUrl(user?.id || user?._id || user?.email || user?.name || "me", 64)}
                      alt="Your profile"
                      className="w-9 h-9 rounded-full mr-3 ring-1 ring-black/5"
                    />
                    <div className="flex-1 min-w-0">
                      <AutoGrowTextarea
                        value={newComment}
                        onChange={(v) => setNewComment(v)}
                        placeholder="Write a comment…"
                        maxLength={500}
                        onEnter={() => {
                          if (newComment.trim()) sendComment();
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">Enter</kbd> to send,{" "}
                          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">Shift</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">Enter</kbd> for newline
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{Math.min(newComment.length, 500)}/500</span>
                          <button
                            onClick={() => sendComment()}
                            disabled={!newComment.trim()}
                            className={`px-3 py-1.5 text-sm font-medium text-white rounded-lg transition ${
                              newComment.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-500/50 cursor-not-allowed"
                            }`}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* list */}
                <div className="p-3 sm:p-4 space-y-3">
                  {loadingComments && !comments.length ? (
                    <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading…</div>
                  ) : comments?.length ? (
                    <>
                      {hasMore && (
                        <div className="flex justify-center">
                          <button
                            onClick={fetchMore}
                            className="px-3 py-1.5 text-xs rounded border bg-white dark:bg-gray-700 dark:text-gray-100"
                          >
                            Load older
                          </button>
                        </div>
                      )}
                      {comments.map((c, i) => (
                        <CommentRow
                          key={c._id || i}
                          c={c}
                          user={user}
                          addToast={addToast}
                          onDelete={async () => {
                            try {
                              await api.delete(`/api/comments/${c._id}`);
                              setComments((prev) => prev.filter((x) => x._id !== c._id));
                            } catch {
                              addToast("Delete failed", "error");
                            }
                          }}
                          onReact={async (emoji) => {
                            try {
                              setComments((prev) =>
                                prev.map((x) =>
                                  x._id === c._id ? { ...x, reactions: { ...(x.reactions || {}), [emoji]: (x.reactions?.[emoji] || 0) + 1 } } : x
                                )
                              );
                              await api.post(`/api/comments/${c._id}/react`, { emoji }).catch(() => {});
                            } catch {}
                          }}
                          onReply={async (text) => {
                            if (!text.trim()) return;
                            try {
                              const { data } = await api.post("/api/comments", { text, parentId: c._id });
                              // append as separate root (page is global feed)
                              setComments((prev) => [...prev, data]);
                            } catch {
                              addToast("Reply failed", "error");
                            }
                          }}
                          onReport={() => addToast("Reported for review", "info")}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="text-2xl">💬</div>
                      <div className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No comments yet</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Start the conversation above.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Share */}
          {activeTab === "share" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Share Apps</h1>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Click <span className="font-medium">Share</span> on any card to open options
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {apps.length ? (
                  apps.map((app) => (
                    <div key={app._id} className="relative">
                      <BadgeChips app={app} />
                      <AppCard
                        app={app}
                        onClick={() => handleAppOpen(app)}
                        onLike={() => toggleLike(app._id)}
                        onShare={() => setShareModal({ open: true, app })}
                        onComments={() => openAppComments(app)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">No apps to share.</div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <Settings loadAdminUsers={loadAdminUsers} adminUsers={adminUsers} onChangeRole={async (userId, role) => {
              try {
                await api.post(`/api/admin/users/${userId}/role`, { role });
                await loadAdminUsers();
                await loadStats();
                addToast("Role updated", "success");
              } catch {
                addToast("Role update failed", "error");
              }
            }} />
          )}

          {/* Games */}
          {activeTab === "games" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Games</h1>
                <div className="flex items-center gap-2">
                  <input
                    value={gamesSearch}
                    onChange={(e) => setGamesSearch(e.target.value)}
                    placeholder="Search games..."
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="mb-6">
                <GamesLauncher games={filteredGames} onPlay={(slug) => openGame(slug)} />
              </div>
              {!filteredGames.length && <div className="text-gray-500 dark:text-gray-400">No games found.</div>}
            </div>
          )}

          {/* Applications */}
          {activeTab === "applications" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Applications — {selectedAppCategory[0].toUpperCase() + selectedAppCategory.slice(1)}
                </h1>

                {/* Sort control */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Sort:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2 py-1 rounded border dark:bg-gray-700 dark:text-white"
                  >
                    <option value="topClicks">Top clicked</option>
                    <option value="trending">Trending</option>
                    <option value="topLikes">Top liked</option>
                    <option value="new">Newest</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedApps.map((app, idx) => (
                  <div key={app._id} ref={(el) => (cardsRef.current[idx] = el)} className="relative">
                    <BadgeChips app={app} />
                    <AppCard
                      app={app}
                      onClick={() => handleAppOpen(app)}
                      onLike={() => toggleLike(app._id)}
                      onShare={() => setShareModal({ open: true, app })}
                      onComments={() => openAppComments(app)}
                    />
                  </div>
                ))}
                {!sortedApps.length && <div className="text-gray-500 dark:text-gray-400">No apps in this category.</div>}
              </div>
            </div>
          )}

          {/* Admin */}
          {activeTab === "admin" && user?.role === "admin" && (
            <AdminPanel refreshStats={async () => { await loadStats(); await loadApps(); }} onLoadUsers={loadAdminUsers} adminUsers={adminUsers} />
          )}
        </main>
      </div>

      {/* COMMENTS modal (compact, threaded) */}
      {appModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAppModal({ open: false, app: null, thread: [], loading: false, text: "", replyTo: null })}
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{appModal.app?.name || "Comments"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Discussion</div>
              </div>
              <button
                onClick={() => setAppModal({ open: false, app: null, thread: [], loading: false, text: "", replyTo: null })}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                ✖
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4 space-y-3">
              {appModal.loading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : appModal.thread.length ? (
                appModal.thread.map((c) => (
                  <div key={c._id} className="space-y-2">
                    <ThreadComment
                      comment={c}
                      level={0}
                      onReplyClick={() => setAppModal((m) => ({ ...m, replyTo: c._id }))}
                      onDelete={() => deleteComment(c._id)}
                      onReact={reactTo}
                      onReport={() => reportComment(c._id)}
                    />
                    {(c.children || []).map((ch) => (
                      <ThreadComment
                        key={ch._id}
                        comment={ch}
                        level={1}
                        onReplyClick={() => setAppModal((m) => ({ ...m, replyTo: c._id }))}
                        onDelete={() => deleteComment(ch._id)}
                        onReact={reactTo}
                        onReport={() => reportComment(ch._id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="text-2xl">💬</div>
                  <div className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Be the first to comment</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Share your thoughts about this app.</div>
                </div>
              )}
            </div>

            {/* composer (sticky) */}
            <div className="border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-3 py-2">
              {appModal.replyTo && (
                <div className="text-[10px] mb-1 text-gray-600 dark:text-gray-400">
                  Replying… <button className="underline" onClick={() => setAppModal((m) => ({ ...m, replyTo: null }))}>cancel</button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={appModal.text}
                  onChange={(e) => setAppModal((m) => ({ ...m, text: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (appModal.text.trim()) postAppComment();
                    }
                  }}
                  placeholder="Write a comment…"
                  rows={1}
                  className="flex-1 resize-none max-h-28 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ lineHeight: "1.2" }}
                />
                <button
                  onClick={postAppComment}
                  disabled={!appModal.text.trim()}
                  className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white ${
                    appModal.text.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-500/50 cursor-not-allowed"
                  }`}
                >
                  Send
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border">Shift</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border">Enter</kbd> for new line
                </span>
                <span className="text-[10px] text-gray-400">{Math.min(appModal.text.length, 500)}/500</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME modal */}
      {gameModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-lg shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {GAMES_LIST.find((g) => g.slug === gameModal.slug)?.title || "Game"}
              </h3>
              <button onClick={() => setGameModal({ open: false, slug: null })} className="text-gray-500 dark:text-gray-400" aria-label="Close">
                ✖
              </button>
            </div>
            <div className="p-4">
              {(() => {
                try {
                  const Comp = GAMES_MAP[gameModal.slug];
                  if (!Comp) return <div className="text-sm text-red-600 dark:text-red-400">Game not found</div>;
                  return (
                    <GameWrapper
                      slug={gameModal.slug}
                      GameComponent={Comp}
                      gameProps={{}}
                      onSessionSaved={async () => {
                        await loadUserGameStats();
                        await refreshStats();
                      }}
                      autoCloseOnWin={false}
                    />
                  );
                } catch (err) {
                  console.error("Error rendering game:", err);
                  return <div className="text-sm text-red-600 dark:text-red-400">Error loading game</div>;
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* APP view modal */}
      {appViewModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-full max-h-full rounded-lg shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{appViewModal.app?.name || "Loading..."}</h3>
              <button
                onClick={() => setAppViewModal({ open: false, app: null, loading: false })}
                className="text-gray-500 dark:text-gray-400"
                aria-label="Close"
              >
                ✖
              </button>
            </div>

            <div className="p-4">
              {appViewModal.loading ? (
                <div className="py-12">
                  <Loader />
                </div>
              ) : (() => {
                  try {
                    const app = appViewModal.app;
                    if (!app) return <div className="text-sm text-red-600 dark:text-red-400">Failed to load app.</div>;

                    const key = (app.slug || app._id || app.id || "").toString();
                    const gameMeta = (GAMES_LIST || []).find((g) => g.slug === key);
                    const GameComponent = gameMeta ? GAMES_MAP[gameMeta.slug] : null;

                    if (GameComponent) {
                      return (
                        <GameWrapper
                          slug={gameMeta.slug}
                          GameComponent={GameComponent}
                          gameProps={{}}
                          onSessionSaved={async () => {
                            await loadUserGameStats();
                            await refreshStats();
                          }}
                          autoCloseOnWin={false}
                        />
                      );
                    }

                    // Non-game app -> iframe preview
                    return (
                      <div className="h-[85vh] flex flex-col">
                        <div className="flex-1 border rounded overflow-hidden border-gray-200 dark:border-gray-700">
                          <iframe
                            title={app.name}
                            src={app.url}
                            className="w-full h-full"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          />
                        </div>

                        <div className="mt-3 flex gap-2">
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={async () => {
                              try {
                                await api.post(`/api/apps/${app._id || app.id}/click`);
                              } catch {}
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Open in new tab
                          </a>

                          <button
                            onClick={() => setAppViewModal({ open: false, app: null, loading: false })}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-100"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    );
                  } catch (err) {
                    console.error("App view modal render error:", err);
                    return <div className="text-sm text-red-600 dark:text-red-400">Error rendering app</div>;
                  }
                })()}
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareModal.open && shareModal.app && (
        <ShareModal
          open={shareModal.open}
          onClose={() => setShareModal({ open: false, app: null })}
          app={shareModal.app}
          onLike={async () => {
            if (!shareModal.app) return;
            await toggleLike(shareModal.app._id);
            // sync modal state icon count
            setShareModal((s) => ({
              ...s,
              app: {
                ...s.app,
                liked: !s.app.liked,
                likesCount: Math.max(0, (s.app.likesCount ?? 0) + (s.app.liked ? -1 : 1)),
              },
            }));
          }}
          onComments={() => {
            if (!shareModal.app) return;
            openAppComments(shareModal.app);
            setShareModal({ open: false, app: null });
          }}
        />
      )}
    </div>
  );
}

/* -------------------------
   Small components
   ------------------------- */
function SidebarItem({ icon, text, active, expanded, onClick }) {
  const base = "flex items-center w-full px-3 py-2 text-left rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  const activeClass = "bg-indigo-50 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300";
  const inactiveClass = "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700";
  return (
    <button onClick={onClick} className={`${base} ${active ? activeClass : inactiveClass}`} type="button" aria-pressed={active}>
      <span className={`flex-shrink-0 ${active ? "text-indigo-600 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}>{icon}</span>
      {expanded ? <span className="ml-3">{text}</span> : null}
    </button>
  );
}
function StatCard({ title, value, change, icon = "📦", accent = "indigo" }) {
  const accents = {
    indigo: "ring-indigo-400/40 dark:ring-indigo-500/40",
    amber: "ring-amber-400/40  dark:ring-amber-500/40",
    cyan: "ring-cyan-400/40   dark:ring-cyan-500/40",
    rose: "ring-rose-400/40   dark:ring-rose-500/40",
    emerald: "ring-emerald-400/40 dark:ring-emerald-500/40",
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
      <div className={`shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl grid place-items-center bg-gray-50 dark:bg-gray-700 ring-2 ${accents[accent] || accents.indigo}`} aria-hidden>
        <span className="text-2xl sm:text-3xl leading-none">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{formatNumber(value)}</p>
        {change ? <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{change}</p> : null}
      </div>
    </div>
  );
}
function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600" />
    </div>
  );
}

/* -------------------------
   Comments helpers
   ------------------------- */
function CommentRow({ c, user, addToast, onDelete, onReact, onReply, onReport }) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");
  const canDelete =
    user && (c.userId === user.id || c.userId === user._id || c.user === user.name || user.role === "admin");

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-gray-50/70 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition">
      <img src={avatarUrl(c.user || c.userId || `guest-${c._id}`, 64)} alt="avatar" className="w-8 h-8 rounded-full ring-1 ring-black/5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.user || "User"}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.timestamp ? new Date(c.timestamp).toLocaleString() : ""}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 break-words" dangerouslySetInnerHTML={{ __html: mdLite(c.text || "") }} />
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact("👍")}>👍 {(c.reactions?.["👍"] || 0)}</button>
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact("🎉")}>🎉 {(c.reactions?.["🎉"] || 0)}</button>
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact("❤️")}>❤️ {(c.reactions?.["❤️"] || 0)}</button>
          <span>•</span>
          <button className="hover:underline" onClick={() => setShowReply((v) => !v)}>Reply</button>
          <button className="hover:underline" onClick={onReport}>Report</button>
          {canDelete && (
            <>
              <span>•</span>
              <button className="text-rose-600 hover:underline" onClick={onDelete}>Delete</button>
            </>
          )}
        </div>
        {showReply && (
          <div className="mt-2 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (reply.trim()) {
                    onReply(reply);
                    setReply("");
                    setShowReply(false);
                    addToast("Reply posted", "success");
                  }
                }
              }}
              placeholder="Write a reply…"
              className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={() => {
                if (!reply.trim()) return;
                onReply(reply);
                setReply("");
                setShowReply(false);
                addToast("Reply posted", "success");
              }}
              className="px-3 py-1.5 rounded bg-indigo-600 text-white"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadComment({ comment, level, onReplyClick, onDelete, onReact, onReport }) {
  return (
    <div className={`flex gap-3 ${level ? "ml-8" : ""}`}>
      <img
        src={avatarUrl(comment.user || comment.userId || `guest-${comment._id}`, 64)}
        alt=""
        className="h-8 w-8 rounded-full ring-1 ring-black/5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{comment.user || "User"}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ""}
          </span>
        </div>
        <p
          className="mt-1 text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 break-words"
          dangerouslySetInnerHTML={{ __html: mdLite(comment.text || "") }}
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact(comment._id, "👍")}>
            👍 {(comment.reactions?.["👍"] || 0)}
          </button>
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact(comment._id, "🎉")}>
            🎉 {(comment.reactions?.["🎉"] || 0)}
          </button>
          <button className="hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onReact(comment._id, "❤️")}>
            ❤️ {(comment.reactions?.["❤️"] || 0)}
          </button>
          <span>•</span>
          {level === 0 && <button className="hover:underline" onClick={onReplyClick}>Reply</button>}
          <button className="hover:underline" onClick={onReport}>Report</button>
          <span>•</span>
          <button className="text-rose-600 hover:underline" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------
   App badges overlay
   ------------------------- */
function BadgeChips({ app }) {
  const chips = [];
  const now = Date.now();
  const created = new Date(app.createdAt || 0).getTime();
  if ((app.clicks || 0) > 50 || (app.likesCount || 0) > 10) chips.push({ label: "🔥 Trending", cls: "bg-rose-600" });
  if (now - created < 1000 * 60 * 60 * 24 * 7) chips.push({ label: "🆕 New", cls: "bg-emerald-600" });
  if ((app.likesCount || 0) > 20) chips.push({ label: "❤️ Top Liked", cls: "bg-indigo-600" });
  if (!chips.length) return null;
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1">
      {chips.slice(0, 2).map((c, i) => (
        <span key={i} className={`text-[10px] text-white px-2 py-0.5 rounded-full shadow ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}
