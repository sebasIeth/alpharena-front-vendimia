"use client";

import React, { useState, useEffect } from "react";

/* ── Types ── */
interface RpsRound {
  roundNumber: number;
  throwA?: "rock" | "paper" | "scissors";
  throwB?: "rock" | "paper" | "scissors";
  winner?: "a" | "b" | "draw" | null;
  thinkingTimeMs?: number;
}

interface RpsBoardProps {
  rounds: RpsRound[];
  currentRound: number;
  totalRounds: number;
  scoreA: number;
  scoreB: number;
  playerAName: string;
  playerBName: string;
  phase: "waiting" | "thinking" | "revealing" | "round_complete" | "game_over";
  isMyTurn?: boolean;
  mySide?: "a" | "b" | null;
  onMove?: (choice: "rock" | "paper" | "scissors") => void;
  winnerName?: string | null;
  winReason?: string | null;
  replayRound?: number | null;
}

/* ── SVG Icons (outline style, clean strokes) ── */
function RockIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  // Rock — irregular stone shape with cracks and texture
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Main rock shape — irregular polygon */}
      <path d="M12 42L8 32l4-10 8-8h18l10 6 6 10-2 12-8 8H20z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Cracks / texture lines */}
      <path d="M20 22l6 10-4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M38 16l-4 14 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M14 36l10-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Highlight facet */}
      <path d="M28 18l6 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function PaperIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  // Open hand — realistic palm with fingers and thumb
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Wrist */}
      <path d="M23 58c-1 0-2-1-2-2V50h14v6c0 1-1 2-2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Palm */}
      <path d="M15 50c-1-4-2-8-2-12 0-5 3-7 6-7h18c3 0 6 2 6 7 0 4-1 8-2 12z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Index finger */}
      <rect x="17" y="8" width="5" height="23" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <line x1="19.5" y1="18" x2="19.5" y2="18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      {/* Middle finger */}
      <rect x="24" y="5" width="5" height="26" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <line x1="26.5" y1="16" x2="26.5" y2="16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      {/* Ring finger */}
      <rect x="31" y="7" width="5" height="24" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <line x1="33.5" y1="17" x2="33.5" y2="17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      {/* Pinky */}
      <rect x="38" y="13" width="5" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <line x1="40.5" y1="21" x2="40.5" y2="21" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      {/* Thumb */}
      <path d="M15 38c-2-1-4-3-5-6-1-2 0-5 2-6 2-1 4 0 5 2l2 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScissorsIcon({ size = 48, className = "" }: { size?: number; className?: string }) {
  // Scissors ✂️ — open blades with finger holes
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      {/* Finger holes */}
      <ellipse cx="16" cy="52" rx="7" ry="6" stroke="currentColor" strokeWidth="2.5" />
      <ellipse cx="48" cy="52" rx="7" ry="6" stroke="currentColor" strokeWidth="2.5" />
      {/* Blades */}
      <path d="M20 47L46 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 47L18 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Pivot screw */}
      <circle cx="32" cy="28" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="28" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── Small inline icons for history ── */
function RpsThrowIcon({ type, size = 18 }: { type: string; size?: number }) {
  const cls = "text-current";
  if (type === "rock") return <RockIcon size={size} className={cls} />;
  if (type === "paper") return <PaperIcon size={size} className={cls} />;
  if (type === "scissors") return <ScissorsIcon size={size} className={cls} />;
  return null;
}

const THROW_LABELS: Record<string, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

/* ── Thinking Animation ── */
function ThinkingDisplay() {
  return (
    <div className="flex items-center gap-4">
      {(["rock", "paper", "scissors"] as const).map((t, i) => (
        <div key={t} className="animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
          <RpsThrowIcon type={t} size={40} />
        </div>
      ))}
    </div>
  );
}

/* ── Revealed Throw Display ── */
function ThrowDisplay({ throwType, isWinner, isDraw, size = 80 }: {
  throwType: string; isWinner: boolean; isDraw: boolean; size?: number;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${
      isWinner
        ? "scale-110 text-arena-primary drop-shadow-[0_0_16px_rgba(91,79,207,0.6)]"
        : isDraw
        ? "text-white/50"
        : "opacity-30 scale-90 text-white/30"
    }`}>
      <RpsThrowIcon type={throwType} size={size} />
      <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
        isWinner ? "text-arena-primary" : isDraw ? "text-white/40" : "text-white/20"
      }`}>
        {THROW_LABELS[throwType]}
      </span>
    </div>
  );
}

