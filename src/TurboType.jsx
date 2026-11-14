import { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Flame,
  Crown,
  Keyboard,
  Timer,
  Flag,
  ArrowRight,
  Trash2,
} from "lucide-react";
import confetti from "canvas-confetti";

// Daftar kata bahasa Indonesia & istilah teknologi populer (ringkas & enak diketik cepat)
const WORD_POOL = [
  "kode",
  "sistem",
  "cepat",
  "layar",
  "data",
  "jaringan",
  "server",
  "logika",
  "aplikasi",
  "digital",
  "kreatif",
  "inovasi",
  "teknologi",
  "program",
  "desain",
  "internet",
  "komputer",
  "perangkat",
  "algoritma",
  "memori",
  "prosesor",
  "cloud",
  "keamanan",
  "siber",
  "database",
  "antarmuka",
  "pengguna",
  "proyek",
  "tim",
  "juara",
  "menang",
  "balapan",
  "turbo",
  "mesin",
  "kecepatan",
  "fokus",
  "akurasi",
  "tombol",
  "ketik",
  "waktu",
  "ronde",
  "skor",
  "rekor",
  "pameran",
  "karya",
  "masa",
  "depan",
  "cerdas",
  "otomatis",
  "robot",
  "sensor",
  "sinyal",
  "energi",
  "listrik",
  "baterai",
  "modul",
  "sistem",
  "versi",
  "rilis",
  "uji",
  "coba",
  "sukses",
  "hebat",
  "tangguh",
  "lincah",
  "presisi",
  "target",
  "misi",
  "arena",
  "podium",
  "trofi",
  "bintang",
  "kilat",
  "badai",
  "api",
  "baja",
  "titanium",
  "kapsul",
  "roket",
  "orbit",
  "stasiun",
  "radar",
  "navigasi",
  "kompas",
  "peta",
  "jalur",
  "lintasan",
  "tikungan",
  "gas",
  "rem",
  "kopling",
  "gigi",
  "pitstop",
  "mekanik",
  "insinyur",
  "arsitek",
  "analis",
  "strategi",
  "taktik",
  "aksi",
  "reaksi",
  "refleks",
  "insting",
  "irama",
  "tempo",
  "detik",
  "menit",
  "jam",
];

const STORAGE_KEY = "turbotype_expo_hof_v2";

const DEFAULT_LEADERBOARD = [
  { id: 1, name: "PANITIA_01", wpm: 48, accuracy: 96, mode: "DUEL" },
  { id: 2, name: "GUEST_PRO", wpm: 41, accuracy: 94, mode: "ESTAFET" },
  { id: 3, name: "ROOKIE_X", wpm: 32, accuracy: 91, mode: "DUEL" },
];

// Generator suara mekanikal sintetis via Web Audio API
const createSoundEngine = () => {
  let ctx = null;
  const getCtx = () => {
    if (!ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  return {
    playKey: (correct = true, combo = 0) => {
      try {
        const audio = getCtx();
        if (!audio) return;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = correct ? "triangle" : "sawtooth";
        const baseFreq = correct ? Math.min(280 + combo * 8, 650) : 130;
        osc.frequency.setValueAtTime(baseFreq, audio.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
          correct ? baseFreq * 1.4 : 70,
          audio.currentTime + 0.045
        );

        gain.gain.setValueAtTime(correct ? 0.09 : 0.14, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + 0.045
        );

        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.05);
      } catch {
        // Abaikan jika browser memblokir audio sebelum interaksi
      }
    },
    playBeep: (final = false) => {
      try {
        const audio = getCtx();
        if (!audio) return;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(final ? 880 : 440, audio.currentTime);
        gain.gain.setValueAtTime(0.1, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + (final ? 0.25 : 0.1)
        );
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + (final ? 0.26 : 0.11));
      } catch { /* ignore */ }
    },
    playSwitch: () => {
      try {
        const audio = getCtx();
        if (!audio) return;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, audio.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.12, audio.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.currentTime + idx * 0.07 + 0.18
          );
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start(audio.currentTime + idx * 0.07);
          osc.stop(audio.currentTime + idx * 0.07 + 0.19);
        });
      } catch { /* ignore */ }
    },
  };
};

