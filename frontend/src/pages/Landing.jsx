// src/pages/LandingPage.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";

export default function LandingPage() {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  const features = [
    { icon: "📚", title: "Knowledge Hub", desc: "Access tutorials, guides, and learning material." },
    { icon: "🎮", title: "Games & Fun", desc: "Mini-games to relax during breaks." },
    { icon: "🛒", title: "Daily Tools", desc: "Notes, reminders, calculators, and planners." },
    { icon: "📱", title: "App Hub", desc: "Manage and use apps within the platform." },
    { icon: "📊", title: "Analytics", desc: "Track your learning and productivity progress." },
    { icon: "🤝", title: "Collaboration Hub", desc: "Work with friends or teams in real-time." },
  ];

  const testimonials = [
    { name: "Pradeep", text: "This platform changed my productivity!" },
    { name: "Kavana", text: "Intuitive UI and useful apps." },
    { name: "Ganesh", text: "Nexora keeps me organized daily!" },
  ];

  const pricing = [
    { plan: "Free", price: "$0", features: ["Basic Analytics", "Up to 10 users"] },
    { plan: "Pro", price: "$29/mo", features: ["Advanced Analytics", "Unlimited users", "Priority Support"] },
    { plan: "Enterprise", price: "$99/mo", features: ["All features", "Dedicated Support", "Custom Integrations"] },
  ];

  return (
    <div className="font-sans relative overflow-hidden
      bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-gray-800
    ">
      {/* Background Circles */}
      <div className="absolute -z-10 w-[900px] h-[900px] bg-indigo-200/40 dark:bg-indigo-700/20 opacity-60 rounded-full -top-40 -left-40 transition-opacity" />
      <div className="absolute -z-10 w-[700px] h-[700px] bg-pink-200/30 dark:bg-pink-600/15 opacity-50 rounded-full -bottom-32 -right-32 transition-opacity" />

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition"
        >
          Nexora
        </Link>
        <div className="space-x-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg shadow-sm transition transform hover:-translate-y-0.5
              bg-white text-gray-800 ring-1 ring-gray-200 hover:shadow-md
              dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700
            "
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-lg shadow transition transform hover:scale-105
              bg-indigo-600 text-white hover:bg-indigo-700
              dark:bg-indigo-500 dark:hover:bg-indigo-600
            "
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-10 items-center">
        <div data-aos="fade-right">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Your Complete Hub for Knowledge, Tools & Entertainment
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
            Nexora offers knowledge, productivity tools, apps, games, and everything you need — all in one platform.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 rounded-xl shadow-lg bg-indigo-600 text-white hover:bg-indigo-700 transition transform hover:-translate-y-1"
          >
            Get Started Free
          </Link>
        </div>

    <div
  className="rounded-3xl p-6"
  data-aos="fade-left"
  aria-hidden="true"
>
  <div
    className="h-72 rounded-xl relative overflow-hidden
      bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-300
      dark:from-indigo-700 dark:via-indigo-800 dark:to-indigo-900
      border border-gray-200 dark:border-gray-700 shadow-lg
    "
  >
    {/* Decorative floating circles */}
    <div className="absolute w-16 h-16 bg-white/40 dark:bg-gray-800/40 rounded-full top-8 left-8 animate-bounce-slow" />
    <div className="absolute w-10 h-10 bg-pink-300/60 dark:bg-pink-500/40 rounded-full bottom-12 right-10 animate-bounce-slow delay-200" />

    {/* Image fills container */}
    <img
      src="src/assets/dashboard.png" // put your image in public/assets/
      alt="Nexora Dashboard"
      className="w-full h-full object-cover rounded-xl"
    />

    {/* Optional branding (remove if not needed) */}
    <span className="absolute bottom-4 left-4 text-indigo-700 text-lg font-semibold drop-shadow-lg">
      NEXORA
    </span>
  </div>
</div>



      </header>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">🚀 Features</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 120}
              className="p-6 rounded-2xl transition transform hover:-translate-y-2 hover:scale-[1.02]
                bg-white dark:bg-gray-800 shadow-sm dark:shadow-lg
                ring-1 ring-gray-100 dark:ring-0
                text-center
              "
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

   {/* Dashboard Preview */}
<section className="max-w-7xl mx-auto px-6 py-20">
  <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
    💻 Dashboard Preview
  </h2>
  <div
    className="rounded-3xl shadow-lg p-6 overflow-hidden
      bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-0
    "
    data-aos="zoom-in"
  >
    <div className="h-96 flex">
      {/* Sidebar with text items */}
      <div
        className="w-1/4 p-4 rounded-l-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06))",
        }}
      >
        {["Apps", "Tools", "Analytics"].map((item, idx) => (
          <div
            key={idx}
            className="mb-3 p-2 rounded text-gray-900 dark:text-white 
                       bg-white/60 dark:bg-gray-700/40 hover:opacity-90 
                       cursor-pointer shadow-sm"
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main grid with full-fit images */}
      <div className="flex-1 p-6 relative">
        <div className="grid grid-cols-2 gap-4 h-full">
          {[
            { img: "src/assets/graphs1.png" },
            { img: "src/assets/mini.png" },
            { img: "src/assets/tasks.png" },
            { img: "src/assets/notes1.png" },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden shadow-sm bg-indigo-50 dark:bg-indigo-700/60 
                         hover:scale-105 transition cursor-pointer"
            >
              <img
                src={item.img}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div className="absolute w-6 h-6 bg-indigo-300 rounded-full top-10 left-10 opacity-80 
                        dark:bg-indigo-400 animate-bounce-slow" />
        <div className="absolute w-4 h-4 bg-pink-300 rounded-full bottom-10 right-20 opacity-80 
                        dark:bg-pink-500 animate-bounce-slow delay-200" />
      </div>
    </div>
  </div>
</section>


{/* Testimonials */}
<section className="max-w-7xl mx-auto px-6 py-20 relative">
  <h2 className="text-3xl font-extrabold text-center mb-14 
    bg-gradient-to-r from-indigo-600 via-pink-500 to-purple-600 
    bg-clip-text text-transparent"
  >
    ⭐ What People Say About Nexora
  </h2>

  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
    {testimonials.map((t, i) => (
      <div
        key={i}
        data-aos="fade-up"
        data-aos-delay={i * 120}
        className="relative p-6 rounded-2xl transition transform hover:-translate-y-3 
          bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
          shadow-md hover:shadow-2xl border border-gray-100 dark:border-gray-700
        "
      >
        {/* Decorative quote icon */}
        <div className="absolute -top-5 left-6 text-6xl text-indigo-200/40 dark:text-indigo-500/20 select-none">“</div>

        {/* User avatar (auto-generated initials) */}
        <div className="flex justify-center -mt-8 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center 
            bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xl font-bold shadow-md"
          >
            {t.name[0]}
          </div>
        </div>

        {/* Testimonial text */}
        <p className="italic text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          “{t.text}”
        </p>

        {/* Author name */}
        <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>

        {/* Decorative gradient bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-600 rounded-b-2xl"></div>
      </div>
    ))}
  </div>
</section>

    

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 text-center">
        <div className="flex justify-center space-x-6 mb-4">
          <Link to="#" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Features</Link>
          {/* <Link to="/dashboard" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Dashboard</Link> */}
          <Link to="#" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Contact</Link>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">🐦</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">🐙</a>
        </div>
        <p className="text-gray-600 dark:text-gray-400">© 2025 Nexora. All rights reserved.</p>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Developed by <span className="font-semibold text-indigo-600 dark:text-indigo-400">Kartik Shet</span> • Made 🇮🇳 India ❤️</p>
      </footer>
    </div>
  );
}
