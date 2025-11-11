// src/components/GameWrapper.jsx
import React, { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti"; // optional - install with `npm i react-confetti`
import api from "../services/api";

/**
 * GameWrapper
 * - wraps an individual game component so we can:
 *   - receive onWin events from the game via props.onWin
 *   - persist the game session to the server
 *   - show confetti/sound on win
 *
 * Props:
 *  - slug: string (game slug)
 *  - GameComponent: React component (the game)
 *  - gameProps: extra props forwarded to the game
 *  - onSessionSaved: async callback after successful save -> e.g. refresh user stats
 *  - autoCloseOnWin: boolean (if true, it will close modal after save) — wrapper won't close itself; parent should close
 */
export default function GameWrapper({
  slug,
  GameComponent,
  gameProps = {},
  onSessionSaved,
  autoCloseOnWin = false,
}) {
  const [celebrate, setCelebrate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // preload sound (optional)
    try {
      audioRef.current = new Audio("/celebrate-short.mp3"); // optional: add this file to /public
      audioRef.current.volume = 0.7;
    } catch (e) {
      audioRef.current = null;
    }
  }, []);

  // Handler called by child games via onWin(...)
  const handleWin = async (winInfo = {}) => {
    // winInfo expected shape: { won: true, basePoints, bonus, meta }
    try {
      setCelebrate(true);
      if (audioRef.current) {
        // ignore play errors due to browser autoplay policy
        audioRef.current.play().catch(() => {});
      }

      // Build session payload to save to server
      const sessionPayload = {
        gameSlug: slug,
        won: !!winInfo.won,
        basePoints: Number(winInfo.basePoints ?? 0),
        bonus: Number(winInfo.bonus ?? 0),
        meta: winInfo.meta || {},
        // optionally include duration, score, attempts, etc in meta
        createdAt: new Date().toISOString(),
      };

      setSaving(true);
      // POST to backend (/api/games/sessions)
      const res = await api.post("/api/games/sessions", sessionPayload);
      const saved = res?.data;

      setLastSession(saved);
      setSaving(false);

      // fire parent callback so UI/stats can refresh
      if (typeof onSessionSaved === "function") {
        try {
          await onSessionSaved(saved);
        } catch (e) {
          // ignore
        }
      }

      // stop celebration after a short timeout
      setTimeout(() => setCelebrate(false), 1600);

      // optionally auto-close (parent should implement closing by checking saved or callback)
      if (autoCloseOnWin && typeof onSessionSaved === "function") {
        // parent decides to close; we just notify (onSessionSaved may call close)
      }
    } catch (err) {
      setSaving(false);
      setCelebrate(false);
      console.error("Failed to save game session", err);
      // show non-blocking alert
      alert("Could not save game session. Try again later.");
    }
  };

  return (
    <div className="relative">
      {/* celebration overlay (use react-confetti if available) */}
      {celebrate ? (
        <>
          {typeof Confetti !== "undefined" ? (
            <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={120} />
          ) : (
            <div className="confetti-overlay" aria-hidden>
              {["🎉", "✨", "🎊", "🥳", "👏", "💥"].map((e, i) => (
                <div key={i} className="confetti" style={{ fontSize: 20 + Math.random() * 28 }}>
                  {e}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      <div>
        {/* Render the game and forward an onWin prop so games call it */}
        <GameComponent {...gameProps} onWin={handleWin} />
      </div>

      {/* Small status area */}
      <div className="mt-3 flex items-center gap-3">
        {saving && <div className="text-sm text-gray-500">Saving session...</div>}
        {!saving && lastSession && (
          <div className="text-sm text-green-600">Saved: +{(lastSession.basePoints ?? 0) + (lastSession.bonus ?? 0)} pts</div>
        )}
      </div>
    </div>
  );
}
