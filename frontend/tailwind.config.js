// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  // scan these files for classes
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // Use class strategy so adding "dark" to <html> toggles dark styles
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
