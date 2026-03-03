"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PokerCard, PokerLegalActions } from "@/lib/types";
import type { ShowdownResult } from "@/lib/poker/engine";

/* ── Suit helpers ─────────────────────────────────── */
const SUIT_SYM: Record<string, string> = { hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660" };
const SUIT_CLR: Record<string, string> = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-gray-900", spades: "text-gray-900" };

/* ── Card components ──────────────────────────────── */
function CardFace({ card, size = "md", highlight = false }: { card: PokerCard; size?: "sm" | "md" | "lg"; highlight?: boolean }) {
  const dim = { sm: "w-11 h-[62px]", md: "w-[52px] h-[74px]", lg: "w-16 h-[92px]" }[size];
  const rankSz = { sm: "text-[9px]", md: "text-[11px]", lg: "text-sm" }[size];
  const suitSz = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];
  const clr = SUIT_CLR[card.suit] ?? "text-gray-900";

  return (
    <div className={`${dim} rounded-lg bg-white shadow-lg select-none relative flex items-center justify-center ring-1 ring-black/5 ${highlight ? "poker-card-highlight" : ""}`}>
      <div className="absolute top-[3px] left-[5px] flex flex-col items-center leading-none">
        <span className={`${rankSz} font-bold ${clr}`}>{card.rank}</span>
        <span className={`${rankSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      </div>
      <span className={`${suitSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      <div className="absolute bottom-[3px] right-[5px] rotate-180 flex flex-col items-center leading-none">
        <span className={`${rankSz} font-bold ${clr}`}>{card.rank}</span>
        <span className={`${rankSz} ${clr}`}>{SUIT_SYM[card.suit]}</span>
      </div>
    </div>
  );
}

function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "w-11 h-[62px]", md: "w-[52px] h-[74px]", lg: "w-16 h-[92px]" }[size];
  return (
    <div className={`${dim} rounded-lg bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-950 shadow-lg select-none flex items-center justify-center ring-1 ring-white/10`}>
      <div className="w-[60%] h-[65%] rounded-sm border border-indigo-400/20 bg-[repeating-conic-gradient(rgba(99,102,241,0.15)_0%_25%,transparent_0%_50%)] bg-[length:6px_6px]" />
    </div>
  );
}

