import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (e) {
      setError(e?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 shadow-md">
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 hover:scale-105 transition transform"
        >
          Nexora
        </Link>
        <div>
          <Link to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">Login</Link>
          <Link to="/register" className="ml-2 px-4 py-2 bg-white text-indigo-600 rounded hover:bg-indigo-100 transition">Register</Link>
        </div>
      </nav>

      {/* Login Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Sign In</h2>

          {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 text-center">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded border dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-300">
            No account? <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
          </p>
        </div>


      </motion.div>

      {/* Footer */}
      <footer className="py-6 bg-white dark:bg-gray-800 text-center text-gray-600 dark:text-gray-300 shadow-inner">
        Developed by <span className="font-semibold">Kartik Shet</span> • Made in India ❤️
      </footer>
    </div>
  );
}
