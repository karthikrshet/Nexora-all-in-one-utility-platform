// src/components/Loader.jsx
import React from "react";

export default function Loader({ small = false }) {
  return (
    <div className={`flex items-center justify-center ${small ? "h-8" : "h-40"}`}>
      <div className={`animate-spin rounded-full ${small ? "h-6 w-6 border-b-2" : "h-12 w-12 border-4"} border-indigo-600`} />
    </div>
  );
}