function EmptySlot() {
  return <div className="w-[52px] h-[74px] rounded-lg border-2 border-dashed border-white/10" />;
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
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wide ${cls[street] ?? "bg-white/10 text-white/60"}`}>
      {label[street] ?? street}
    </span>
  );
}

function DealerChip() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-black text-[10px] font-extrabold shadow-md ring-2 ring-yellow-500/50">
      D
    </span>
  );
}

/* ── Props ────────────────────────────────────────── */
interface PokerBoardProps {
  communityCards: PokerCard[];
  pot: number;
  street: string;
  handNumber: number;
  playerA: {
    name: string;
    stack: number;
    currentBet: number;
    hasFolded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    holeCards?: PokerCard[];
  };
  playerB: {
    name: string;
    stack: number;
    currentBet: number;
    hasFolded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    holeCards?: PokerCard[];
  };
  actionHistory?: { type: string; amount?: number; playerSide: string; street: string }[];
  mySide?: "a" | "b" | null;
  isMyTurn?: boolean;
  legalActions?: PokerLegalActions | null;
  onAction?: (action: { action: string; amount?: number }) => void;
  showdownResult?: ShowdownResult | null;
}

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

  // Reset slider when min changes (new betting round)
  const prevMinRef = useRef(min);
  useEffect(() => {
    if (min !== prevMinRef.current) {
      setRaiseAmt(min);
      prevMinRef.current = min;
    }
  }, [min]);

  // Preset raise buttons (½ pot, ¾ pot, pot) for quick betting
  const presets = max > min ? [
    { label: "Min", value: min },
    { label: "½", value: Math.round((min + max) / 4) },
    { label: "¾", value: Math.round((min + max) * 3 / 8) },
    { label: "Max", value: max },
  ].filter((p, i, arr) => i === 0 || p.value !== arr[i - 1].value) : [];

  return (
    <div className="space-y-3 pt-3 poker-slide-up">
      {/* Main action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {legalActions.canFold && (
          <button
            onClick={() => onAction({ action: "fold" })}
            className="px-5 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95"
          >
            {t.poker.fold}
          </button>
        )}
        {legalActions.canCheck && (
          <button
            onClick={() => onAction({ action: "check" })}
            className="px-5 py-2.5 rounded-xl bg-blue-500/90 text-white text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {t.poker.check}
          </button>
        )}
        {legalActions.canCall && (
          <button
            onClick={() => onAction({ action: "call" })}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {t.poker.call} {legalActions.callAmount}
          </button>
        )}
        {legalActions.canAllIn && (
          <button
            onClick={() => onAction({ action: "all_in" })}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
          >
            ALL IN {legalActions.allInAmount}
          </button>
        )}
      </div>

      {/* Raise controls */}
      {legalActions.canRaise && min < max && (
        <div className="bg-black/20 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">{t.poker.raise}</span>
            <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">{raiseAmt}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={raiseAmt}
            onChange={(e) => setRaiseAmt(Number(e.target.value))}
            className="w-full accent-amber-400 h-2"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRaiseAmt(p.value)}
                  className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-[10px] font-mono hover:bg-white/10 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => onAction({ action: "raise", amount: raiseAmt })}
              className="px-5 py-2 rounded-xl bg-amber-500/90 text-white text-sm font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {t.poker.raise} {raiseAmt}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Showdown Banner ─────────────────────────────── */
function ShowdownBanner({ result, playerAName, playerBName, mySide }: {
  result: ShowdownResult;
  playerAName: string;
  playerBName: string;
  mySide: "a" | "b" | null;
}) {
  // Map internal winner index to player names
  // Player 0 = playerA (human), Player 1 = playerB (AI)
  const winnerName = result.winner === -1 ? "Split Pot"
    : result.winner === 0 ? playerAName
    : playerBName;

  const handName = result.winner === 0
    ? result.hand0.name
    : result.winner === 1
    ? result.hand1.name
    : result.hand0.name; // show the hand name for split (same rank)

  const isMyWin = (mySide === "a" && result.winner === 0) || (mySide === "b" && result.winner === 1);
  const isSplit = result.winner === -1;

  return (
    <div className={`rounded-xl px-4 py-3 text-center poker-slide-up ${
      isSplit
        ? "bg-amber-400/10 border border-amber-400/20"
        : isMyWin
        ? "bg-emerald-400/10 border border-emerald-400/20"
        : "bg-red-400/10 border border-red-400/20"
    }`}>
      <div className={`text-lg font-display font-bold ${
        isSplit ? "text-amber-300" : isMyWin ? "text-emerald-300" : "text-red-300"
      }`}>
        {isSplit ? "Split Pot!" : `${winnerName} wins!`}
      </div>
      <div className="text-sm text-white/70 font-medium mt-0.5">
        {handName}
      </div>
    </div>
  );
}

/* ── Main PokerBoard ──────────────────────────────── */
export default function PokerBoard({
  communityCards,
  pot,
  street,
  handNumber,
  playerA,
  playerB,
  actionHistory,
  mySide,
  isMyTurn,
  legalActions,
  onAction,
  showdownResult,
}: PokerBoardProps) {
  const { t } = useLanguage();

  // My hand at bottom, opponent at top
  const top = mySide === "b" ? playerA : playerB;
  const bottom = mySide === "b" ? playerB : playerA;
  const topSide = mySide === "b" ? "a" : "b";
  const bottomSide = mySide === "b" ? "b" : "a";

  // Determine active player for highlighting
  const lastAction = actionHistory?.[actionHistory.length - 1];
  const activeSide = lastAction ? (lastAction.playerSide === "a" ? "b" : "a") : "a";

  // Determine showdown winner side for highlighting
  const isShowdown = !!showdownResult;
  const winnerIdx = showdownResult?.winner; // 0=A, 1=B, -1=split
  const topIsWinner = (topSide === "a" && winnerIdx === 0) || (topSide === "b" && winnerIdx === 1);
  const bottomIsWinner = (bottomSide === "a" && winnerIdx === 0) || (bottomSide === "b" && winnerIdx === 1);

  // Fill community cards to 5 slots
  const filled: (PokerCard | null)[] = [];
  for (let i = 0; i < 5; i++) filled.push(communityCards[i] ?? null);

  return (
    <div className="rounded-2xl bg-gradient-to-b from-green-800 via-green-900 to-green-950 border border-green-700/50 shadow-2xl overflow-hidden">
      {/* Felt surface */}
      <div className="relative px-4 py-5 sm:px-6 sm:py-6 space-y-4">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

        {/* Header: hand # + street */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">{t.poker.hand} #{handNumber}</span>
            <StreetBadge street={street} />
          </div>
        </div>

        {/* ── Opponent (top) ── */}
        <div
          className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isShowdown && topIsWinner
              ? "poker-winner-glow bg-amber-400/10 ring-1 ring-amber-400/30"
              : activeSide === topSide
              ? "bg-white/10 ring-1 ring-white/20"
              : "bg-black/15"
          } ${top.hasFolded ? "opacity-40" : ""}`}
        >
          <div className="flex gap-1.5">
            {top.holeCards && top.holeCards.length === 2
              ? top.holeCards.map((c, i) => <CardFace key={`top-${i}`} card={c} size="sm" />)
              : <><CardBack size="sm" /><CardBack size="sm" /></>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white truncate">{top.name}</span>
              {top.isDealer && <DealerChip />}
              {top.isAllIn && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[9px] font-bold uppercase">All-In</span>
              )}
              {top.hasFolded && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-bold uppercase">Fold</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
              <span>{t.poker.stack}: <span className="text-white font-medium">{top.stack}</span></span>
              {top.currentBet > 0 && (
                <span>Bet: <span className="text-yellow-300 font-medium">{top.currentBet}</span></span>
              )}
            </div>
          </div>
        </div>

        {/* ── Community cards + Pot ── */}
        <div className="relative flex flex-col items-center gap-3 py-5">
          <div className="flex items-center gap-2">
            {filled.map((c, i) =>
              c ? (
                <CardFace key={`cc-${i}`} card={c} />
              ) : (
                <EmptySlot key={`empty-${i}`} />
              ),
            )}
          </div>
          <div className={`flex items-center gap-2 bg-black/20 rounded-full px-4 py-1.5 ${pot > 0 ? "poker-pot-pulse" : ""}`}>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{t.poker.pot}</span>
            <span className="text-lg font-bold text-yellow-300 font-mono tabular-nums">{pot}</span>
          </div>
        </div>

        {/* ── Showdown result banner ── */}
        {isShowdown && showdownResult && (
          <ShowdownBanner
            result={showdownResult}
            playerAName={playerA.name}
            playerBName={playerB.name}
            mySide={mySide ?? null}
          />
        )}

        {/* ── Me (bottom) ── */}
        <div
          className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            isShowdown && bottomIsWinner
              ? "poker-winner-glow bg-amber-400/10 ring-1 ring-amber-400/30"
              : activeSide === bottomSide
              ? "bg-white/10 ring-1 ring-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
              : "bg-black/15"
          } ${bottom.hasFolded ? "opacity-40" : ""}`}
        >
          <div className="flex gap-1.5">
            {bottom.holeCards && bottom.holeCards.length === 2
              ? bottom.holeCards.map((c, i) => <CardFace key={`bot-${i}`} card={c} size="lg" />)
              : <><CardBack size="lg" /><CardBack size="lg" /></>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white truncate">{bottom.name}</span>
              {bottom.isDealer && <DealerChip />}
              {bottom.isAllIn && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-[9px] font-bold uppercase">All-In</span>
              )}
              {bottom.hasFolded && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 text-[9px] font-bold uppercase">Fold</span>
              )}
              {mySide && (
                <span className="ml-auto text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  YOU
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
              <span>{t.poker.stack}: <span className="text-white font-medium">{bottom.stack}</span></span>
              {bottom.currentBet > 0 && (
                <span>Bet: <span className="text-yellow-300 font-medium">{bottom.currentBet}</span></span>
              )}
            </div>
          </div>
        </div>

        {/* ── Action bar ── */}
        {isMyTurn && legalActions && onAction && (
          <div className="relative">
            <ActionBar legalActions={legalActions} onAction={onAction} />
          </div>
        )}

        {/* ── Action log ── */}
        {actionHistory && actionHistory.length > 0 && (
          <div className="relative space-y-0.5 pt-2 border-t border-white/5">
            {actionHistory.slice(-5).map((a, i) => (
              <div key={i} className="text-[10px] font-mono flex items-center gap-1.5">
                <span className={a.playerSide === "a" ? "text-blue-300" : "text-red-300"}>
                  {a.playerSide === "a" ? playerA.name : playerB.name}
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
    </div>
  );
}
