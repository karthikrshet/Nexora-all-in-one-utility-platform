// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const dm = localStorage.getItem("darkMode") === "true";
    if (stored) setUser(JSON.parse(stored));
    setDarkMode(dm);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/api/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // ⬇️ updated: make sure we send email too
  const register = async (payload) => {
    const { name, username, email, password, role } = payload;
    const { data } = await api.post("/api/auth/register", {
      name,
      username,
      email,      // IMPORTANT
      password,
      role,       // backend may ignore unless super-admin creates admin
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, darkMode, toggleDarkMode }}>
      <div className={darkMode ? "dark" : ""}>{children}</div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