const sfx = createSoundEngine();

const generateWords = (count = 160) => {
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * WORD_POOL.length);
    result.push(WORD_POOL[idx]);
  }
  return result;
};

export default function TurboTypeBattle() {
  // Pengaturan Match
  const [mode, setMode] = useState("relay"); // "relay" (estafet) | "duel"
  const [durationOption, setDurationOption] = useState(30); // Duel: 30/60s | Estafet: total ronde (2 atau 3 ronde x 15s)
  const [p1Name, setP1Name] = useState("PLAYER 1");
  const [p2Name, setP2Name] = useState("PLAYER 2");
  const [soundOn, setSoundOn] = useState(true);

  // State Layar & Ronde
  // "lobby" | "playing" | "handoff" | "gameover"
  const [screen, setScreen] = useState("lobby");
  const [activePlayer, setActivePlayer] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const [handoffTimeLeft, setHandoffTimeLeft] = useState(5);

  // State Kata & Ketikan
  const [words, setWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [wordHistory, setWordHistory] = useState({}); // { [idx]: "correct" | "wrong" }

  // Statistik Pemain
  const [p1Stats, setP1Stats] = useState({
    correctChars: 0,
    totalTypedChars: 0,
    wordsDone: 0,
    combo: 0,
    maxCombo: 0,
    elapsedSeconds: 0,
  });
  const [p2Stats, setP2Stats] = useState({
    correctChars: 0,
    totalTypedChars: 0,
    wordsDone: 0,
    combo: 0,
    maxCombo: 0,
    elapsedSeconds: 0,
  });

  // Hall of Fame
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LEADERBOARD;
    } catch {
      return DEFAULT_LEADERBOARD;
    }
  });

  const hasRecordedRef = useRef(false);
  const inputRef = useRef(null);
  const activeWordRef = useRef(null);

  // Simpan Hall of Fame ke localStorage otomatis
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
    } catch {
      /* ignore */
    }
  }, [leaderboard]);

  // Auto-scroll kata aktif agar tetap berada di baris pertama kotak ketik
  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [wordIndex]);

  // Fokus otomatis ke input saat mulai bermain
  useEffect(() => {
    if (screen === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen, activePlayer]);

  // Kalkulasi WPM & Akurasi
  const calcMetrics = (stats) => {
    const mins = Math.max(stats.elapsedSeconds / 60, 1 / 60);
    const wpm =
      stats.elapsedSeconds > 0 ? Math.round(stats.correctChars / 5 / mins) : 0;
    const accuracy =
      stats.totalTypedChars > 0
        ? Math.round((stats.correctChars / stats.totalTypedChars) * 100)
        : 100;
    return { wpm, accuracy };
  };

  const p1Metrics = calcMetrics(p1Stats);
  const p2Metrics = calcMetrics(p2Stats);

  // Total ronde: Estafet = 2 atau 3 putaran (masing-masing 15 detik), Duel = 1 putaran penuh
  const totalRounds = mode === "relay" ? (durationOption === 60 ? 3 : 2) : 1;
  const turnLength = mode === "relay" ? 15 : durationOption;

  // Memulai Pertandingan Baru
  const startMatch = () => {
    const freshWords = generateWords(180);
    setWords(freshWords);
    setWordIndex(0);
    setCurrentInput("");
    setWordHistory({});
    setP1Stats({
      correctChars: 0,
      totalTypedChars: 0,
      wordsDone: 0,
      combo: 0,
      maxCombo: 0,
      elapsedSeconds: 0,
    });
    setP2Stats({
      correctChars: 0,
      totalTypedChars: 0,
      wordsDone: 0,
      combo: 0,
      maxCombo: 0,
      elapsedSeconds: 0,
    });
    setActivePlayer(1);
    setCurrentRound(1);
    setTurnTimeLeft(mode === "relay" ? 15 : durationOption);
    setHandoffTimeLeft(3); // Aba-aba 3 detik sebelum mulai
    setScreen("handoff");
    if (soundOn) sfx.playBeep(false);
  };

  const recordWinnerToHof = useCallback(
    (finalP1, finalP2) => {
      if (hasRecordedRef.current) return; // Cegah pencatatan ganda
      hasRecordedRef.current = true;

      const m1 = calcMetrics(finalP1);
      const m2 = calcMetrics(finalP2);
      const isP1Win =
        m1.wpm > m2.wpm || (m1.wpm === m2.wpm && m1.accuracy >= m2.accuracy);

      const winnerWpm = isP1Win ? m1.wpm : m2.wpm;
      const winnerAcc = isP1Win ? m1.accuracy : m2.accuracy;
      const winnerName =
        (isP1Win ? p1Name : p2Name).trim() ||
        (isP1Win ? "PLAYER 1" : "PLAYER 2");

      if (winnerWpm <= 0) return;

      setLeaderboard((prev) => {
        const updated = [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            name: winnerName.toUpperCase(),
            wpm: winnerWpm,
            accuracy: winnerAcc,
            mode: mode === "relay" ? "ESTAFET" : "DUEL",
          },
        ];
        return updated
          .sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)
          .slice(0, 5);
      });
    },
    [mode, p1Name, p2Name]
  );
  // Akhiri Giliran / Ronde
  const handleTurnEnd = useCallback(() => {
    if (soundOn) sfx.playSwitch();
    setCurrentInput("");

    if (activePlayer === 1) {
      // Lanjut ke giliran Player 2 di ronde yang sama
      setActivePlayer(2);
      setHandoffTimeLeft(5); // Jeda 5 detik untuk tukar posisi
      setScreen("handoff");
    } else {
      // Player 2 selesai. Cek apakah masih ada ronde berikutnya (mode estafet)
      if (currentRound < totalRounds) {
        setCurrentRound((r) => r + 1);
        setActivePlayer(1);
        setHandoffTimeLeft(5);
        setScreen("handoff");
      } else {
        // Pertandingan Selesai!
        setScreen("gameover");
        recordWinnerToHof(p1Stats, p2Stats);
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#ffa300", "#38bdf8", "#ffffff"],
        });
      }
    }
  }, [
    activePlayer,
    currentRound,
    totalRounds,
    soundOn,
    recordWinnerToHof,
    p1Stats,
    p2Stats,
  ]);

  // Ref agar interval timer tidak pernah reset saat mengetik cepat
  const handleTurnEndRef = useRef(handleTurnEnd);
  useEffect(() => {
    handleTurnEndRef.current = handleTurnEnd;
  });

  // Timer Utama Saat Bermain
  useEffect(() => {
    if (screen !== "playing") return;

    const interval = setInterval(() => {
      if (activePlayer === 1) {
        setP1Stats((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      } else {
        setP2Stats((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }

      setTurnTimeLeft((prev) => {
        if (prev <= 4 && prev > 1 && soundOn) {
          sfx.playBeep(false);
        }
        if (prev <= 1) {
          clearInterval(interval);
          handleTurnEndRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, activePlayer, soundOn]);

  // Lanjut dari layar transisi (handoff) ke giliran pemain berikutnya
  const resumeNextTurn = useCallback(() => {
    // Jika mode Duel, kasih kata baru yang fresh untuk P2 supaya adil & tidak hafal
    if (mode === "duel") {
      setWords(generateWords(180));
      setWordIndex(0);
      setWordHistory({});
    } else {
      // Mode Estafet: lanjut kata berikutnya
      setWordIndex((idx) => idx + 1);
    }
    setCurrentInput("");
    setTurnTimeLeft(turnLength);
    setScreen("playing");
    if (soundOn) sfx.playBeep(true);
  }, [mode, turnLength, soundOn]);

  // Timer Layar Handoff (Jeda Pergantian Pemain)
  useEffect(() => {
    if (screen !== "handoff") return;

    const timer = setInterval(() => {
      setHandoffTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          resumeNextTurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, resumeNextTurn]);

  // Shortcut Spasi / Enter saat di layar Handoff untuk langsung gas
  useEffect(() => {
    if (screen !== "handoff") return;
    const onKeyDown = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        resumeNextTurn();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, resumeNextTurn]);

  // Handler Input Ketikan
  const handleTyping = (e) => {
    if (screen !== "playing") return;
    const val = e.target.value;
    const targetWord = words[wordIndex] || "";

    // Jika pemain menekan SPASI -> evaluasi kata
    if (val.endsWith(" ")) {
      const trimmed = val.trim();
      if (!trimmed) return;

      const isCorrect = trimmed === targetWord;
      setWordHistory((prev) => ({
        ...prev,
        [wordIndex]: isCorrect ? "correct" : "wrong",
      }));

      const updateFn = (prev) => {
        const newCombo = isCorrect ? prev.combo + 1 : 0;
        return {
          ...prev,
          correctChars: isCorrect
            ? prev.correctChars + targetWord.length + 1
            : prev.correctChars,
          totalTypedChars: prev.totalTypedChars + trimmed.length + 1,
          wordsDone: isCorrect ? prev.wordsDone + 1 : prev.wordsDone,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
        };
      };

      if (activePlayer === 1) setP1Stats(updateFn);
      else setP2Stats(updateFn);

      if (soundOn) {
        const currentCombo = activePlayer === 1 ? p1Stats.combo : p2Stats.combo;
        sfx.playKey(isCorrect, currentCombo);
      }

      setWordIndex((idx) => idx + 1);
      setCurrentInput("");
      return;
    }

    // Bunyi ketikan per huruf
    if (val.length > currentInput.length && soundOn) {
      const lastCharIdx = val.length - 1;
      const charMatch = val[lastCharIdx] === targetWord[lastCharIdx];
      const currentCombo = activePlayer === 1 ? p1Stats.combo : p2Stats.combo;
      sfx.playKey(charMatch, currentCombo);
    }

    setCurrentInput(val);
  };

  // Progres lintasan balap (target 250 karakter = 100%)
  const p1Progress = Math.min((p1Stats.correctChars / 250) * 100, 100);
  const p2Progress = Math.min((p2Stats.correctChars / 250) * 100, 100);

  return (
    <div className="h-dvh w-full bg-track-grid text-white flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden">
      {/* TOP BAR: BRANDING & STATUS */}
      <header className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#ffa300] text-[#121212] px-2.5 py-1 font-black italic text-lg tracking-tighter skew-x-[-10deg]">
            TT // 02
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tight uppercase leading-none">
              TURBO<span className="text-[#ffa300]">TYPE</span>
            </h1>
            <p className="text-[11px] font-mono-code text-zinc-400 tracking-widest uppercase">
              2-PLAYER ARCADE SPRINT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {screen !== "lobby" && (
            <button
              onClick={() => setScreen("lobby")}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-zinc-800 border-2 border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ffa300]" />
              LOBBY
            </button>
          )}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="bg-[#1a1a1a] hover:bg-zinc-800 border-2 border-zinc-700 p-2 transition cursor-pointer"
            title={soundOn ? "Matikan Suara" : "Nyalakan Suara"}
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-[#ffa300]" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto my-2 overflow-hidden">
        {/* ==================== 1. LOBBY SCREEN ==================== */}
        {screen === "lobby" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* KIRI: SETUP PERTANDINGAN (7 KOLOM) */}
            <div className="lg:col-span-7 bg-[#1a1a1a] border-2 border-zinc-700 p-5 md:p-6 flex flex-col justify-between shadow-brutal-yellow">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-[#ffa300]/15 text-[#ffa300] border border-[#ffa300]/40 px-2.5 py-0.5 text-xs font-mono-code font-bold uppercase">
                    SETUP PERTANDINGAN
                  </span>
                  <span className="text-xs font-mono-code text-zinc-400">
                    1 KEYBOARD • 2 PEMAIN
                  </span>
                </div>

                {/* Input Nama Pemain */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#ffa300] mb-1.5">
                      PEMAIN 01 (KUNING)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={p1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                      className="w-full bg-[#121212] border-2 border-zinc-700 focus:border-[#ffa300] px-3 py-2 font-bold uppercase text-sm outline-none transition"
                      placeholder="NAMA P1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#38bdf8] mb-1.5">
                      PEMAIN 02 (BIRU)
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={p2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                      className="w-full bg-[#121212] border-2 border-zinc-700 focus:border-[#38bdf8] px-3 py-2 font-bold uppercase text-sm outline-none transition"
                      placeholder="NAMA P2"
                    />
                  </div>
                </div>

                {/* Pilihan Mode */}
                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    PILIH FORMAT BALAPAN
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("relay")}
                      className={`p-3.5 text-left border-2 transition cursor-pointer ${
                        mode === "relay"
                          ? "bg-[#ffa300] text-[#121212] border-[#ffa300] font-bold"
                          : "bg-[#121212] text-white border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="font-black italic text-base uppercase">
                        ESTAFET CEPAT
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          mode === "relay"
                            ? "text-[#121212]/80 font-medium"
                            : "text-zinc-400"
                        }`}
                      >
                        Bergantian 3x15 detik
                      </div>
                    </button>

                    <button
                      onClick={() => setMode("duel")}
                      className={`p-3.5 text-left border-2 transition cursor-pointer ${
                        mode === "duel"
                          ? "bg-[#ffa300] text-[#121212] border-[#ffa300] font-bold"
                          : "bg-[#121212] text-white border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      <div className="font-black italic text-base uppercase">
                        DUEL PENUH
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          mode === "duel"
                            ? "text-[#121212]/80 font-medium"
                            : "text-zinc-400"
                        }`}
                      >
                        1x Putaran 
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pilihan Durasi / Ronde */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {mode === "relay"
                      ? "JUMLAH PUTARAN ESTAFET"
                      : "DURASI PER PEMAIN"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDurationOption(30)}
                      className={`py-2 px-3 border-2 font-mono-code text-xs font-bold uppercase cursor-pointer transition ${
                        durationOption === 30
                          ? "border-white bg-white text-[#121212]"
                          : "border-zinc-700 bg-[#121212] text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {mode === "relay"
                        ? "2 RONDE (2 x 15 DETIK)"
                        : "30 DETIK SPRINT"}
                    </button>
                    <button
                      onClick={() => setDurationOption(60)}
                      className={`py-2 px-3 border-2 font-mono-code text-xs font-bold uppercase cursor-pointer transition ${
                        durationOption === 60
                          ? "border-white bg-white text-[#121212]"
                          : "border-zinc-700 bg-[#121212] text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {mode === "relay"
                        ? "3 RONDE (3 x 15 DETIK)"
                        : "60 DETIK MARATHON"}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={startMatch}
                className="w-full bg-[#ffa300] hover:bg-[#ffb733] active:translate-y-0.5 text-[#121212] font-black italic text-lg uppercase py-3.5 px-6 flex items-center justify-center gap-2 tracking-wider transition cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                MULAI BALAPAN SEKARANG
              </button>
            </div>

            {/* KANAN: HALL OF FAME (5 KOLOM) */}
            <div className="lg:col-span-5 bg-[#1a1a1a] border-2 border-zinc-700 p-5 md:p-6 flex flex-col justify-between">
              <div className="w-full">
                {/* Header Kartu Hall of Fame */}
                <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#ffa300] shrink-0" />
                    <h2 className="font-black italic text-lg uppercase tracking-tight whitespace-nowrap">
                      HALL OF FAME
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
                      setLeaderboard([]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono-code text-zinc-500 hover:text-rose-400 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    RESET
                  </button>
                </div>

                {/* Isi Daftar Skor */}
                {!Array.isArray(leaderboard) || leaderboard.length === 0 ? (
                  <div className="w-full py-12 px-4 text-center border-2 border-dashed border-zinc-800 text-zinc-500 text-xs font-mono-code">
                    BELUM ADA REKOR TERCETAK.
                    <br />
                    JADILAH YANG PERTAMA!
                  </div>
                ) : (
                  <div className="w-full space-y-2.5">
                    {leaderboard.map((entry, idx) => (
                      <div
                        key={entry.id || idx}
                        className={`w-full flex items-center justify-between p-3 border-2 ${
                          idx === 0
                            ? "bg-[#ffa300]/10 border-[#ffa300]"
                            : "bg-[#121212] border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 flex items-center justify-center font-mono-code font-black text-xs shrink-0 ${
                              idx === 0
                                ? "bg-[#ffa300] text-[#121212]"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-sm uppercase leading-tight">
                              {entry.name}
                            </div>
                            <div className="text-[10px] font-mono-code text-zinc-400">
                              {entry.mode} • AKURASI {entry.accuracy}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono-code font-black text-lg text-[#ffa300]">
                            {entry.wpm}
                          </span>
                          <span className="text-[10px] font-mono-code text-zinc-400 ml-1">
                            WPM
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full mt-4 pt-3 border-t border-zinc-800 text-[11px] font-mono-code text-zinc-400 flex justify-between">
                <span>HARGA DIRI BRAY</span>
                <span className="text-[#ffa300]">LEADERBOARD {">"} ALL PRESTASI</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. PLAYING ARENA ==================== */}
        {screen === "playing" && (
          <div className="flex flex-col gap-4">
            {/* TELEMETRY TRACK (LINTASAN BALAP P1 VS P2) */}
            <div className="bg-[#1a1a1a] border-2 border-zinc-700 p-4">
              <div className="flex items-center justify-between text-xs font-mono-code mb-3">
                <span className="text-zinc-400 uppercase">
                  MODE:{" "}
                  <strong className="text-white">
                    {mode === "relay"
                      ? `ESTAFET RONDE ${currentRound}/${totalRounds}`
                      : "DUEL 1V1"}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5 font-black text-base text-[#ffa300]">
                  <Timer className="w-4 h-4" />
                  00:{String(turnTimeLeft).padStart(2, "0")}
                </span>
              </div>

              {/* Jalur P1 */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#ffa300] uppercase flex items-center gap-1.5">
                    {activePlayer === 1 && (
                      <span className="w-2 h-2 bg-[#ffa300] animate-ping" />
                    )}
                    {p1Name || "PLAYER 1"}
                  </span>
                  <span className="font-mono-code">
                    {p1Metrics.wpm} WPM • {p1Metrics.accuracy}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#121212] border border-zinc-700 relative overflow-hidden">
                  <div
                    className="h-full bg-[#ffa300] transition-all duration-300"
                    style={{ width: `${p1Progress}%` }}
                  />
                </div>
              </div>

              {/* Jalur P2 */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#38bdf8] uppercase flex items-center gap-1.5">
                    {activePlayer === 2 && (
                      <span className="w-2 h-2 bg-[#38bdf8] animate-ping" />
                    )}
                    {p2Name || "PLAYER 2"}
                  </span>
                  <span className="font-mono-code">
                    {p2Metrics.wpm} WPM • {p2Metrics.accuracy}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#121212] border border-zinc-700 relative overflow-hidden">
                  <div
                    className="h-full bg-[#38bdf8] transition-all duration-300"
                    style={{ width: `${p2Progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* BANNER GILIRAN AKTIF */}
            <div
              className={`px-4 py-2.5 border-2 flex items-center justify-between ${
                activePlayer === 1
                  ? "bg-[#ffa300] text-[#121212] border-[#ffa300]"
                  : "bg-[#38bdf8] text-[#121212] border-[#38bdf8]"
              }`}
            >
              <div className="flex items-center gap-2 font-black italic uppercase tracking-wide text-sm md:text-base">
                <Keyboard className="w-5 h-5" />
                GILIRAN:{" "}
                {activePlayer === 1
                  ? p1Name || "PLAYER 1"
                  : p2Name || "PLAYER 2"}
              </div>
              <div className="flex items-center gap-1.5 font-mono-code font-black text-xs md:text-sm">
                <Flame className="w-4 h-4 fill-current" />
                STREAK: {activePlayer === 1 ? p1Stats.combo : p2Stats.combo}x
              </div>
            </div>

            {/* KOTAK KATA (WORD DISPLAY BOX) */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="bg-[#1a1a1a] border-2 border-zinc-700 p-5 h-36 overflow-hidden relative cursor-text"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2.5 font-mono-code text-xl md:text-2xl leading-relaxed">
                {words.slice(0, wordIndex + 45).map((word, idx) => {
                  const isCurrent = idx === wordIndex;
                  const status = wordHistory[idx];

                  if (isCurrent) {
                    return (
                      <span
                        key={idx}
                        ref={activeWordRef}
                        className="bg-zinc-800 px-1.5 py-0.5 border-b-2 border-[#ffa300]"
                      >
                        {word.split("").map((char, cIdx) => {
                          let charColor = "text-zinc-300";
                          if (cIdx < currentInput.length) {
                            charColor =
                              currentInput[cIdx] === char
                                ? "text-[#ffa300]"
                                : "text-rose-500 underline";
                          }
                          return (
                            <span key={cIdx} className={charColor}>
                              {char}
                            </span>
                          );
                        })}
                        {/* Karakter berlebih jika salah ketik kepanjangan */}
                        {currentInput.length > word.length && (
                          <span className="text-rose-500 underline">
                            {currentInput.slice(word.length)}
                          </span>
                        )}
                      </span>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      className={
                        status === "correct"
                          ? "text-emerald-400/70"
                          : status === "wrong"
                          ? "text-rose-500/70 line-through"
                          : "text-zinc-500"
                      }
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* INPUT FIELD AKTIF */}
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={handleTyping}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Ketik kata di atas lalu tekan SPASI..."
              className={`w-full bg-[#121212] border-2 px-4 py-3.5 font-mono-code text-xl font-bold outline-none transition ${
                activePlayer === 1
                  ? "border-[#ffa300] text-[#ffa300] shadow-brutal-p1"
                  : "border-[#38bdf8] text-[#38bdf8] shadow-brutal-p2"
              }`}
            />
          </div>
        )}

        {/* ==================== 3. HANDOFF (TUKAR PEMAIN) ==================== */}
        {screen === "handoff" && (
          <div className="max-w-xl mx-auto w-full bg-[#1a1a1a] border-2 border-white p-8 text-center shadow-brutal-yellow">
            <div className="inline-block bg-[#ffa300] text-[#121212] font-mono-code font-black text-xs px-3 py-1 uppercase mb-4">
              PIT STOP • PERGANTIAN PEMAIN
            </div>

            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-2">
              SIAP-SIAP,{" "}
              <span
                className={
                  activePlayer === 1 ? "text-[#ffa300]" : "text-[#38bdf8]"
                }
              >
                {activePlayer === 1
                  ? p1Name || "PLAYER 1"
                  : p2Name || "PLAYER 2"}
              </span>
              !
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Posisikan jari di keyboard. Giliranmu dimulai otomatis dalam:
            </p>

            <div className="text-6xl font-mono-code font-black text-white mb-6">
              {handoffTimeLeft}
            </div>

            <button
              onClick={resumeNextTurn}
              className="w-full bg-white hover:bg-zinc-200 text-[#121212] font-black italic uppercase py-3.5 px-6 flex items-center justify-center gap-2 tracking-wider transition cursor-pointer"
            >
              LANGSUNG MULAI (ATAU TEKAN SPASI)
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ==================== 4. GAMEOVER / PODIUM ==================== */}
        {screen === "gameover" && (
          <div className="max-w-3xl mx-auto w-full bg-[#1a1a1a] border-2 border-[#ffa300] p-6 md:p-8 shadow-brutal-yellow">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-[#ffa300] text-[#121212] px-3 py-1 font-mono-code font-black text-xs uppercase mb-3">
                <Flag className="w-4 h-4" />
                GARIS FINIS • HASIL AKHIR
              </div>

              {p1Metrics.wpm === p2Metrics.wpm &&
              p1Metrics.accuracy === p2Metrics.accuracy ? (
                <h2 className="text-3xl md:text-5xl font-black italic uppercase">
                  PERTANDINGAN SERI!
                </h2>
              ) : (
                <h2 className="text-3xl md:text-5xl font-black italic uppercase">
                  <span className="text-[#ffa300]">
                    {p1Metrics.wpm > p2Metrics.wpm ||
                    (p1Metrics.wpm === p2Metrics.wpm &&
                      p1Metrics.accuracy > p2Metrics.accuracy)
                      ? p1Name || "PLAYER 1"
                      : p2Name || "PLAYER 2"}
                  </span>{" "}
                  MENANG!
                </h2>
              )}
            </div>

            {/* Perbandingan Kartu Skor P1 vs P2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Kartu P1 */}
              <div
                className={`p-5 border-2 bg-[#121212] ${
                  p1Metrics.wpm >= p2Metrics.wpm
                    ? "border-[#ffa300]"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black italic text-lg uppercase text-[#ffa300]">
                    {p1Name || "PLAYER 1"}
                  </span>
                  {p1Metrics.wpm >= p2Metrics.wpm && (
                    <Crown className="w-5 h-5 text-[#ffa300]" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono-code">
                  <div>
                    <div className="text-[10px] text-zinc-400">KECEPATAN</div>
                    <div className="text-2xl font-black text-white">
                      {p1Metrics.wpm}{" "}
                      <span className="text-xs font-normal">WPM</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">AKURASI</div>
                    <div className="text-2xl font-black text-white">
                      {p1Metrics.accuracy}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">MAX STREAK</div>
                    <div className="text-2xl font-black text-white">
                      {p1Stats.maxCombo}x
                    </div>
                  </div>
                </div>
              </div>

              {/* Kartu P2 */}
              <div
                className={`p-5 border-2 bg-[#121212] ${
                  p2Metrics.wpm > p1Metrics.wpm
                    ? "border-[#38bdf8]"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black italic text-lg uppercase text-[#38bdf8]">
                    {p2Name || "PLAYER 2"}
                  </span>
                  {p2Metrics.wpm > p1Metrics.wpm && (
                    <Crown className="w-5 h-5 text-[#38bdf8]" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono-code">
                  <div>
                    <div className="text-[10px] text-zinc-400">KECEPATAN</div>
                    <div className="text-2xl font-black text-white">
                      {p2Metrics.wpm}{" "}
                      <span className="text-xs font-normal">WPM</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">AKURASI</div>
                    <div className="text-2xl font-black text-white">
                      {p2Metrics.accuracy}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">MAX STREAK</div>
                    <div className="text-2xl font-black text-white">
                      {p2Stats.maxCombo}x
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startMatch}
                className="bg-[#ffa300] hover:bg-[#ffb733] text-[#121212] font-black italic uppercase py-3.5 px-4 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                REMATCH LAGI
              </button>
              <button
                onClick={() => setScreen("lobby")}
                className="bg-[#121212] hover:bg-zinc-800 border-2 border-zinc-700 text-white font-black italic uppercase py-3.5 px-4 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#ffa300]" />
                CEK HALL OF FAME
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER MINIMAL */}
      <footer className="text-center text-[11px] font-mono-code text-zinc-500 pt-2 shrink-0">
        F11 FULLSCREEN RECOMMENDED • TURBOTYPE EXPO BUILD
      </footer>
    </div>
  );
}
