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
function CardFace({ card, size = "md", highlight = false }: { card: PokerCard; size?: "sm" | "md" | "lg" | "cc"; highlight?: boolean }) {
  // cc = community card: 50x70 fixed, fits center without overlap
  const dim = {
    sm: "w-9 h-[52px]",
    md: "w-[52px] h-[74px]",
    lg: "w-16 h-[92px]",
    cc: "w-[50px] h-[70px]",
  }[size] ?? "w-[52px] h-[74px]";
  const rankSz = {
    sm: "text-[8px]",
    md: "text-[11px]",
    lg: "text-sm",
    cc: "text-[9px]",
  }[size] ?? "text-[11px]";
  const suitSz = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
    cc: "text-base",
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
    <div className={`${dim} rounded-lg bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-950 shadow-lg select-none flex items-center justify-center ring-1 ring-white/10`}>
      <div className="w-[60%] h-[65%] rounded-sm border border-indigo-400/20 bg-[repeating-conic-gradient(rgba(99,102,241,0.15)_0%_25%,transparent_0%_50%)] bg-[length:6px_6px]" />
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
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wide ${cls[street] ?? "bg-white/10 text-white/60"}`}>
      {label[street] ?? street}
    </span>
  );
}

function DealerChip() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 text-black text-[8px] font-extrabold shadow-md ring-1 ring-yellow-500/50">
      D
    </span>
  );
}

/* ── Seat positioning (9-max) ─────────────────────── */
// Positions are % of the table container.
// Players sit at the EDGE of the oval — pushed further out so they
// never overlap with community cards in the center.
// Symmetric around center (50, 50). Top/bottom mirrors are equidistant.
const SEAT_POSITIONS_9 = [
  { x: 50, y: 85 },   // Seat 0: bottom center (YOU)      — 35 from center
  { x: 18, y: 72 },   // Seat 1: bottom-left               — mirrors seat 8
  { x: 8,  y: 48 },   // Seat 2: left                      — mirrors seat 7
  { x: 16, y: 22 },   // Seat 3: top-left                  — mirrors seat 1 (y: 50-28=22, 50+22=72)
  { x: 35, y: 12 },   // Seat 4: top-left-center
  { x: 50, y: 10 },   // Seat 5: top-center                — 40 from center, heads-up opponent
  { x: 65, y: 12 },   // Seat 6: top-right-center          — mirrors seat 4
  { x: 92, y: 48 },   // Seat 7: right                     — mirrors seat 2
  { x: 82, y: 72 },   // Seat 8: bottom-right              — mirrors seat 1
];

const SEAT_CONFIGS: Record<number, number[]> = {
  2: [0, 5],                          // face to face, both x:50
  3: [0, 3, 6],                       // triangle
  4: [0, 2, 5, 7],                    // diamond
  5: [0, 2, 4, 6, 7],                 // pentagon
  6: [0, 1, 3, 5, 6, 8],             // hexagon
  7: [0, 1, 3, 4, 6, 7, 8],          // 7 spread
  8: [0, 1, 2, 3, 4, 6, 7, 8],       // 8 seats
  9: [0, 1, 2, 3, 4, 5, 6, 7, 8],    // full table
};

function getSeatsForPlayerCount(count: number) {
  const clamped = Math.max(2, Math.min(9, count));
  return SEAT_CONFIGS[clamped].map(i => SEAT_POSITIONS_9[i]);
}

// Card size scales with player count so seats stay compact with many players
function getCardSize(playerCount: number) {
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
  cardSize,
  isActive,
  showCards,
  isShowdown,
  isWinner,
  hideCards,
}: {
  player: PlayerViewInfo;
  position: { x: number; y: number };
  cardSize: ReturnType<typeof getCardSize>;
  isActive: boolean;
  showCards: boolean;
  isShowdown: boolean;
  isWinner: boolean;
  hideCards?: boolean;
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
                style={{ width: cardSize.w, height: cardSize.h }}
                className="rounded-md bg-white shadow-md ring-1 ring-black/5 relative flex items-center justify-center select-none"
              >
                <div className="absolute top-[1px] left-[2px] flex flex-col items-center leading-none">
                  <span className={`text-[7px] font-bold ${clr}`}>{c.rank}</span>
                  <span className={`text-[7px] ${clr}`}>{SUIT_SYM[c.suit]}</span>
                </div>
                <span className={`text-sm ${clr}`}>{SUIT_SYM[c.suit]}</span>
              </div>
            );
          })
        : !player.hasFolded && !player.isEliminated
        ? [0, 1].map(i => (
            <div
              key={i}
              style={{ width: cardSize.w, height: cardSize.h }}
              className="rounded-md bg-gradient-to-br from-indigo-600 via-blue-800 to-indigo-950 shadow-md ring-1 ring-white/10 flex items-center justify-center"
            >
              <div className="w-[55%] h-[60%] rounded-sm border border-indigo-400/15 bg-[repeating-conic-gradient(rgba(99,102,241,0.12)_0%_25%,transparent_0%_50%)] bg-[length:5px_5px]" />
            </div>
          ))
        : null}
    </div>
  ) : null;

  const infoEl = (
    <div
      className={`
        px-2 py-1 rounded-lg backdrop-blur-sm text-center transition-all
        ${isShowdown && isWinner ? "bg-amber-400/15 poker-winner-glow ring-2 ring-amber-400/60" : ""}
        ${isActive && !isShowdown ? "bg-black/60 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] poker-seat-active" : ""}
        ${!isActive && !(isShowdown && isWinner) ? "bg-black/50" : ""}
        ${player.hasFolded && !player.isEliminated ? "opacity-40" : ""}
        ${player.isEliminated ? "opacity-20 grayscale" : ""}
      `}
      style={{ minWidth: cardSize.infoMin }}
    >
      <div className={`${cardSize.text} font-bold text-white truncate flex items-center justify-center gap-1`}
        style={{ maxWidth: cardSize.infoMin + 16 }}
      >
        {player.name}
        {player.isDealer && <DealerChip />}
        {player.isHuman && (
          <span className="inline-flex px-1 rounded text-[7px] bg-green-500/80 text-white font-bold uppercase">You</span>
        )}
      </div>
      <div className={`${cardSize.text} text-green-300 font-mono`}>{player.stack}</div>
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
          bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5
          text-[9px] text-yellow-300 font-mono font-bold shadow-md
          ${isTop ? "-bottom-4" : "-top-4"}
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
}: PokerBoardProps) {
  const { t } = useLanguage();

  const isShowdown = !!showdownResult;
  const winnerIndices = new Set(showdownResult?.winners.map(w => w.playerIndex) ?? []);

  const filled: (PokerCard | null)[] = [];
  for (let i = 0; i < 5; i++) filled.push(communityCards[i] ?? null);

  const seats = getSeatsForPlayerCount(players.length);
  const cardSize = getCardSize(players.length);

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
        <div className="relative w-full mx-auto aspect-[5/3] max-w-[700px]">

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
                  ? <CardFace key={`cc-${i}`} card={c} size="cc" />
                  : <div key={`empty-${i}`} className="w-[50px] h-[70px] rounded-md border border-dashed border-white/15 flex-shrink-0" />
              )}
            </div>
            <div className={`flex items-center gap-1.5 bg-black/40 rounded-full px-2.5 py-0.5 ${pot > 0 ? "poker-pot-pulse" : ""}`}>
              <span className="text-[8px] text-white/50 uppercase tracking-widest font-mono">{t.poker.pot}</span>
              <span className="text-xs font-bold text-yellow-300 font-mono tabular-nums">{pot}</span>
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

          {/* ── Player seats ── */}
          {players.map((player, idx) => {
            const visualIndex = (idx - humanPlayerIndex + players.length) % players.length;
            const pos = seats[visualIndex % seats.length];
            const showCards = player.isHuman || (isShowdown && !player.hasFolded);

            return (
              <PlayerSeat
                key={player.id}
                player={player}
                position={pos}
                cardSize={cardSize}
                isActive={idx === currentPlayerIndex && !isShowdown}
                showCards={showCards}
                isShowdown={isShowdown}
                isWinner={winnerIndices.has(idx)}
                hideCards={player.isHuman}
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
              <div className="flex justify-center gap-2">
                {humanPlayer.holeCards && humanPlayer.holeCards.length === 2
                  ? humanPlayer.holeCards.map((c, i) => (
                      <CardFace key={i} card={c} size="md" highlight={isShowdown && humanIsWinner} />
                    ))
                  : <><CardBack size="md" /><CardBack size="md" /></>
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
              <div className="space-y-0.5 pt-2 border-t border-white/5">
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
        );
      })()}
    </div>
  );
}
