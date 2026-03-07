"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PokerCard, PokerLegalActions, SidePot } from "@/lib/types";
import type { ShowdownResult } from "@/lib/poker/engine";
import type { PlayerViewInfo } from "@/lib/poker/useLocalPoker";

/* ── Suit helpers ─────────────────────────────────── */
const SUIT_SYM: Record<string, string> = { hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660" };
const SUIT_CLR: Record<string, string> = { hearts: "text-red-500", diamonds: "text-red-500", clubs: "text-gray-900", spades: "text-gray-900" };

/* ── Card components ──────────────────────────────── */
function CardFace({ card, size = "md", highlight = false }: { card: PokerCard; size?: "sm" | "md" | "lg"; highlight?: boolean }) {
  const dim = { sm: "w-9 h-[52px]", md: "w-[52px] h-[74px]", lg: "w-16 h-[92px]" }[size];
  const rankSz = { sm: "text-[8px]", md: "text-[11px]", lg: "text-sm" }[size];
  const suitSz = { sm: "text-sm", md: "text-xl", lg: "text-3xl" }[size];
  const clr = SUIT_CLR[card.suit] ?? "text-gray-900";

  return (
    <div className={`${dim} rounded-lg bg-white shadow-lg select-none relative flex items-center justify-center ring-1 ring-black/5 ${highlight ? "poker-card-highlight" : ""}`}>
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
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-black text-[9px] font-extrabold shadow-md ring-2 ring-yellow-500/50">
      D
    </span>
  );
}

/* ── Seat positioning ─────────────────────────────── */
function getSeatPosition(
  seatIndex: number,
  totalPlayers: number,
  tableWidth: number,
  tableHeight: number,
): { x: number; y: number } {
  // Start at bottom center (PI/2 in screen coords) and go clockwise
  const startAngle = Math.PI / 2;
  const angleStep = (2 * Math.PI) / totalPlayers;
  const angle = startAngle + seatIndex * angleStep;

  const cx = tableWidth / 2;
  const cy = tableHeight / 2;
  const rx = (tableWidth / 2) * 0.82;
  const ry = (tableHeight / 2) * 0.78;

  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
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
          <button onClick={() => onAction({ action: "fold" })} className="px-5 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95">
            {t.poker.fold}
          </button>
        )}
        {legalActions.canCheck && (
          <button onClick={() => onAction({ action: "check" })} className="px-5 py-2.5 rounded-xl bg-blue-500/90 text-white text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
            {t.poker.check}
          </button>
        )}
        {legalActions.canCall && (
          <button onClick={() => onAction({ action: "call" })} className="px-5 py-2.5 rounded-xl bg-emerald-500/90 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95">
            {t.poker.call} {legalActions.callAmount}
          </button>
        )}
        {legalActions.canAllIn && (
          <button onClick={() => onAction({ action: "all_in" })} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95">
            ALL IN {legalActions.allInAmount}
          </button>
        )}
      </div>

      {legalActions.canRaise && min < max && (
        <div className="bg-black/20 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">{t.poker.raise}</span>
            <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">{raiseAmt}</span>
          </div>
          <input type="range" min={min} max={max} value={raiseAmt} onChange={(e) => setRaiseAmt(Number(e.target.value))} className="w-full accent-amber-400 h-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {presets.map((p) => (
                <button key={p.label} onClick={() => setRaiseAmt(p.value)} className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-[10px] font-mono hover:bg-white/10 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => onAction({ action: "raise", amount: raiseAmt })} className="px-5 py-2 rounded-xl bg-amber-500/90 text-white text-sm font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 active:scale-95">
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
  isActive,
  showCards,
  isShowdown,
  isWinner,
}: {
  player: PlayerViewInfo;
  position: { x: number; y: number };
  isActive: boolean;
  showCards: boolean;
  isShowdown: boolean;
  isWinner: boolean;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: position.x, top: position.y }}
    >
      <div className={`
        rounded-xl px-2.5 py-2 min-w-[90px] text-center transition-all
        ${player.isEliminated ? "opacity-25 grayscale" : ""}
        ${player.hasFolded && !player.isEliminated ? "opacity-40" : ""}
        ${isShowdown && isWinner ? "poker-winner-glow ring-2 ring-amber-400/60 bg-amber-400/10" : ""}
        ${isActive && !isShowdown ? "ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] poker-seat-active" : ""}
        ${!isActive && !isShowdown && !isWinner ? (player.isHuman ? "bg-black/40" : "bg-black/25") : ""}
      `}>
        {/* Cards */}
        <div className="flex justify-center gap-1 mb-1">
          {showCards && player.holeCards && player.holeCards.length === 2
            ? player.holeCards.map((c, i) => <CardFace key={i} card={c} size={player.isHuman ? "md" : "sm"} />)
            : !player.hasFolded && !player.isEliminated
            ? <><CardBack size="sm" /><CardBack size="sm" /></>
            : null}
        </div>

        {/* Name + badges */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <span className="text-xs text-white font-semibold truncate max-w-[70px]">{player.name}</span>
          {player.isDealer && <DealerChip />}
          {player.isHuman && (
            <span className="text-[7px] bg-amber-400/20 text-amber-300 px-1 py-0.5 rounded uppercase font-bold tracking-wider">YOU</span>
          )}
        </div>

        {/* Stack */}
        <div className="text-[10px] text-white/60 font-mono">{player.stack}</div>

        {/* Status */}
        {player.isAllIn && <span className="text-[8px] text-red-300 font-bold">ALL-IN</span>}
        {player.hasFolded && !player.isEliminated && <span className="text-[8px] text-white/40">FOLDED</span>}
        {player.isEliminated && <span className="text-[8px] text-red-400 font-bold">OUT</span>}

        {/* AI profile */}
        {player.aiProfile && !player.isEliminated && (
          <div className="text-[7px] text-white/30 font-mono">{player.aiProfile}</div>
        )}
      </div>

      {/* Bet chip */}
      {player.currentBet > 0 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-yellow-300 font-mono font-bold bg-black/40 rounded-full px-2 py-0.5">
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
              Pot {i + 1}: {p.amount} → {p.winnerIndices.map(idx => players[idx]?.name).join("/")}
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
}: PokerBoardProps) {
  const { t } = useLanguage();

  const isShowdown = !!showdownResult;
  const winnerIndices = new Set(showdownResult?.winners.map(w => w.playerIndex) ?? []);

  // Fill community cards to 5 slots
  const filled: (PokerCard | null)[] = [];
  for (let i = 0; i < 5; i++) filled.push(communityCards[i] ?? null);

  // Table dimensions (responsive)
  const TABLE_W = 600;
  const TABLE_H = 400;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-green-800 via-green-900 to-green-950 border border-green-700/50 shadow-2xl overflow-hidden">
      <div className="relative px-3 py-4 sm:px-4 sm:py-5">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">{t.poker.hand} #{handNumber}</span>
            <StreetBadge street={street} />
          </div>
          <span className="text-xs text-white/30 font-mono">{players.filter(p => !p.isEliminated).length} players</span>
        </div>

        {/* ── Oval Table ── */}
        <div className="relative mx-auto" style={{ width: TABLE_W, maxWidth: "100%", aspectRatio: `${TABLE_W}/${TABLE_H}` }}>
          {/* Felt ellipse */}
          <div className="absolute inset-[8%] rounded-[50%] bg-gradient-to-b from-green-700/40 via-green-800/30 to-green-900/40 border-2 border-green-600/20" />

          {/* Community cards + Pot in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20">
            <div className="flex items-center gap-1.5">
              {filled.map((c, i) =>
                c ? <CardFace key={`cc-${i}`} card={c} size="sm" /> : <EmptySlot key={`empty-${i}`} />,
              )}
            </div>
            <div className={`flex items-center gap-2 bg-black/30 rounded-full px-3 py-1 ${pot > 0 ? "poker-pot-pulse" : ""}`}>
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">{t.poker.pot}</span>
              <span className="text-base font-bold text-yellow-300 font-mono tabular-nums">{pot}</span>
            </div>
            {/* Side pots */}
            {sidePots && sidePots.length > 1 && (
              <div className="flex gap-2">
                {sidePots.map((sp, i) => (
                  <span key={i} className="text-[8px] text-white/30 font-mono bg-black/20 rounded-full px-2 py-0.5">
                    Pot {i + 1}: {sp.amount}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Player seats */}
          {players.map((player, idx) => {
            // Remap so human is always at visual seat 0 (bottom)
            const visualIndex = (idx - humanPlayerIndex + players.length) % players.length;
            const pos = getSeatPosition(visualIndex, players.length, TABLE_W, TABLE_H);
            const showCards = player.isHuman || (isShowdown && !player.hasFolded);

            return (
              <PlayerSeat
                key={player.id}
                player={player}
                position={pos}
                isActive={idx === currentPlayerIndex && !isShowdown}
                showCards={showCards}
                isShowdown={isShowdown}
                isWinner={winnerIndices.has(idx)}
              />
            );
          })}
        </div>

        {/* Showdown banner */}
        {isShowdown && showdownResult && (
          <div className="mt-3">
            <ShowdownBanner
              result={showdownResult}
              players={players}
              humanPlayerIndex={humanPlayerIndex}
            />
          </div>
        )}

        {/* Action bar */}
        {isMyTurn && legalActions && onAction && (
          <div className="relative mt-3">
            <ActionBar legalActions={legalActions} onAction={onAction} />
          </div>
        )}

        {/* Action log */}
        {actionHistory && actionHistory.length > 0 && (
          <div className="relative space-y-0.5 pt-2 mt-2 border-t border-white/5">
            {actionHistory.slice(-6).map((a, i) => (
              <div key={i} className="text-[10px] font-mono flex items-center gap-1.5">
                <span className={a.playerIndex === humanPlayerIndex ? "text-blue-300" : "text-red-300"}>
                  {players[a.playerIndex]?.name ?? `P${a.playerIndex}`}
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
