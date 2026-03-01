"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { PokerCard, PokerLegalActions } from "@/lib/types";

/* ── Card rendering ────────────────────────────────── */
const SUIT_SYMBOL: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};
const SUIT_COLOR: Record<string, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-white",
  spades: "text-white",
};

function CardFace({ card }: { card: PokerCard }) {
  return (
    <div className="w-12 h-[68px] rounded-lg bg-white flex flex-col items-center justify-center shadow-md border border-gray-200 select-none">
      <span className={`text-sm font-bold leading-none ${SUIT_COLOR[card.suit] ?? "text-white"}`}>
        {card.rank}
      </span>
      <span className={`text-lg leading-none ${SUIT_COLOR[card.suit] ?? "text-white"}`}>
        {SUIT_SYMBOL[card.suit] ?? "?"}
      </span>
    </div>
  );
}

function CardBack() {
  return (
    <div className="w-12 h-[68px] rounded-lg bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center shadow-md border border-blue-700 select-none">
      <div className="w-8 h-12 rounded border border-blue-600/40 bg-blue-900/60 flex items-center justify-center">
        <span className="text-blue-400 text-xs font-bold">?</span>
      </div>
    </div>
  );
}

function EmptyCardSlot() {
  return (
    <div className="w-12 h-[68px] rounded-lg border border-dashed border-arena-border-light/30 flex items-center justify-center">
      <span className="text-arena-muted/20 text-lg">-</span>
    </div>
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
  // Human play props
  mySide?: "a" | "b" | null;
  isMyTurn?: boolean;
  legalActions?: PokerLegalActions | null;
  onAction?: (action: { action: string; amount?: number }) => void;
}

/* ── Badges ───────────────────────────────────────── */
function StreetBadge({ street }: { street: string }) {
  const { t } = useLanguage();
  const labels: Record<string, string> = {
    preflop: t.poker.preflop,
    flop: t.poker.flop,
    turn: t.poker.turn,
    river: t.poker.river,
    showdown: t.poker.showdown,
  };
  const colors: Record<string, string> = {
    preflop: "bg-blue-500/20 text-blue-400",
    flop: "bg-green-500/20 text-green-400",
    turn: "bg-yellow-500/20 text-yellow-400",
    river: "bg-red-500/20 text-red-400",
    showdown: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${colors[street] ?? "bg-arena-border text-arena-muted"}`}>
      {labels[street] ?? street}
    </span>
  );
}

function DealerChip() {
  return (
    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-black text-[9px] font-bold">
      D
    </span>
  );
}

/* ── Player Row ───────────────────────────────────── */
function PlayerRow({
  name,
  stack,
  currentBet,
  hasFolded,
  isAllIn,
  isDealer,
  holeCards,
  isTop,
  isActive,
}: {
  name: string;
  stack: number;
  currentBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  holeCards?: PokerCard[];
  isTop?: boolean;
  isActive?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive
          ? "bg-arena-accent/10 border border-arena-accent/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
          : "bg-arena-bg-light/40 border border-arena-border-light/20"
      } ${hasFolded ? "opacity-40" : ""}`}
    >
      {/* Cards */}
      <div className="flex gap-1">
        {holeCards && holeCards.length === 2 ? (
          holeCards.map((c, i) => <CardFace key={i} card={c} />)
        ) : (
          <>
            <CardBack />
            <CardBack />
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-arena-text truncate">{name}</span>
          {isDealer && <DealerChip />}
          {isAllIn && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold uppercase">
              All-In
            </span>
          )}
          {hasFolded && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[9px] font-bold uppercase">
              Fold
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-arena-muted mt-0.5">
          <span>Stack: <span className="text-arena-text font-medium">{stack}</span></span>
          {currentBet > 0 && (
            <span>Bet: <span className="text-yellow-400 font-medium">{currentBet}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Action Bar (human play) ─────────────────────── */
function ActionBar({
  legalActions,
  onAction,
}: {
  legalActions: PokerLegalActions;
  onAction: (action: { action: string; amount?: number }) => void;
}) {
  const { t } = useLanguage();
  const [raiseAmount, setRaiseAmount] = useState(legalActions.minRaise);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {legalActions.canFold && (
        <button
          onClick={() => onAction({ action: "fold" })}
          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors border border-red-500/20"
        >
          {t.poker.fold}
        </button>
      )}
      {legalActions.canCheck && (
        <button
          onClick={() => onAction({ action: "check" })}
          className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors border border-blue-500/20"
        >
          {t.poker.check}
        </button>
      )}
      {legalActions.canCall && (
        <button
          onClick={() => onAction({ action: "call" })}
          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors border border-green-500/20"
        >
          {t.poker.call} ({legalActions.callAmount})
        </button>
      )}
      {legalActions.canRaise && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={legalActions.minRaise}
            max={legalActions.maxRaise}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-24 accent-arena-accent"
          />
          <button
            onClick={() => onAction({ action: "raise", amount: raiseAmount })}
            className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors border border-yellow-500/20"
          >
            {t.poker.raise} ({raiseAmount})
          </button>
        </div>
      )}
      {legalActions.canAllIn && (
        <button
          onClick={() => onAction({ action: "all_in" })}
          className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors border border-purple-500/20"
        >
          {t.poker.allIn} ({legalActions.allInAmount})
        </button>
      )}
    </div>
  );
}

/* ── Main PokerBoard ─────────────────────────────── */
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
}: PokerBoardProps) {
  const { t } = useLanguage();

  // If playing as side b, swap visual positions (my hand at bottom)
  const topPlayer = mySide === "b" ? playerA : playerB;
  const bottomPlayer = mySide === "b" ? playerB : playerA;
  const topSide = mySide === "b" ? "a" : "b";
  const bottomSide = mySide === "b" ? "b" : "a";

  // Determine which side is currently acting
  const lastAction = actionHistory?.[actionHistory.length - 1];
  const currentTurnSide = lastAction ? (lastAction.playerSide === "a" ? "b" : "a") : "a";

  // Fill community cards to 5 slots
  const filledCommunity: (PokerCard | null)[] = [];
  for (let i = 0; i < 5; i++) {
    filledCommunity.push(communityCards[i] ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header: Hand # + Street */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-arena-muted font-mono">{t.poker.hand} #{handNumber}</span>
          <StreetBadge street={street} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-arena-muted">{t.poker.pot}:</span>
          <span className="text-sm font-bold text-yellow-400">{pot}</span>
        </div>
      </div>

      {/* Top player (opponent) */}
      <PlayerRow
        {...topPlayer}
        isTop
        isActive={currentTurnSide === topSide}
      />

      {/* Community cards */}
      <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-xl bg-green-900/20 border border-green-800/20">
        {filledCommunity.map((card, i) =>
          card ? <CardFace key={i} card={card} /> : <EmptyCardSlot key={i} />,
        )}
      </div>

      {/* Bottom player (me / side a) */}
      <PlayerRow
        {...bottomPlayer}
        isActive={currentTurnSide === bottomSide}
      />

      {/* Action bar for human play */}
      {isMyTurn && legalActions && onAction && (
        <ActionBar legalActions={legalActions} onAction={onAction} />
      )}

      {/* Action log (last 5) */}
      {actionHistory && actionHistory.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {actionHistory.slice(-5).map((a, i) => (
            <div key={i} className="text-[10px] text-arena-muted font-mono flex items-center gap-1.5">
              <span className={a.playerSide === "a" ? "text-blue-400" : "text-red-400"}>
                {a.playerSide === "a" ? playerA.name : playerB.name}
              </span>
              <span className="text-arena-text">
                {a.type}{a.amount != null ? ` (${a.amount})` : ""}
              </span>
              <span className="text-arena-muted/50">{a.street}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
