// src/components/AppCard.jsx
import React from "react";

export default function AppCard({ app, onClick, onLike, onShare, onComments }) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 dark:bg-gray-800 ${app?.liked ? "border-l-4 border-indigo-500" : ""}`}>
      <div className="p-4" onClick={onClick} style={{ cursor: app?.url ? "pointer" : "default" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src={app?.image || "https://placehold.co/80"} alt={app?.name} className="w-12 h-12 rounded mr-3 object-cover" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{app?.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{app?.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-300">{app?.clicks || 0} clicks</div>
            <div className="text-xs text-gray-400">{app?.likesCount ?? 0} likes</div>
          </div>
        </div>

        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={(e) => { e.stopPropagation(); onLike && onLike(); }} className={`flex items-center space-x-1 ${app?.liked ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill={app?.liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <span className="text-sm">{app?.likesCount ?? 0}</span>
          </button>

          <button onClick={(e) => { e.stopPropagation(); onComments && onComments(); }} className="flex items-center space-x-1 text-gray-500 dark:text-gray-400" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-sm">Comment</span>
          </button>

          <button onClick={(e) => { e.stopPropagation(); onShare && onShare(); }} className="flex items-center space-x-1 text-gray-500 dark:text-gray-400" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <span className="text-sm">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
