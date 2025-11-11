import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { AppContext } from "../App";

/* =====================================================
   Shared: tiny win overlay (no external libs)
   ===================================================== */
function WinOverlay({ show, title = "You win!", subtitle }) {
  const [visible, setVisible] = useState(show);
  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [show]);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 animate-fade" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-6 py-5 text-center border border-indigo-500/30">
        <div className="text-4xl">🎉</div>
        <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{title}</div>
        {subtitle && (
          <div className="text-sm mt-1 text-gray-700 dark:text-gray-300">{subtitle}</div>
        )}
        {/* confetti-like sprinkles */}
        <div className="absolute -top-2 -left-2 w-3 h-3 bg-rose-400 rounded-full animate-bounce" />
        <div className="absolute -bottom-2 -right-3 w-3 h-3 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
export function FindPair(props) {
  return <MemoryGame {...props} />;
}

/* utility */
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* =====================================================
   Tic Tac Toe — solid, with win overlay
   ===================================================== */
export function TicTacToe({ onWin }) {
  const { user } = useContext(AppContext);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [showWin, setShowWin] = useState(false);

  function calculateWinner(b) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, bb, c] of lines)
      if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a];
    if (b.every(Boolean)) return "draw";
    return null;
  }

  useEffect(() => {
    const w = calculateWinner(board);
    if (w) {
      setShowWin(true);
      if (w !== "draw") onWin?.({ won: true, basePoints: 15, bonus: w === "X" ? 5 : 3, meta: { winner: w } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  function handleClick(i) {
    if (board[i] || calculateWinner(board)) return;
    const next = board.slice();
    next[i] = xIsNext ? "X" : "O";
    setBoard(next);
    setXIsNext(!xIsNext);
  }
  function reset() {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setShowWin(false);
  }
  const winner = calculateWinner(board);
  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 w-48">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-14 h-14 text-2xl font-bold bg-gray-100 rounded dark:bg-gray-700 dark:text-white"
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
        {winner ? (winner === "draw" ? "It's a draw" : `Winner: ${winner}`) : `Next: ${xIsNext ? "X" : "O"}`}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
          Reset
        </button>
      </div>
      <WinOverlay show={showWin && winner !== "draw"} title={`You win, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Memory Match — fixed timing + win overlay
   ===================================================== */
export function MemoryGame({ onWin }) {
  const { user } = useContext(AppContext);
  const base = ["🍎", "🍌", "🍇", "🍉", "🍒", "🥝"]; // 6 pairs => 12 cards
  const makeCards = () =>
    shuffle([...base, ...base]).map((v, i) => ({ id: i, v, open: false, done: false }));
  const [cards, setCards] = useState(makeCards);
  const [openIds, setOpenIds] = useState([]);
  const [showWin, setShowWin] = useState(false);

  useEffect(() => {
    if (openIds.length === 2) {
      const [a, b] = openIds;
      if (cards[a].v === cards[b].v) {
        setTimeout(() => {
          setCards((cs) => cs.map((c, idx) => (idx === a || idx === b ? { ...c, done: true } : c)));
          setOpenIds([]);
        }, 300);
      } else {
        setTimeout(() => {
          setCards((cs) => cs.map((c, idx) => (idx === a || idx === b ? { ...c, open: false } : c)));
          setOpenIds([]);
        }, 650);
      }
    }
  }, [openIds, cards]);

  useEffect(() => {
    if (cards.every((c) => c.done)) {
      setShowWin(true);
      onWin?.({ won: true, basePoints: 12, bonus: 6, meta: { pairs: cards.length / 2 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const flip = (i) => {
    if (cards[i].open || cards[i].done || openIds.length === 2) return;
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, open: true } : c)));
    setOpenIds((ids) => [...ids, i]);
  };
  const reset = () => {
    setCards(makeCards());
    setOpenIds([]);
    setShowWin(false);
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-2 w-56">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => flip(i)}
            className="w-12 h-12 text-xl rounded flex items-center justify-center bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-sm"
          >
            {c.open || c.done ? c.v : "❓"}
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        {cards.every((c) => c.done) ? "Completed!" : "Find all pairs"}
      </div>
      <button onClick={reset} className="mt-2 px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Reset
      </button>
      <WinOverlay show={showWin} title={`Nice memory, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Rock Paper Scissors — stable + win overlay on win
   ===================================================== */
export function RockPaperScissors({ onWin }) {
  const { user } = useContext(AppContext);
  const choices = ["Rock", "Paper", "Scissors"];
  const [result, setResult] = useState("");
  const [showWin, setShowWin] = useState(false);
  function play(choice) {
    const cpu = choices[Math.floor(Math.random() * 3)];
    if (choice === cpu) setResult(`Tie — CPU chose ${cpu}`);
    else {
      const wins =
        (choice === "Rock" && cpu === "Scissors") ||
        (choice === "Paper" && cpu === "Rock") ||
        (choice === "Scissors" && cpu === "Paper");
      const res = wins ? `You win — CPU chose ${cpu}` : `You lose — CPU chose ${cpu}`;
      setResult(res);
      if (wins) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 5, bonus: 2, meta: { cpu } });
      }
    }
  }
  return (
    <div className="relative">
      <div className="flex gap-2">
        {choices.map((c) => (
          <button key={c} onClick={() => play(c)} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
            {c}
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{result}</div>
      <WinOverlay show={showWin} title={`GG, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Guess the Number — input guarded, clearer feedback
   ===================================================== */
export function GuessNumber({ onWin }) {
  const { user } = useContext(AppContext);
  const [secret, setSecret] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [tries, setTries] = useState(0);
  const [showWin, setShowWin] = useState(false);
  function submit() {
    const g = Number(guess);
    if (!Number.isFinite(g) || g < 1 || g > 100) {
      setMsg("Enter a number 1–100");
      return;
    }
    setTries((t) => t + 1);
    if (g === secret) {
      setMsg(`Correct in ${tries + 1} tries! 🎉`);
      setShowWin(true);
      onWin?.({ won: true, basePoints: 10, bonus: Math.max(0, 10 - (tries + 1)), meta: { secret } });
    } else if (g < secret) setMsg("Too low");
    else setMsg("Too high");
  }
  function reset() {
    setSecret(Math.floor(Math.random() * 100) + 1);
    setGuess("");
    setMsg("");
    setTries(0);
  }
  return (
    <div className="relative">
      <input
        value={guess}
        onChange={(e) => setGuess(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="1-100"
        className="px-2 py-1 rounded border bg-white/90 dark:bg-gray-700 dark:text-white mr-2"
      />
      <button onClick={submit} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Guess
      </button>
      <button onClick={reset} className="px-3 py-1 ml-2 rounded border text-gray-800 dark:text-gray-200">Reset</button>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{msg}</div>
      <WinOverlay show={showWin} title={`Nice, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* ===================================================== */
export function DiceRoll() {
  const [n, setN] = useState(null);
  return (
    <div>
      <div className="text-4xl mb-3 text-gray-900 dark:text-white">{n ?? "—"}</div>
      <button onClick={() => setN(Math.floor(Math.random() * 6) + 1)} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Roll
      </button>
    </div>
  );
}
export function CoinFlip() {
  const [side, setSide] = useState(null);
  return (
    <div>
      <div className="text-4xl mb-3 text-gray-900 dark:text-white">{side ?? "—"}</div>
      <button onClick={() => setSide(Math.random() < 0.5 ? "Heads" : "Tails")} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Flip
      </button>
    </div>
  );
}

/* =====================================================
   Reaction Time — unchanged core, win if <300ms
   ===================================================== */
export function ReactionTime({ onWin }) {
  const { user } = useContext(AppContext);
  const [state, setState] = useState("idle");
  const [start, setStart] = useState(0);
  const [times, setTimes] = useState([]);
  const [showWin, setShowWin] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  function begin() {
    setState("waiting");
    timerRef.current = setTimeout(() => {
      setState("now");
      setStart(performance.now());
    }, 800 + Math.random() * 1600);
  }
  function hit() {
    if (state === "now") {
      const t = performance.now() - start;
      setTimes((prev) => [t, ...prev].slice(0, 10));
      setState("idle");
      if (t < 300) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 8, bonus: Math.round((300 - t) / 50), meta: { time: t } });
      }
    } else if (state === "waiting") {
      clearTimeout(timerRef.current);
      setState("idle");
    } else {
      begin();
    }
  }
  return (
    <div className="relative">
      <div className="mb-2">
        {state === "idle" && <div className="text-sm text-gray-600 dark:text-gray-300">Click Start to test reaction</div>}
        {state === "waiting" && <div className="text-sm text-gray-600 dark:text-gray-300">Wait for green...</div>}
        {state === "now" && <div className="text-sm text-green-600">Click now!</div>}
      </div>
      <div className="flex gap-2">
        <button onClick={hit} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
          Start/Click
        </button>
        <button onClick={() => { setTimes([]); setState("idle"); }} className="px-3 py-1 rounded border bg-transparent text-gray-800 dark:text-gray-200">
          Reset
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">Times: {times.map((t) => Math.round(t)).join(", ") || "—"}</div>
      <WinOverlay show={showWin} title={`Lightning fast, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Simon Says — win after 6 steps
   ===================================================== */
export function SimonSays({ onWin }) {
  const { user } = useContext(AppContext);
  const colors = ["red", "green", "blue", "yellow"];
  const [seq, setSeq] = useState([]);
  const [userSeq, setUserSeq] = useState([]);
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(false);
  const [showWin, setShowWin] = useState(false);

  function addStep() {
    setSeq((s) => [...s, colors[Math.floor(Math.random() * 4)]]);
    setUserSeq([]);
    setMessage("");
    setPlaying(true);
  }

  function press(c) {
    if (!playing) return;
    const next = [...userSeq, c];
    setUserSeq(next);
    if (seq[next.length - 1] !== c) {
      setMessage("Wrong! Try again");
      setPlaying(false);
      setSeq([]);
      setUserSeq([]);
      return;
    }
    if (next.length === seq.length) {
      if (seq.length >= 6) {
        setPlaying(false);
        setShowWin(true);
        onWin?.({ won: true, basePoints: 12, bonus: 8, meta: { length: seq.length } });
      } else {
        setMessage("Good! Next round.");
        setTimeout(() => addStep(), 700);
      }
    }
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2 w-56">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => press(c)}
            className={`h-12 rounded ${
              c === "red"
                ? "bg-red-400"
                : c === "green"
                ? "bg-green-400"
                : c === "blue"
                ? "bg-blue-400"
                : "bg-yellow-300"
            } shadow-sm`}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={addStep} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
          Start / Next
        </button>
        <button onClick={() => { setSeq([]); setUserSeq([]); setMessage(""); setPlaying(false); }} className="px-3 py-1 rounded border text-gray-800 dark:text-gray-200">
          Reset
        </button>
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</div>
      <WinOverlay show={showWin} title={`Pattern master, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* ===================================================== */
export function WhackAMole({ onWin }) {
  const { user } = useContext(AppContext);
  const [grid] = useState(Array(9).fill(null));
  const [mole, setMole] = useState(-1);
  const [score, setScore] = useState(0);
  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setMole(Math.floor(Math.random() * 9)), 900);
    return () => clearInterval(id);
  }, []);
  function hit(i) {
    if (i === mole) {
      const next = score + 1;
      setScore(next);
      if (next >= 6) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 10, bonus: Math.max(0, next - 5), meta: { score: next } });
      }
    }
  }
  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 w-48">
        {grid.map((_, i) => (
          <button key={i} onClick={() => hit(i)} className="h-12 rounded bg-white/90 dark:bg-gray-700">
            {i === mole ? "🐹" : ""}
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Score: {score}</div>
      <WinOverlay show={showWin} title={`Mole slayer, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* ===================================================== */
export function TypingTest() {
  const sample = "The quick brown fox jumps over the lazy dog";
  const [value, setValue] = useState("");
  const [start, setStart] = useState(null);
  const [time, setTime] = useState(null);

  function onChange(v) {
    if (!start) setStart(performance.now());
    setValue(v);
    if (v === sample) setTime((performance.now() - start) / 1000);
  }
  return (
    <div>
      <div className="text-sm mb-2 text-gray-700 dark:text-gray-300">{sample}</div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border rounded bg-white/90 dark:bg-gray-700 dark:text-white" rows={3} />
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{time ? `Completed in ${time.toFixed(2)}s` : "Keep typing..."}</div>
      <button onClick={() => { setValue(""); setStart(null); setTime(null); }} className="mt-2 px-3 py-1 rounded border text-gray-800 dark:text-gray-200">
        Reset
      </button>
    </div>
  );
}

/* ===================================================== */
export function ColorMatch({ onWin }) {
  const { user } = useContext(AppContext);
  const items = ["red", "green", "blue", "yellow", "purple", "orange"];
  const [target, setTarget] = useState(items[0]);
  const [streak, setStreak] = useState(0);
  const [showWin, setShowWin] = useState(false);
  useEffect(() => setTarget(items[Math.floor(Math.random() * items.length)]), []);
  function pick(c) {
    if (c === target) {
      const ns = streak + 1;
      setStreak(ns);
      if (ns >= 5) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 7, bonus: 5, meta: { streak: ns } });
      }
    } else setStreak(0);
    setTarget(items[Math.floor(Math.random() * items.length)]);
  }
  return (
    <div className="relative">
      <div className="mb-2 text-gray-900 dark:text-white">
        Pick the color: <strong className="ml-1">{target}</strong>
      </div>
      <div className="flex gap-2 flex-wrap max-w-sm">
        {items.map((c) => (
          <button key={c} onClick={() => pick(c)} className="px-3 py-1 rounded text-white" style={{ background: c }}>
            {c}
          </button>
        ))}
      </div>
      <div className="text-sm mt-2 text-gray-700 dark:text-gray-300">Streak: {streak}/5</div>
      <WinOverlay show={showWin} title={`Colors on lock, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* ===================================================== */
export function Anagram({ onWin }) {
  const { user } = useContext(AppContext);
  const words = ["react", "plane", "house", "coding", "garden"];
  const [w, setW] = useState(words[Math.floor(Math.random() * words.length)]);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const [showWin, setShowWin] = useState(false);
  const scrambled = useMemo(() => w.split("").sort(() => Math.random() - 0.5).join(""), [w]);
  function submit() {
    if (val.toLowerCase().trim() === w) {
      setMsg("Correct!");
      setShowWin(true);
      onWin?.({ won: true, basePoints: 9, bonus: 3, meta: { word: w } });
    } else setMsg("Try again");
  }
  function reset() {
    setW(words[Math.floor(Math.random() * words.length)]);
    setVal("");
    setMsg("");
    setShowWin(false);
  }
  return (
    <div className="relative">
      <div className="mb-2 text-gray-900 dark:text-white">
        Unscramble: <strong>{scrambled}</strong>
      </div>
      <input value={val} onChange={(e) => setVal(e.target.value)} className="px-2 py-1 rounded border bg-white/90 dark:bg-gray-700 dark:text-white mr-2" />
      <button onClick={submit} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Check
      </button>
      <button onClick={reset} className="px-3 py-1 ml-2 rounded border">New</button>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{msg}</div>
      <WinOverlay show={showWin} title={`Word wiz, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* ===================================================== */
export function BubblePop() {
  const [score, setScore] = useState(0);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 w-56">
        {Array.from({ length: 20 }).map((_, i) => (
          <button key={i} onClick={() => setScore((s) => s + 1)} className="h-8 rounded bg-blue-200 dark:bg-blue-600">
            •
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">Popped: {score}</div>
    </div>
  );
}
export function Clicker() {
  const [n, setN] = useState(0);
  return (
    <div>
      <div className="text-2xl text-gray-900 dark:text-white">{n}</div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => setN((x) => x + 1)} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
          Click
        </button>
        <button onClick={() => setN(0)} className="px-3 py-1 rounded border text-gray-800 dark:text-gray-200">
          Reset
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   QuickMath — timed mini-quiz
   ===================================================== */
export function QuickMath({ onWin }) {
  const { user } = useContext(AppContext);
  const gen = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { a, b, ans: a + b };
  };
  const [q, setQ] = useState(gen);
  const [val, setVal] = useState("");
  const [correct, setCorrect] = useState(0);
  const [showWin, setShowWin] = useState(false);

  function submit() {
    if (Number(val) === q.ans) {
      const c = correct + 1;
      setCorrect(c);
      if (c >= 5) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 9, bonus: 4, meta: { correct: c } });
      }
      setQ(gen());
      setVal("");
    }
  }
  return (
    <div className="relative">
      <div className="text-lg mb-2 text-gray-900 dark:text-white">
        {q.a} + {q.b} = ? (score {correct}/5)
      </div>
      <input value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))} className="px-2 py-1 rounded border bg-white/90 dark:bg-gray-700 dark:text-white mr-2" />
      <button onClick={submit} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Check
      </button>
      <WinOverlay show={showWin} title={`Math beast, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Spot The Odd — user picks the odd element
   ===================================================== */
export function SpotOdd({ onWin }) {
  const { user } = useContext(AppContext);
  const arrays = [
    [1, 1, 1, 2, 1],
    ["a", "a", "b", "a", "a"],
    [5, 5, 5, 5, 8],
  ];
  const [arr, setArr] = useState(arrays[Math.floor(Math.random() * arrays.length)]);
  const [picked, setPicked] = useState(null);
  const [msg, setMsg] = useState("");
  const [showWin, setShowWin] = useState(false);
  const oddIndex = useMemo(() => arr.findIndex((x, i, a) => a.indexOf(x) !== a.lastIndexOf(x) ? false : a.filter(y=>y===x).length===1), [arr]);

  function choose(i) {
    setPicked(i);
    if (i === oddIndex) {
      setMsg("Correct!");
      setShowWin(true);
      onWin?.({ won: true, basePoints: 7, bonus: 3, meta: { index: i } });
    } else setMsg("Nope");
  }
  function reset() {
    setArr(arrays[Math.floor(Math.random() * arrays.length)]);
    setPicked(null);
    setMsg("");
    setShowWin(false);
  }
  return (
    <div className="relative">
      <div className="mb-2 text-gray-900 dark:text-white">Pick the odd one out:</div>
      <div className="flex gap-2">
        {arr.map((x, i) => (
          <button
            key={i}
            onClick={() => choose(i)}
            className={`px-3 py-1 rounded border ${picked === i ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-700 dark:text-white"}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{msg}</div>
      <button onClick={reset} className="mt-2 px-3 py-1 rounded border">New</button>
      <WinOverlay show={showWin} title={`Sharp eyes, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Sequence Memory — show then ask to reproduce by clicking
   ===================================================== */
export function SequenceMemory({ onWin }) {
  const { user } = useContext(AppContext);
  const [seq] = useState(() => Array.from({ length: 5 }, () => Math.floor(Math.random() * 9) + 1));
  const [show, setShow] = useState(true);
  const [i, setI] = useState(0);
  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, []);
  function press(n) {
    if (show) return;
    if (n === seq[i]) {
      if (i + 1 === seq.length) {
        setShowWin(true);
        onWin?.({ won: true, basePoints: 11, bonus: 6, meta: { length: seq.length } });
      } else setI(i + 1);
    } else {
      setI(0);
      setShow(true);
      setTimeout(() => setShow(false), 1000);
    }
  }
  return (
    <div className="relative">
      <div className="mb-2 text-gray-900 dark:text-white">Memorize the sequence:</div>
      <div className="text-lg text-gray-700 dark:text-gray-300">{show ? seq.join(" ") : "Hidden — recall now"}</div>
      <div className="grid grid-cols-5 gap-2 mt-3 w-56">
        {Array.from({ length: 9 }, (_, n) => n + 1).map((n) => (
          <button key={n} onClick={() => press(n)} className="h-10 rounded bg-white/90 dark:bg-gray-700">
            {n}
          </button>
        ))}
      </div>
      <WinOverlay show={showWin} title={`Memory steel, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   Hangman — basic implementation
   ===================================================== */
export function Hangman({ onWin }) {
  const { user } = useContext(AppContext);
  const WORDS = ["banana", "puzzle", "react", "wizard", "player", "memory", "garden", "planet"];
  const [word, setWord] = useState(WORDS[rnd(WORDS.length)]);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const [showWin, setShowWin] = useState(false);

  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const masked = word
    .split("")
    .map((ch) => (guessed.has(ch) ? ch : "_"))
    .join(" ");

  useEffect(() => {
    if (!masked.includes("_")) {
      setShowWin(true);
      onWin?.({ won: true, basePoints: 14, bonus: 6, meta: { word } });
    }
  }, [masked, onWin, word]);

  function pick(ch) {
    if (guessed.has(ch) || wrong >= 6) return;
    setGuessed((s) => new Set(s).add(ch));
    if (!word.includes(ch)) setWrong((w) => w + 1);
  }
  function reset() {
    setWord(WORDS[rnd(WORDS.length)]);
    setGuessed(new Set());
    setWrong(0);
    setShowWin(false);
  }

  return (
    <div className="relative">
      <div className="text-2xl font-mono tracking-widest text-gray-900 dark:text-white">{masked}</div>
      <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">Wrong: {wrong}/6</div>
      <div className="flex flex-wrap gap-1 mt-3 max-w-xs">
        {letters.map((ch) => (
          <button
            key={ch}
            disabled={guessed.has(ch) || wrong >= 6}
            onClick={() => pick(ch)}
            className="px-2 py-1 rounded border text-sm disabled:opacity-40"
          >
            {ch}
          </button>
        ))}
      </div>
      <div className="mt-2">
        <button onClick={reset} className="px-3 py-1 rounded border">New word</button>
      </div>
      <WinOverlay show={showWin} title={`Hanged the word, ${user?.name || "Player"}!`} />
    </div>
  );
}

/* =====================================================
   MathQuiz (kept; used by list)
   ===================================================== */
export function MathQuiz({ onWin }) {
  const { user } = useContext(AppContext);
  const generate = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { a, b, ans: a + b };
  };
  const [q, setQ] = useState(generate);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("");
  const [showWin, setShowWin] = useState(false);

  function submit() {
    if (Number(val) === q.ans) {
      setMsg("Correct!");
      setShowWin(true);
      onWin?.({ won: true, basePoints: 7, bonus: 3, meta: { a: q.a, b: q.b } });
      setQ(generate());
      setVal("");
    } else {
      setMsg("Wrong, try again");
    }
  }

  return (
    <div className="relative">
      <div className="text-lg mb-2 text-gray-900 dark:text-white">
        {q.a} + {q.b} = ?
      </div>
      <input value={val} onChange={(e) => setVal(e.target.value)} className="px-2 py-1 rounded border bg-white/90 dark:bg-gray-700 dark:text-white mr-2" />
      <button onClick={submit} className="px-3 py-1 rounded bg-white text-black shadow-sm dark:bg-white/10 dark:text-white">
        Check
      </button>
      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{msg}</div>
      <WinOverlay show={showWin} title={`Math win, ${user?.name || "Player"}!`} />
    </div>
  );
}


/* --------------------------
   Metadata + maps (MUST come after the definitions!)
   -------------------------- */

export const gamesList = [
  { id: "tictactoe", title: "Tic Tac Toe",        description: "Classic 3×3 X/O game",            image: "https://picsum.photos/id/1015/640/360", slug: "tictactoe" },
  { id: "memory",     title: "Memory Match",       description: "Find all matching pairs",         image: "https://picsum.photos/id/1025/640/360", slug: "memory" },
  { id: "rps",        title: "Rock Paper Scissors",description: "Beat the CPU",                    image: "https://picsum.photos/id/1024/640/360", slug: "rps" },
  { id: "guess",      title: "Guess the Number",   description: "Guess 1–100 with hints",          image: "https://picsum.photos/id/1044/640/360", slug: "guess" },
  { id: "dice",       title: "Dice Roll",          description: "Simple die roller",               image: "https://picsum.photos/id/1062/640/360", slug: "dice" },
  { id: "coin",       title: "Coin Flip",          description: "Heads or tails?",                 image: "https://picsum.photos/id/1069/640/360", slug: "coin" },
  { id: "reaction",   title: "Reaction Time",      description: "Click as fast as you can",        image: "https://picsum.photos/id/1074/640/360", slug: "reaction" },
  { id: "simon",      title: "Simon Says",         description: "Repeat the color sequence",       image: "https://picsum.photos/id/1060/640/360", slug: "simon" },
  { id: "whack",      title: "Whack-A-Mole",       description: "Tap the mole quickly",            image: "https://picsum.photos/id/1070/640/360", slug: "whack" },
  { id: "typing",     title: "Typing Test",        description: "Type the pangram fast",           image: "https://picsum.photos/id/1084/640/360", slug: "typing" },
  { id: "mathquiz",   title: "Math Quiz",          description: "Quick addition drills",           image: "https://picsum.photos/id/1080/640/360", slug: "mathquiz" },
  { id: "hangman",    title: "Hangman",            description: "Guess the hidden word",           image: "https://picsum.photos/id/1081/640/360", slug: "hangman" },
  { id: "colormatch", title: "Color Match",        description: "Pick the named color",            image: "https://picsum.photos/id/1082/640/360", slug: "colormatch" },
  { id: "anagram",    title: "Anagram",            description: "Unscramble the word",             image: "https://picsum.photos/id/1083/640/360", slug: "anagram" },
  { id: "bubblepop",  title: "Bubble Pop",         description: "Pop as many as you can",          image: "https://picsum.photos/id/1085/640/360", slug: "bubblepop" },
  { id: "clicker",    title: "Clicker",            description: "Endless clicking fun",            image: "https://picsum.photos/id/1089/640/360", slug: "clicker" },
  { id: "quickmath",  title: "Quick Math",         description: "Five fast correct answers",       image: "https://picsum.photos/id/1090/640/360", slug: "quickmath" },
  { id: "spotodd",    title: "Spot The Odd",       description: "Find the odd one out",            image: "https://picsum.photos/id/1091/640/360", slug: "spotodd" },
  { id: "seqmem",     title: "Sequence Memory",    description: "Memorize & reproduce numbers",    image: "https://picsum.photos/id/1092/640/360", slug: "seqmem" },
  { id: "findpair",   title: "Find Pair",          description: "Another pairs challenge",         image: "https://picsum.photos/id/1093/640/360", slug: "findpair" },
];

export const GAMES_MAP = {
  tictactoe: TicTacToe,
  memory: MemoryGame,
  rps: RockPaperScissors,
  guess: GuessNumber,
  dice: DiceRoll,
  coin: CoinFlip,
  reaction: ReactionTime,
  simon: SimonSays,
  whack: WhackAMole,
  typing: TypingTest,
  mathquiz: MathQuiz,
  hangman: Hangman,           // ✅ map to the real Hangman
  colormatch: ColorMatch,
  anagram: Anagram,
  bubblepop: BubblePop,
  clicker: Clicker,
  quickmath: QuickMath,
  spotodd: SpotOdd,
  seqmem: SequenceMemory,
  findpair: FindPair,         // ✅ wrapper uses MemoryGame
};


/* --------------------------
   Image modal & GamesLauncher (UI)
   -------------------------- */
function ImageModal({ url, title, onClose }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-w-3xl w-full rounded overflow-hidden shadow-lg bg-white dark:bg-gray-900">
        <div className="relative">
          <img src={url} alt={title} className="w-full h-auto object-cover" />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-3 bg-white/90 dark:bg-gray-800 dark:text-gray-200">
          <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="text-sm opacity-80 mt-1 text-gray-700 dark:text-gray-300">Image preview — close to continue</div>
        </div>
      </div>
    </div>
  );
}

export function GamesLauncher({ games = gamesList, onPlay }) {
  const [modal, setModal] = useState({ url: null, title: null });

  // Tailwind gradient class combos with dark: variants so cards look good in both modes
  const gradientClasses = [
    "from-cyan-400 to-blue-500 dark:from-cyan-700 dark:to-blue-900",
    "from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-900",
    "from-red-400 to-yellow-500 dark:from-red-600 dark:to-yellow-700",
    "from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-800",
    "from-violet-400 to-cyan-400 dark:from-violet-700 dark:to-cyan-800",
    "from-pink-400 to-rose-500 dark:from-pink-600 dark:to-rose-700",
    "from-sky-400 to-indigo-500 dark:from-sky-700 dark:to-indigo-900",
  ];

  function openImage(url, title) {
    setModal({ url, title });
  }
  function closeModal() {
    setModal({ url: null, title: null });
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((g, idx) => {
          const grad = gradientClasses[idx % gradientClasses.length];
          return (
            <div
              key={g.id}
              className={`rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:-translate-y-2 bg-gradient-to-br ${grad}`}
            >
              <div className="p-4 flex gap-4 items-start">
                <div
                  className="relative w-36 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-inner cursor-pointer border border-white/20"
                  onClick={() => openImage(g.image, g.title)}
                >
                  {g.image ? (
                    <img src={g.image} alt={g.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-white/80 bg-black/20">No image</div>
                  )}

                  <div className="absolute left-2 bottom-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
                    Preview
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white">{g.title}</h3>
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded">{g.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/90">{g.description}</p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onPlay && onPlay(g.slug)}
                      className="px-3 py-1 rounded font-medium shadow-sm bg-white text-black hover:opacity-95 dark:bg-white/10 dark:text-white"
                    >
                      Play
                    </button>

                    <button
                      onClick={() => openImage(g.image, g.title)}
                      className="px-3 py-1 rounded border border-white/30 text-white bg-white/10 hover:bg-white/20"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ImageModal url={modal.url} title={modal.title} onClose={closeModal} />
    </>
  );
}