/* ── Main Board ── */
export default function RpsBoard({
  rounds, currentRound, totalRounds, scoreA, scoreB,
  playerAName, playerBName, phase,
  isMyTurn, mySide, onMove,
  winnerName, winReason, replayRound,
}: RpsBoardProps) {
  const [selectedChoice, setSelectedChoice] = useState<"rock" | "paper" | "scissors" | null>(null);

  const displayRoundNum = replayRound != null ? replayRound : currentRound;
  const displayRound = rounds.find((r) => r.roundNumber === displayRoundNum);
  const isReplay = replayRound != null;
  const showRevealed = isReplay || phase === "revealing" || phase === "round_complete" || phase === "game_over";
  const winsNeeded = Math.ceil(totalRounds / 2);
  const isGameOver = phase === "game_over" || scoreA >= winsNeeded || scoreB >= winsNeeded;

  useEffect(() => { setSelectedChoice(null); }, [currentRound]);

  const handleChoice = (choice: "rock" | "paper" | "scissors") => {
    if (selectedChoice || !isMyTurn || !onMove) return;
    setSelectedChoice(choice);
    onMove(choice);
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(180deg, #1e2d3d 0%, #1a2535 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs text-white/40 font-mono">Round {displayRoundNum} / {totalRounds}</span>
        <span className="text-xs text-white/40 font-mono">Best of {totalRounds}</span>
      </div>

      {/* Main area */}
      <div className="px-4 sm:px-8 py-8 relative">
        {/* Score */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center min-w-[80px]">
            <div className="text-[10px] text-white/40 font-mono truncate">{playerAName}</div>
            <div className={`text-4xl font-extrabold font-mono tabular-nums ${scoreA > scoreB ? "text-arena-primary" : "text-white/60"}`}>
              {scoreA}
            </div>
          </div>
          <div className="text-white/15 text-3xl font-light">—</div>
          <div className="text-center min-w-[80px]">
            <div className="text-[10px] text-white/40 font-mono truncate">{playerBName}</div>
            <div className={`text-4xl font-extrabold font-mono tabular-nums ${scoreB > scoreA ? "text-arena-primary" : "text-white/60"}`}>
              {scoreB}
            </div>
          </div>
        </div>

        {/* Player A throw */}
        <div className="flex justify-center mb-4 min-h-[100px] items-center">
          {showRevealed && displayRound?.throwA ? (
            <ThrowDisplay throwType={displayRound.throwA} isWinner={displayRound.winner === "a"} isDraw={displayRound.winner === "draw"} />
          ) : phase === "thinking" ? (
            <div className="text-white/20"><ThinkingDisplay /></div>
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              <span className="text-white/15 text-2xl font-mono">?</span>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="flex items-center justify-center gap-4 my-3">
          <div className="h-px flex-1 bg-white/8" />
          <span className={`text-[10px] font-extrabold tracking-[0.2em] px-4 py-1.5 rounded-full transition-all ${
            phase === "revealing" ? "bg-arena-primary/20 text-arena-primary" : "bg-white/5 text-white/25"
          }`}>VS</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* Player B throw */}
        <div className="flex justify-center mt-4 min-h-[100px] items-center">
          {showRevealed && displayRound?.throwB ? (
            <ThrowDisplay throwType={displayRound.throwB} isWinner={displayRound.winner === "b"} isDraw={displayRound.winner === "draw"} />
          ) : phase === "thinking" ? (
            <div className="text-white/20"><ThinkingDisplay /></div>
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              <span className="text-white/15 text-2xl font-mono">?</span>
            </div>
          )}
        </div>

        {/* Human choice buttons */}
        {isMyTurn && !isReplay && !isGameOver && (
          <div className="mt-8 flex justify-center gap-3 sm:gap-4">
            {(["rock", "paper", "scissors"] as const).map((choice) => {
              const isSelected = selectedChoice === choice;
              const isDisabled = selectedChoice !== null && !isSelected;
              return (
                <button
                  key={choice}
                  onClick={() => handleChoice(choice)}
                  disabled={isDisabled}
                  className={`flex flex-col items-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 transition-all min-w-[72px] ${
                    isSelected
                      ? "border-arena-primary bg-arena-primary/15 text-arena-primary scale-105"
                      : isDisabled
                      ? "border-white/5 text-white/10 cursor-not-allowed opacity-20"
                      : "border-white/10 text-white/50 hover:border-white/30 hover:text-white hover:bg-white/5 cursor-pointer active:scale-95"
                  }`}
                >
                  <RpsThrowIcon type={choice} size={36} />
                  <span className="text-[9px] font-mono font-semibold uppercase tracking-wider">{THROW_LABELS[choice]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Waiting */}
        {selectedChoice && phase === "thinking" && (
          <div className="text-center mt-4">
            <span className="text-[11px] text-white/30 font-mono animate-pulse">Waiting for opponent...</span>
          </div>
        )}

        {/* Game over overlay */}
        {isGameOver && !isReplay && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-2xl ring-1 ring-white/10 pointer-events-auto max-w-[80%]">
              <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest font-mono mb-1">Game Over</div>
              <div className="text-base sm:text-xl font-display font-bold text-amber-300 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
                </svg>
                {winnerName || (scoreA > scoreB ? playerAName : playerBName)}
              </div>
              <div className="text-[10px] sm:text-xs text-white/40 font-mono mt-1 capitalize">
                {winReason || `Best of ${totalRounds} Completed`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { RpsThrowIcon, THROW_LABELS };
export type { RpsRound, RpsBoardProps };
