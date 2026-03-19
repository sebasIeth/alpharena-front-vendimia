"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PokerCard, PokerLegalActions, SidePot } from "@/lib/types";
import type { ShowdownResult } from "@/lib/poker/engine";
import type { PlayerViewInfo } from "@/lib/poker/useLocalPoker";

/* ── Mobile detection hook ──────────────────────────── */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

/* ── Suit helpers ─────────────────────────────────── */
const SUIT_SYM: Record<string, string> = { hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660" };
const SUIT_CLR: Record<string, string> = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-gray-900", spades: "text-gray-900" };

/* ── Card components ──────────────────────────────── */
function CardFace({ card, size = "md", highlight = false }: { card: PokerCard; size?: "sm" | "md" | "lg" | "cc"; highlight?: boolean }) {
  // cc = community card: responsive sizes for mobile → tablet → desktop
  const dim = {
    sm: "w-9 h-[52px]",
    md: "w-[52px] h-[74px]",
    lg: "w-16 h-[92px]",
    cc: "w-[24px] h-[34px] sm:w-[40px] sm:h-[56px] md:w-[50px] md:h-[70px]",
  }[size] ?? "w-[52px] h-[74px]";
  const rankSz = {
    sm: "text-[8px]",
    md: "text-[11px]",
    lg: "text-sm",
    cc: "text-[5px] sm:text-[8px] md:text-[10px]",
  }[size] ?? "text-[11px]";
  const suitSz = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
    cc: "text-[8px] sm:text-xs md:text-base",
  }[size] ?? "text-xl";
  const clr = SUIT_CLR[card.suit] ?? "text-gray-900";

  return (
    <div className={`${dim} rounded-md bg-white shadow-lg select-none relative flex items-center justify-center ring-1 ring-black/5 ${highlight ? "poker-card-highlight" : ""}`}>
      <div className="absolute top-[2px] left-[3px] flex flex-col items-center leading-none">
        <span className={`${rankSz} font-bold ${clr}`}>{card.rank}</span>
        <span className={`${rankSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      </div>
      <span className={`${suitSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      <div className="absolute bottom-[2px] right-[3px] rotate-180 flex flex-col items-center leading-none">
        <span className={`${rankSz} font-bold ${clr}`}>{card.rank}</span>
        <span className={`${rankSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      </div>
    </div>
  );
}

function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "w-9 h-[52px]", md: "w-[52px] h-[74px]", lg: "w-16 h-[92px]" }[size];
  return (
    <div className={`${dim} rounded-lg shadow-lg select-none relative overflow-hidden ring-1 ring-white/10`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-800 via-red-900 to-red-950" />
      {/* Diamond lattice pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 5px)`,
      }} />
      {/* Inner border frame */}
      <div className="absolute inset-[3px] rounded-md border border-yellow-500/40" />
      <div className="absolute inset-[5px] rounded-sm border border-yellow-600/20" />
      {/* Center ornament */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[45%] h-[55%] rounded-sm border border-yellow-500/30 bg-gradient-to-br from-red-700/50 to-red-950/50 flex items-center justify-center backdrop-blur-[1px]">
          <div className="text-yellow-500/50 font-serif font-bold" style={{ fontSize: size === "sm" ? "8px" : size === "md" ? "12px" : "16px" }}>
            A
          </div>
        </div>
      </div>
      {/* Corner dots */}
      <div className="absolute top-[6px] left-[6px] w-1 h-1 rounded-full bg-yellow-500/30" />
      <div className="absolute top-[6px] right-[6px] w-1 h-1 rounded-full bg-yellow-500/30" />
      <div className="absolute bottom-[6px] left-[6px] w-1 h-1 rounded-full bg-yellow-500/30" />
      <div className="absolute bottom-[6px] right-[6px] w-1 h-1 rounded-full bg-yellow-500/30" />
      {/* Subtle shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
    </div>
  );
}

/* ── Badges ───────────────────────────────────────── */
function StreetBadge({ street }: { street: string }) {
  const { t } = useLanguage();
  const label: Record<string, string> = { preflop: t.poker.preflop, flop: t.poker.flop, turn: t.poker.turn, river: t.poker.river, showdown: t.poker.showdown };
  const cls: Record<string, string> = {
    preflop: "bg-blue-400/20 text-blue-300",
    flop: "bg-emerald-400/20 text-emerald-300",
    turn: "bg-amber-400/20 text-amber-300",
    river: "bg-red-400/20 text-red-300",
    showdown: "bg-purple-400/20 text-purple-300",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wide poker-action-pop ${cls[street] ?? "bg-white/10 text-white/60"}`}>
      {label[street] ?? street}
    </span>
  );
}

function DealerChip() {
  return (
    <span className="inline-flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 text-black text-[5px] sm:text-[8px] font-extrabold shadow-md ring-1 ring-yellow-500/50">
      D
    </span>
  );
}

/* ── Seat positioning (parametric ellipse) ────────── */
// Compute symmetric positions around an elliptical table.
// Seat 0 = bottom center (human). Others placed at equal angular intervals clockwise.
function getSeatsForPlayerCount(count: number) {
  const n = Math.max(2, Math.min(9, count));
  const rx = 42; // horizontal radius (% from center)
  const ry = 38; // vertical radius (% from center)
  const seats: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
    seats.push({
      x: Math.round(50 + rx * Math.cos(angle)),
      y: Math.round(50 + ry * Math.sin(angle)),
    });
  }
  return seats;
}

// Card size scales with player count and screen size
function getCardSize(playerCount: number, isMobile: boolean) {
  if (isMobile) {
    if (playerCount <= 2) return { w: 18, h: 26, text: "text-[7px]" as const, gap: 1, infoMin: 36 };
    if (playerCount <= 4) return { w: 15, h: 22, text: "text-[6px]" as const, gap: 1, infoMin: 32 };
    if (playerCount <= 6) return { w: 13, h: 19, text: "text-[5px]" as const, gap: 1, infoMin: 28 };
    return { w: 12, h: 17, text: "text-[5px]" as const, gap: 1, infoMin: 26 };
  }
  if (playerCount <= 2) return { w: 40, h: 56, text: "text-[11px]" as const, gap: 3, infoMin: 72 };
  if (playerCount <= 4) return { w: 36, h: 50, text: "text-[10px]" as const, gap: 2, infoMin: 64 };
  if (playerCount <= 6) return { w: 30, h: 42, text: "text-[9px]" as const, gap: 2, infoMin: 56 };
  return { w: 26, h: 36, text: "text-[8px]" as const, gap: 2, infoMin: 48 };
}

/* ── Props ────────────────────────────────────────── */
interface PokerBoardProps {
  communityCards: PokerCard[];
  pot: number;
  street: string;
  handNumber: number;
  players: PlayerViewInfo[];
  humanPlayerIndex: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  sidePots?: SidePot[];
  actionHistory?: { type: string; amount?: number; playerIndex: number; street: string }[];
  isMyTurn?: boolean;
  legalActions?: PokerLegalActions | null;
  onAction?: (action: { action: string; amount?: number }) => void;
  showdownResult?: ShowdownResult | null;
  matchResult?: { winnerName: string; reason?: string } | null;
  turnSecondsLeft?: number | null;
}

/* ── Last action display helpers ─────────────────── */
const ACTION_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  fold:    { label: "Fold",    color: "text-gray-300",  bg: "bg-gray-500/30" },
  check:   { label: "Check",   color: "text-green-300", bg: "bg-green-500/20" },
  call:    { label: "Call",    color: "text-blue-300",  bg: "bg-blue-500/20" },
  bet:     { label: "Bet",     color: "text-yellow-300", bg: "bg-yellow-500/20" },
  raise:   { label: "Raise",   color: "text-yellow-300", bg: "bg-yellow-500/20" },
  "all-in": { label: "ALL-IN", color: "text-red-300",   bg: "bg-red-500/25" },
  allin:   { label: "ALL-IN",  color: "text-red-300",   bg: "bg-red-500/25" },
  all_in:  { label: "ALL-IN",  color: "text-red-300",   bg: "bg-red-500/25" },
};

/* ── Action Bar ───────────────────────────────────── */
function ActionBar({
  legalActions,
  onAction,
}: {
  legalActions: PokerLegalActions;
  onAction: (a: { action: string; amount?: number }) => void;
}) {
  const { t } = useLanguage();
  const min = legalActions.minRaise ?? 0;
  const max = legalActions.maxRaise ?? min;
  const [raiseAmt, setRaiseAmt] = useState(min);

  const prevMinRef = useRef(min);
  useEffect(() => {
    if (min !== prevMinRef.current) {
      setRaiseAmt(min);
      prevMinRef.current = min;
    }
  }, [min]);

  const presets = max > min ? [
    { label: "Min", value: min },
    { label: "\u00BD", value: Math.round((min + max) / 4) },
    { label: "\u00BE", value: Math.round((min + max) * 3 / 8) },
    { label: "Max", value: max },
  ].filter((p, i, arr) => i === 0 || p.value !== arr[i - 1].value) : [];

  return (
    <div className="space-y-3 pt-3 poker-slide-up">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {legalActions.canFold && (
          <button onClick={() => onAction({ action: "fold" })} className="poker-chip-btn poker-chip-fold">
            {t.poker.fold}
          </button>
        )}
        {legalActions.canCheck && (
          <button onClick={() => onAction({ action: "check" })} className="poker-chip-btn poker-chip-check">
            {t.poker.check}
          </button>
        )}
        {legalActions.canCall && (
          <button onClick={() => onAction({ action: "call" })} className="poker-chip-btn poker-chip-call">
            {t.poker.call} {legalActions.callAmount}
          </button>
        )}
        {legalActions.canAllIn && (
          <button onClick={() => onAction({ action: "all_in" })} className="poker-chip-btn poker-chip-allin">
            ALL IN {legalActions.allInAmount}
          </button>
        )}
      </div>

      {legalActions.canRaise && min < max && (
        <div className="bg-black/30 rounded-2xl px-4 py-3 space-y-2 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-mono font-bold">{t.poker.raise}</span>
            <span className="text-sm font-extrabold text-amber-300 font-mono tabular-nums">{raiseAmt}</span>
          </div>
          <input type="range" min={min} max={max} value={raiseAmt} onChange={(e) => setRaiseAmt(Number(e.target.value))} className="poker-raise-track w-full" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {presets.map((p) => (
                <button key={p.label} onClick={() => setRaiseAmt(p.value)} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white/70 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => onAction({ action: "raise", amount: raiseAmt })} className="poker-chip-btn poker-chip-raise">
              {t.poker.raise} {raiseAmt}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Player Seat ──────────────────────────────────── */
function PlayerSeat({
  player,
  position,
  cardSize,
  isActive,
  showCards,
  isShowdown,
  isWinner,
  hideCards,
  forceCardBacks,
  turnSecondsLeft,
  lastAction,
}: {
  player: PlayerViewInfo;
  position: { x: number; y: number };
  cardSize: ReturnType<typeof getCardSize>;
  isActive: boolean;
  showCards: boolean;
  isShowdown: boolean;
  isWinner: boolean;
  hideCards?: boolean;
  forceCardBacks?: boolean;
  turnSecondsLeft?: number | null;
  lastAction?: { type: string; amount?: number } | null;
}) {
  const isTop = position.y < 45;

  const cardsEl = !hideCards ? (
    <div className="flex justify-center" style={{ gap: cardSize.gap }}>
      {showCards && player.holeCards && player.holeCards.length === 2
        ? player.holeCards.map((c, i) => {
            const clr = SUIT_CLR[c.suit] ?? "text-gray-900";
            return (
              <div
                key={i}
                style={{ width: cardSize.w, height: cardSize.h, animationDelay: `${i * 0.1}s` }}
                className="rounded-md bg-white shadow-md ring-1 ring-black/5 relative flex items-center justify-center select-none poker-flip-in poker-card-lift"
              >
                <div className="absolute top-[1px] left-[2px] leading-none">
                  <span className={`text-[7px] font-bold ${clr}`}>{c.rank}</span>
                </div>
                <span className={`text-sm ${clr}`}>{SUIT_SYM[c.suit]}</span>
              </div>
            );
          })
        : (forceCardBacks || (!player.hasFolded && !player.isEliminated))
        ? [0, 1].map(i => (
            <div
              key={i}
              style={{ width: cardSize.w, height: cardSize.h }}
              className="rounded-md shadow-md ring-1 ring-white/10 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-800 via-red-900 to-red-950" />
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)`,
              }} />
              <div className="absolute inset-[2px] rounded-sm border border-yellow-500/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[45%] h-[55%] rounded-sm border border-yellow-500/20 bg-red-800/40 flex items-center justify-center">
                  <span className="text-yellow-500/40 font-serif font-bold text-[6px] sm:text-[8px]">A</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            </div>
          ))
        : null}
    </div>
  ) : null;

  const infoEl = (
    <div
      className={`
        px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg backdrop-blur-sm text-center transition-all
        ${isShowdown && isWinner ? "bg-amber-400/15 poker-winner-glow ring-2 ring-amber-400/60" : ""}
        ${isActive && !isShowdown ? "bg-black/60 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] poker-seat-active" : ""}
        ${lastAction && !isActive && !(isShowdown && isWinner) ? "bg-black/55 ring-1 ring-yellow-400/30" : ""}
        ${!isActive && !lastAction && !(isShowdown && isWinner) ? "bg-black/50" : ""}
        ${player.hasFolded && !player.isEliminated ? "opacity-40" : ""}
        ${player.isEliminated && !forceCardBacks ? "opacity-20 grayscale" : ""}
        ${player.isEliminated && forceCardBacks ? "opacity-60" : ""}
      `}
      style={{ minWidth: cardSize.infoMin }}
    >
      <div className={`${cardSize.text} font-bold text-white truncate flex items-center justify-center gap-0.5 sm:gap-1`}
        style={{ maxWidth: cardSize.infoMin }}
      >
        <span className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${player.isAgent ? "bg-yellow-400" : "bg-green-400"}`} />
        <span className="truncate max-w-[52px] sm:max-w-[80px] md:max-w-[110px]">{player.name}{player.isAgent ? "(A)" : ""}</span>
        {player.isDealer && <DealerChip />}
        {player.isHuman && (
          <span className="hidden sm:inline-flex px-1 rounded text-[7px] bg-green-500/80 text-white font-bold uppercase">You</span>
        )}
      </div>
      <div className={`${cardSize.text} text-green-300 font-mono`}>{player.stack.toLocaleString()}</div>
      {lastAction && !isActive && (
        (() => {
          const rawType = lastAction.type;
          const actionKey = (typeof rawType === "string" ? rawType : (rawType as any)?.type || String(rawType)).toLowerCase();
          const display = ACTION_DISPLAY[actionKey] || { label: actionKey, color: "text-white/70", bg: "bg-white/10" };
          const amountStr = lastAction.amount ? ` ${lastAction.amount.toLocaleString()}` : "";
          return (
            <div className={`${display.bg} ${display.color} rounded-full px-1.5 py-0 text-[7px] sm:text-[9px] font-bold font-mono uppercase tracking-wide poker-action-pop`}>
              {display.label}{amountStr}
            </div>
          );
        })()
      )}
      {isActive && turnSecondsLeft != null && (
        <div className={`text-[8px] sm:text-[10px] font-mono font-bold tabular-nums ${
          turnSecondsLeft <= 5 ? "text-red-400 animate-pulse" : turnSecondsLeft <= 10 ? "text-amber-400" : "text-white/60"
        }`}>
          {turnSecondsLeft}s
        </div>
      )}
      {player.isAllIn && <div className="text-[7px] text-red-300 font-bold">ALL-IN</div>}
      {player.hasFolded && !player.isEliminated && <div className="text-[7px] text-white/40 uppercase">Fold</div>}
      {player.isEliminated && <div className="text-[7px] text-red-400 font-bold uppercase">Out</div>}
    </div>
  );

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {isTop ? (
        <>
          {infoEl}
          <div className="mt-0.5">{cardsEl}</div>
        </>
      ) : (
        <>
          <div className="mb-0.5">{cardsEl}</div>
          {infoEl}
        </>
      )}

      {player.currentBet > 0 && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30
          bg-black/50 backdrop-blur-sm rounded-full px-1 sm:px-2 py-0 sm:py-0.5
          text-[6px] sm:text-[9px] text-yellow-300 font-mono font-bold shadow-md
          ${isTop ? "-bottom-2 sm:-bottom-4" : "-top-2 sm:-top-4"}
        `}>
          {player.currentBet}
        </div>
      )}
    </div>
  );
}

