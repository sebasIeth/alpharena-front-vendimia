"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import RpsBoard from "@/components/game/RpsBoard";
import { RpsThrowIcon, THROW_LABELS } from "@/components/game/RpsBoard";
import type { RpsRound } from "@/components/game/RpsBoard";

/* ── Game Logic ── */
type Throw = "rock" | "paper" | "scissors";
const THROWS: Throw[] = ["rock", "paper", "scissors"];

function determineWinner(a: Throw, b: Throw): "a" | "b" | "draw" {
  if (a === b) return "draw";
  if ((a === "rock" && b === "scissors") || (a === "paper" && b === "rock") || (a === "scissors" && b === "paper")) return "a";
  return "b";
}

const AI_NAMES = ["Blaze", "Cobra", "Echo", "Frost", "Ghost", "Hawk", "Nova", "Phoenix", "Shadow", "Titan"];
const AI_DELAY_MIN = 1000;
const AI_DELAY_MAX = 3000;
const REVEAL_DURATION = 1500;
const ROUND_PAUSE = 2000;
const BEST_OF = 3;
const WINS_NEEDED = Math.ceil(BEST_OF / 2); // 2 wins to win best of 3

/* ── Main Page ── */
export default function RpsDemoPage() {
  const [gamePhase, setGamePhase] = useState<"lobby" | "playing" | "game_over">("lobby");
  const [rounds, setRounds] = useState<RpsRound[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [boardPhase, setBoardPhase] = useState<"waiting" | "thinking" | "revealing" | "round_complete" | "game_over">("waiting");
  const [opponentName, setOpponentName] = useState("Cobra");
  useEffect(() => { setOpponentName(AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]); }, []);
  const [replayStep, setReplayStep] = useState(-1);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);
  const currentRoundRef = useRef(1);

  // Cleanup timers
  useEffect(() => () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || isLiveMode) return;
    autoPlayRef.current = setTimeout(() => {
      setReplayStep((prev) => {
        if (prev >= rounds.length - 1) { setIsAutoPlaying(false); return prev; }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); };
  }, [isAutoPlaying, replayStep, isLiveMode, rounds.length, playbackSpeed]);

  const startGame = useCallback(() => {
    setRounds([]);
    setCurrentRound(1);
    setScoreA(0);
    setScoreB(0);
    scoreARef.current = 0;
    scoreBRef.current = 0;
    currentRoundRef.current = 1;
    setBoardPhase("thinking");
    setGamePhase("playing");
    setReplayStep(-1);
    setIsLiveMode(true);
  }, []);

  const handleHumanMove = useCallback((choice: Throw) => {
    // Prevent double-clicks during transitions
    setBoardPhase("waiting");

    const delay = AI_DELAY_MIN + Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN);
    aiTimerRef.current = setTimeout(() => {
      const botChoice = THROWS[Math.floor(Math.random() * 3)];
      const winner = determineWinner(choice, botChoice);
      const round = currentRoundRef.current;
      const newRound: RpsRound = {
        roundNumber: round,
        throwA: choice,
        throwB: botChoice,
        winner,
        thinkingTimeMs: Math.round(delay),
      };

      setBoardPhase("revealing");

      setTimeout(() => {
        const newScoreA = scoreARef.current + (winner === "a" ? 1 : 0);
        const newScoreB = scoreBRef.current + (winner === "b" ? 1 : 0);
        scoreARef.current = newScoreA;
        scoreBRef.current = newScoreB;
        setScoreA(newScoreA);
        setScoreB(newScoreB);
        setRounds((prev) => [...prev, newRound]);

        // Game ends ONLY when someone reaches WINS_NEEDED (no max round limit for draws)
        const gameOver = newScoreA >= WINS_NEEDED || newScoreB >= WINS_NEEDED;

        if (gameOver) {
          setBoardPhase("game_over");
          setGamePhase("game_over");
        } else {
          setBoardPhase("round_complete");
          setTimeout(() => {
            const nextRound = currentRoundRef.current + 1;
            currentRoundRef.current = nextRound;
            setCurrentRound(nextRound);
            setBoardPhase("thinking");
          }, ROUND_PAUSE);
        }
      }, REVEAL_DURATION);
    }, delay);
  }, []);

  const displayRound = !isLiveMode && replayStep >= 0 ? replayStep : null;
  const displayScoreA = displayRound != null ? rounds.slice(0, replayStep + 1).filter(r => r.winner === "a").length : scoreA;
  const displayScoreB = displayRound != null ? rounds.slice(0, replayStep + 1).filter(r => r.winner === "b").length : scoreB;
  const displayPhase = displayRound != null ? "round_complete" : boardPhase;

  /* ── LOBBY ── */
  if (gamePhase === "lobby") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-display font-bold text-arena-text mb-2">Rock Paper Scissors</h1>
        <p className="text-sm text-arena-muted mb-8">Practice against a local AI bot. No stakes, no connection needed.</p>
        <div className="dash-glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-arena-muted font-mono uppercase tracking-widest">Format</span>
            <span className="text-sm font-bold text-arena-text font-mono">Best of {BEST_OF}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-arena-muted font-mono uppercase tracking-widest">Opponent</span>
            <span className="text-sm font-bold text-arena-text">{opponentName} (AI)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-arena-muted font-mono uppercase tracking-widest">Mode</span>
            <span className="text-xs font-mono text-arena-primary">Practice vs AI</span>
          </div>
        </div>
        <button
          onClick={startGame}
          className="w-full px-6 py-4 rounded-xl bg-arena-primary text-white font-display font-semibold text-sm hover:bg-arena-primary/90 transition-all active:scale-[0.98]"
        >
          Start Match
        </button>
        <p className="text-[10px] text-arena-muted mt-3 font-mono">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-arena-primary/10 text-arena-primary rounded-full text-[9px] font-semibold">TEST MODE</span>
          {" "}No real stakes. Client-side only.
        </p>
      </div>
    );
  }

  /* ── GAME OVER ── */
  if (gamePhase === "game_over" && isLiveMode) {
    const humanWon = scoreA > scoreB;
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="dash-glass-card rounded-2xl p-8 text-center mb-6">
          <div className={`text-5xl mb-4 ${humanWon ? "text-arena-success" : "text-arena-danger"}`}>
            {humanWon ? "Victory!" : "Defeat"}
          </div>
          <p className="text-sm text-arena-muted mb-2">
            {humanWon ? `You defeated ${opponentName}!` : `${opponentName} wins the match.`}
          </p>
          <p className="text-2xl font-extrabold font-mono text-arena-text mb-6">{scoreA} — {scoreB}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={startGame} className="px-6 py-3 rounded-xl bg-arena-primary text-white font-semibold text-sm hover:bg-arena-primary/90 transition-all">
              Play Again
            </button>
            <button onClick={() => { setGamePhase("lobby"); setRounds([]); }} className="px-6 py-3 rounded-xl border border-arena-border-light text-arena-text font-semibold text-sm hover:bg-arena-bg transition-all">
              Back to Lobby
            </button>
          </div>
        </div>

        {/* Review rounds */}
        <div className="dash-glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-arena-text mb-3">Round History</h3>
          <RoundHistory rounds={rounds} playerAName="You" playerBName={opponentName} activeRound={-1} onClickRound={() => {}} />
        </div>
      </div>
    );
  }

  /* ── PLAYING / REPLAY ── */
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* TEST MODE badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-arena-primary/10 text-arena-primary rounded-full text-[9px] font-semibold font-mono">TEST MODE</span>
        <span className="text-xs text-arena-muted">Practice vs AI — no real stakes</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Board Area */}
        <div className="lg:col-span-2">
          <div className="dash-glass-card rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-arena-text">Board</h3>
              <div className="flex items-center gap-2">
                {boardPhase === "thinking" && isLiveMode && (
                  <span className="flex items-center gap-1.5 text-[10px] text-arena-success font-semibold uppercase tracking-wider">
                    <span className="relative w-2 h-2">
                      <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                      <span className="relative block w-2 h-2 bg-arena-success rounded-full" />
                    </span>
                    LIVE
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  gamePhase === "game_over" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                }`}>
                  {gamePhase === "game_over" ? "Completed" : "In Progress"}
                </span>
              </div>
            </div>

            <RpsBoard
              rounds={rounds}
              currentRound={currentRound}
              totalRounds={BEST_OF}
              scoreA={displayScoreA}
              scoreB={displayScoreB}
              playerAName="You"
              playerBName={opponentName}
              phase={displayPhase}
              isMyTurn={boardPhase === "thinking" && isLiveMode}
              mySide="a"
              onMove={handleHumanMove}
              winnerName={gamePhase === "game_over" ? (scoreA > scoreB ? "You" : opponentName) : null}
              winReason={gamePhase === "game_over" ? `Best of ${BEST_OF} Completed` : null}
              replayRound={displayRound != null && rounds[replayStep] ? rounds[replayStep].roundNumber : null}
            />

            {/* Playback controls */}
            {rounds.length > 0 && (
              <div className="mt-4 dash-glass-card rounded-xl p-4 space-y-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, rounds.length - 1)}
                  value={isLiveMode ? Math.max(0, rounds.length - 1) : (replayStep >= 0 ? replayStep : Math.max(0, rounds.length - 1))}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (v >= rounds.length - 1) { setIsLiveMode(true); setReplayStep(-1); }
                    else { setIsLiveMode(false); setReplayStep(v); setIsAutoPlaying(false); }
                  }}
                  className="w-full h-1.5 bg-arena-border/40 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setIsLiveMode(false); setReplayStep(0); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center text-sm">⏮</button>
                    <button onClick={() => { setIsLiveMode(false); setReplayStep(Math.max(0, (replayStep >= 0 ? replayStep : rounds.length - 1) - 1)); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center text-sm">◀</button>
                    <button onClick={() => { if (!isLiveMode) setIsAutoPlaying(!isAutoPlaying); }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border shadow-sm bg-white hover:bg-arena-primary/10 text-arena-primary/70 border-arena-border-light/40">
                      {isAutoPlaying ? "⏸" : "▶"}
                    </button>
                    <button onClick={() => { setIsLiveMode(false); setReplayStep(Math.min(rounds.length - 1, (replayStep >= 0 ? replayStep : 0) + 1)); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center text-sm">▶</button>
                    <button onClick={() => { setIsLiveMode(true); setReplayStep(-1); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center text-sm">⏭</button>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-arena-text text-xs font-mono font-semibold">
                      Round {(isLiveMode ? rounds.length : replayStep + 1)} / {rounds.length}
                    </div>
                  </div>
                  {!isLiveMode && (
                    <button onClick={() => { setIsLiveMode(true); setReplayStep(-1); setIsAutoPlaying(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </button>
                  )}
                  <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                    className="bg-white text-arena-primary/70 text-[10px] font-mono font-semibold rounded-lg px-2.5 py-1.5 border border-arena-border-light/40 shadow-sm cursor-pointer">
                    <option value={1600}>0.5x</option>
                    <option value={800}>1x</option>
                    <option value={400}>2x</option>
                  </select>
                </div>
              </div>
            )}

            {/* Match info grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Round</div>
                <div className="text-arena-text font-medium">{currentRound}</div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Score</div>
                <div className="text-arena-primary font-medium">{scoreA} — {scoreB}</div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Mode</div>
                <div className="text-arena-primary font-medium text-xs">Practice vs AI</div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Format</div>
                <div className="text-arena-text font-medium">First to {WINS_NEEDED}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Players */}
          <div className="dash-glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Players</h3>
            <div className="space-y-3">
              <div className={`flex items-center justify-between bg-arena-bg rounded-lg p-3 transition-all ${
                boardPhase === "thinking" && isLiveMode ? "ring-1 ring-arena-primary/50" : ""
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />
                  <div>
                    <div className="text-sm font-medium text-arena-text">You</div>
                    <div className="text-xs text-arena-muted">Human</div>
                  </div>
                </div>
                <div className="text-right">
                  {boardPhase === "thinking" && isLiveMode && !rounds.find(r => r.roundNumber === currentRound) ? (
                    <span className="text-xs text-arena-primary animate-pulse">Your turn</span>
                  ) : (
                    <span className="text-sm text-arena-primary font-medium">{scoreA} W</span>
                  )}
                </div>
              </div>
              <div className={`flex items-center justify-between bg-arena-bg rounded-lg p-3 transition-all ${
                boardPhase === "thinking" && isLiveMode ? "ring-1 ring-arena-primary/50" : ""
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3B82F6" }} />
                  <div>
                    <div className="text-sm font-medium text-arena-text">{opponentName}</div>
                    <div className="text-xs text-arena-muted">AI Bot</div>
                  </div>
                </div>
                <div className="text-right">
                  {boardPhase === "thinking" && isLiveMode ? (
                    <span className="text-xs text-arena-primary animate-pulse">Thinking...</span>
                  ) : (
                    <span className="text-sm text-arena-primary font-medium">{scoreB} W</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Round History */}
          <div className="dash-glass-card rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold text-arena-text mb-3 shrink-0">Round History</h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[420px]">
              {rounds.length === 0 ? (
                <div className="text-center text-sm text-arena-muted py-4">No rounds yet</div>
              ) : (
                <RoundHistory
                  rounds={isLiveMode ? rounds : rounds.slice(0, (replayStep >= 0 ? replayStep + 1 : rounds.length))}
                  playerAName="You"
                  playerBName={opponentName}
                  activeRound={isLiveMode ? -1 : replayStep}
                  onClickRound={(idx) => { setIsLiveMode(false); setReplayStep(idx); setIsAutoPlaying(false); }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Round History Component ── */
function RoundHistory({ rounds, playerAName, playerBName, activeRound, onClickRound }: {
  rounds: RpsRound[];
  playerAName: string;
  playerBName: string;
  activeRound: number;
  onClickRound: (idx: number) => void;
}) {
  return (
    <>
      {rounds.map((r, idx) => (
        <div
          key={r.roundNumber}
          onClick={() => onClickRound(idx)}
          className={`rounded-lg px-2.5 py-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeRound === idx ? "bg-arena-primary/15 ring-1 ring-arena-primary/30" : "bg-arena-bg hover:bg-arena-bg/80"
          }`}
        >
          <span className="text-arena-muted font-mono text-[10px] w-5 text-right shrink-0">#{r.roundNumber}</span>
          <span className="text-xs font-medium text-arena-text truncate max-w-[60px]">{playerAName}</span>
          {r.throwA && <span className="shrink-0 text-arena-text"><RpsThrowIcon type={r.throwA} size={16} /></span>}
          <span className="text-[10px] text-arena-muted">vs</span>
          {r.throwB && <span className="shrink-0 text-arena-text"><RpsThrowIcon type={r.throwB} size={16} /></span>}
          <span className="text-xs font-medium text-arena-text truncate max-w-[60px]">{playerBName}</span>
          <span className="text-arena-border-light/80 ml-auto">→</span>
          <span className={`text-xs font-bold shrink-0 ${
            r.winner === "a" ? "text-arena-primary" : r.winner === "b" ? "text-arena-primary" : "text-arena-muted"
          }`}>
            {r.winner === "a" ? playerAName : r.winner === "b" ? playerBName : "Draw"}
          </span>
          {r.thinkingTimeMs && (
            <span className="text-[10px] text-arena-muted/60 font-mono shrink-0">{(r.thinkingTimeMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      ))}
    </>
  );
}