/* ── Showdown Banner ─────────────────────────────── */
function ShowdownBanner({
  result,
  players,
  humanPlayerIndex,
}: {
  result: ShowdownResult;
  players: PlayerViewInfo[];
  humanPlayerIndex: number;
}) {
  const mainWinners = result.winners;
  const isHumanWin = mainWinners.some(w => w.playerIndex === humanPlayerIndex);
  const isSplit = mainWinners.length > 1;

  const winnerNames = mainWinners.map(w => players[w.playerIndex]?.name ?? "?").join(", ");
  const handName = mainWinners[0]?.handEval?.name ?? "";

  return (
    <div className={`rounded-xl px-4 py-3 text-center poker-slide-up ${
      isSplit
        ? "bg-amber-400/10 border border-amber-400/20"
        : isHumanWin
        ? "bg-emerald-400/10 border border-emerald-400/20"
        : "bg-red-400/10 border border-red-400/20"
    }`}>
      <div className={`text-lg font-display font-bold ${
        isSplit ? "text-amber-300" : isHumanWin ? "text-emerald-300" : "text-red-300"
      }`}>
        {isSplit ? `Split: ${winnerNames}` : `${winnerNames} wins!`}
      </div>
      <div className="text-sm text-white/70 font-medium mt-0.5">
        {handName}
      </div>
      {result.pots.length > 1 && (
        <div className="text-[10px] text-white/40 mt-1">
          {result.pots.map((p, i) => (
            <span key={i} className="mr-2">
              Pot {i + 1}: {p.amount} &rarr; {p.winnerIndices.map(idx => players[idx]?.name).join("/")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main PokerBoard ──────────────────────────────── */
export default function PokerBoard({
  communityCards,
  pot,
  street,
  handNumber,
  players,
  humanPlayerIndex,
  currentPlayerIndex,
  dealerIndex,
  sidePots,
  actionHistory,
  isMyTurn,
  legalActions,
  onAction,
  showdownResult,
  matchResult,
  turnSecondsLeft,
}: PokerBoardProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const isMatchOver = !!matchResult;
  const isShowdown = !!showdownResult;
  const winnerIndices = new Set(showdownResult?.winners.map(w => w.playerIndex) ?? []);

  const filled: (PokerCard | null)[] = [];
  for (let i = 0; i < 5; i++) filled.push(communityCards[i] ?? null);

  const seats = getSeatsForPlayerCount(players.length);
  const cardSize = getCardSize(players.length, isMobile);

  // Derive last action per player from actionHistory
  const lastActionByPlayer = React.useMemo(() => {
    const map: Record<number, { type: string; amount?: number }> = {};
    if (!actionHistory || actionHistory.length === 0) return map;
    const lastEntry = actionHistory[actionHistory.length - 1];
    if (lastEntry) {
      map[lastEntry.playerIndex] = { type: lastEntry.type, amount: lastEntry.amount };
    }
    return map;
  }, [actionHistory]);

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0f2818] to-[#0a1f12] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono">{t.poker.hand} #{handNumber}</span>
          <StreetBadge street={street} />
        </div>
        <span className="text-xs text-white/30 font-mono">{players.filter(p => !p.isEliminated).length} players</span>
      </div>

      {/* ── ZONE 1: Table ── */}
      <div className="px-3 sm:px-4">
        {/* 
          aspect-[5/3] gives the oval more height than 16/10 so players 
          on top/bottom have room. On larger screens we can go wider.
        */}
        <div className="relative w-full mx-auto aspect-[4/3] sm:aspect-[5/3] max-w-[700px]">

          {/* Outer rail */}
          <div
            className="absolute inset-0 rounded-[50%] shadow-2xl"
            style={{ background: "linear-gradient(180deg, #1a3a20 0%, #0f2815 100%)" }}
          />

          {/* Inner rail */}
          <div
            className="absolute inset-[3%] rounded-[50%] shadow-inner"
            style={{ background: "linear-gradient(180deg, #153218 0%, #0d2412 100%)" }}
          />

          {/* Felt */}
          <div
            className="absolute inset-[5%] rounded-[50%] shadow-inner"
            style={{ background: "radial-gradient(ellipse at center, #1e7a3f, #196b35, #0f4d25)" }}
          />

          {/* Betting line */}
          <div className="absolute inset-[20%] rounded-[50%] border border-white/[0.06]" />

          {/* ── Community cards + Pot ── */}
          {/* NO scale transform — fixed sizes, always centered */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10">
            <div className="flex items-center justify-center gap-1">
              {filled.map((c, i) =>
                c
                  ? <div key={`cc-${i}`} className={`poker-community-deal poker-card-lift poker-deal-delay-${i + 1}`}><CardFace card={c} size="cc" /></div>
                  : <div key={`empty-${i}`} className="w-[24px] h-[34px] sm:w-[40px] sm:h-[56px] md:w-[50px] md:h-[70px] rounded border border-dashed border-white/15 flex-shrink-0" />
              )}
            </div>
            <div className={`flex items-center gap-1 bg-black/40 rounded-full px-1.5 sm:px-2.5 py-0.5 transition-all duration-300 ${pot > 0 ? "poker-chip-toss" : ""}`}>
              <span className="text-[5px] sm:text-[8px] text-white/50 uppercase tracking-widest font-mono">{t.poker.pot}</span>
              <span className="text-[8px] sm:text-xs font-bold text-yellow-300 font-mono tabular-nums">{pot.toLocaleString()}</span>
            </div>
            {sidePots && sidePots.length > 1 && (
              <div className="flex gap-1.5 flex-wrap justify-center">
                {sidePots.map((sp, i) => (
                  <span key={i} className="text-[7px] text-white/30 font-mono bg-black/20 rounded-full px-1.5 py-0.5">
                    Pot {i + 1}: {sp.amount}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Match Over overlay ── */}
          {isMatchOver && matchResult && (
            <div className="absolute inset-[5%] rounded-[50%] z-30 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-2xl ring-1 ring-white/10 pointer-events-auto max-w-[80%] poker-action-pop">
                <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest font-mono mb-1">Game Over</div>
                <div className="text-base sm:text-xl font-display font-bold text-amber-300 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                    <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
                  </svg>
                  {matchResult.winnerName}
                </div>
                {matchResult.reason && (
                  <div className="text-[10px] sm:text-xs text-white/40 font-mono mt-1 capitalize">{matchResult.reason}</div>
                )}
              </div>
            </div>
          )}

          {/* ── Player seats ── */}
          {players.map((player, idx) => {
            const visualIndex = (idx - humanPlayerIndex + players.length) % players.length;
            const pos = seats[visualIndex % seats.length];
            const showCards = player.isHuman || (isShowdown && !player.hasFolded) || (player.holeCards != null && player.holeCards.length === 2);

            return (
              <PlayerSeat
                key={player.id}
                player={player}
                position={pos}
                cardSize={cardSize}
                isActive={idx === currentPlayerIndex && !isShowdown && !isMatchOver}
                showCards={showCards}
                isShowdown={isShowdown}
                isWinner={winnerIndices.has(idx)}
                hideCards={player.isHuman}
                forceCardBacks={isMatchOver}
                turnSecondsLeft={idx === currentPlayerIndex ? turnSecondsLeft : undefined}
                lastAction={!isMatchOver && !isShowdown ? lastActionByPlayer[idx] : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* ── ZONE 2 + 3: Your cards, showdown, actions, log ── */}
      {(() => {
        const humanPlayer = players[humanPlayerIndex];
        if (!humanPlayer) return null;
        const humanShowCards = !humanPlayer.hasFolded && !humanPlayer.isEliminated;
        const humanIsWinner = winnerIndices.has(humanPlayerIndex);

        return (
          <div className="flex flex-col gap-3 px-4 py-4">
            {/* Your hole cards — large and clear */}
            {humanShowCards && (
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {humanPlayer.holeCards && humanPlayer.holeCards.length === 2
                  ? humanPlayer.holeCards.map((c, i) => (
                      <div key={i} className="poker-deal-in poker-card-lift" style={{ animationDelay: `${i * 0.15}s` }}>
                        <CardFace card={c} size={isMobile ? "sm" : "md"} highlight={isShowdown && humanIsWinner} />
                      </div>
                    ))
                  : <><div className="poker-deal-in"><CardBack size={isMobile ? "sm" : "md"} /></div><div className="poker-deal-in poker-deal-delay-1"><CardBack size={isMobile ? "sm" : "md"} /></div></>
                }
              </div>
            )}

            {/* Showdown */}
            {isShowdown && showdownResult && (
              <ShowdownBanner result={showdownResult} players={players} humanPlayerIndex={humanPlayerIndex} />
            )}

            {/* Actions */}
            {isMyTurn && legalActions && onAction && (
              <div className="relative z-10">
                <ActionBar legalActions={legalActions} onAction={onAction} />
              </div>
            )}

            {/* Log */}
            {actionHistory && actionHistory.length > 0 && (
              <div className="space-y-0 sm:space-y-0.5 pt-1 sm:pt-2 border-t border-white/5">
                {actionHistory.slice(isMobile ? -3 : -6).map((a, i) => (
                  <div key={i} className="text-[8px] sm:text-[10px] font-mono flex items-center gap-1 sm:gap-1.5">
                    <span className={a.playerIndex === humanPlayerIndex ? "text-blue-300" : "text-red-300"}>
                      {players[a.playerIndex]?.name || `Player ${(a.playerIndex ?? 0) + 1}`}
                    </span>
                    <span className="text-white/70">
                      {a.type}{a.amount != null ? ` (${a.amount})` : ""}
                    </span>
                    <span className="text-white/20">{a.street}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
