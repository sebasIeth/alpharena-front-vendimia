"use client";

import React, { useState } from "react";
import UnoCard, { UnoCardData, UnoColorSelector } from "./UnoCard";

// ── Types ───────────────────────────────────────────────────────────────────

interface UnoAction {
  type: "PLAY_CARD" | "DRAW_CARD" | "PASS";
  cardId?: string;
  chosenColor?: string;
}

interface AgentInfo {
  name: string;
  side: string;
  agentId: string;
}

interface UnoBoardProps {
  // Current game state
  topCard: UnoCardData | null;
  currentColor: string;
  currentTurn: string;
  drawPileCount: number;
  handCounts: Record<string, number>;
  status: string;
  winner: string | null;
  lastAction: UnoAction | null;
  direction: number;
  moveCount: number;
  // Agent info
  agentA?: AgentInfo;
  agentB?: AgentInfo;
  // Human player mode (IA free)
  mySide?: "a" | "b" | null;
  myHand?: UnoCardData[];
  legalActions?: UnoAction[];
  isMyTurn?: boolean;
  onPlayCard?: (cardId: string, chosenColor?: string) => void;
  onDrawCard?: () => void;
}

const COLOR_HEX: Record<string, string> = {
  RED: "#E63022",
  BLUE: "#0F6EBD",
  GREEN: "#1A9E4A",
  YELLOW: "#F5C400",
};

const COLOR_GLOW: Record<string, string> = {
  RED: "0 0 20px rgba(230, 48, 34, 0.4)",
  BLUE: "0 0 20px rgba(15, 110, 189, 0.4)",
  GREEN: "0 0 20px rgba(26, 158, 74, 0.4)",
  YELLOW: "0 0 20px rgba(245, 196, 0, 0.4)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function isCardPlayable(cardId: string, legalActions: UnoAction[]): boolean {
  return legalActions.some((a) => a.type === "PLAY_CARD" && a.cardId === cardId);
}

function isWildCard(card: UnoCardData): boolean {
  return card.type === "WILD" || card.type === "WILD_DRAW_FOUR";
}

function canDraw(legalActions: UnoAction[]): boolean {
  return legalActions.some((a) => a.type === "DRAW_CARD");
}

function hasPlayableCard(legalActions: UnoAction[]): boolean {
  return legalActions.some((a) => a.type === "PLAY_CARD");
}

// ── Action Label ────────────────────────────────────────────────────────────

function formatAction(action: UnoAction | null, topCard: UnoCardData | null): string {
  if (!action) return "";
  switch (action.type) {
    case "PLAY_CARD": {
      if (!topCard) return "Played a card";
      const label = topCard.type === "NUMBER" ? `${topCard.color} ${topCard.value}` :
        topCard.type === "WILD" ? `Wild (${action.chosenColor || "?"})` :
        topCard.type === "WILD_DRAW_FOUR" ? `Wild +4 (${action.chosenColor || "?"})` :
        `${topCard.color} ${topCard.type.replace("_", " ")}`;
      return `Played ${label}`;
    }
    case "DRAW_CARD": return "Drew a card";
    case "PASS": return "Passed";
    default: return "";
  }
}

// ── Fanned Hand (face-down cards for opponent) ──────────────────────────────

function FannedHand({ count, flipped = false }: { count: number; flipped?: boolean }) {
  const maxVisible = Math.min(count, 12);
  const totalAngle = Math.min(maxVisible * 6, 50);
  const startAngle = -totalAngle / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ height: 100, minWidth: 200 }}>
      {Array.from({ length: maxVisible }).map((_, i) => {
        const angle = startAngle + (maxVisible > 1 ? (i / (maxVisible - 1)) * totalAngle : 0);
        const x = (i - maxVisible / 2) * 12;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              transform: `translateX(${x}px) rotate(${flipped ? -angle : angle}deg)`,
              transformOrigin: flipped ? "center top" : "center bottom",
              zIndex: i,
            }}
          >
            <UnoCard
              card={{ id: `back-${i}`, color: "BLACK", type: "NUMBER", value: 0 }}
              size="sm"
              faceDown
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Player Hand (face-up, interactive) ──────────────────────────────────────

function PlayerHand({
  cards,
  legalActions,
  isMyTurn,
  onPlayCard,
}: {
  cards: UnoCardData[];
  legalActions: UnoAction[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string, chosenColor?: string) => void;
}) {
  const [colorSelectCard, setColorSelectCard] = useState<string | null>(null);
  const maxVisible = Math.min(cards.length, 14);
  const totalAngle = Math.min(maxVisible * 5, 40);
  const startAngle = -totalAngle / 2;
  const spacing = Math.min(52, 600 / Math.max(maxVisible, 1));

  const handleCardClick = (card: UnoCardData) => {
    if (!isMyTurn) return;
    if (!isCardPlayable(card.id, legalActions)) return;
    if (isWildCard(card)) {
      setColorSelectCard(card.id);
    } else {
      onPlayCard(card.id);
    }
  };

  return (
    <>
      <div className="relative flex items-end justify-center" style={{ height: 140, minWidth: 200 }}>
        {cards.slice(0, maxVisible).map((card, i) => {
          const angle = startAngle + (maxVisible > 1 ? (i / (maxVisible - 1)) * totalAngle : 0);
          const x = (i - (maxVisible - 1) / 2) * spacing;
          const playable = isMyTurn && isCardPlayable(card.id, legalActions);
          return (
            <div
              key={card.id}
              className="absolute"
              style={{
                transform: `translateX(${x}px) rotate(${angle}deg)`,
                transformOrigin: "center bottom",
                zIndex: i,
              }}
            >
              <UnoCard
                card={card}
                size="md"
                playable={playable}
                dimmed={isMyTurn && !playable}
                onClick={() => handleCardClick(card)}
              />
            </div>
          );
        })}
      </div>
      {colorSelectCard && (
        <UnoColorSelector
          onSelect={(color) => {
            onPlayCard(colorSelectCard, color);
            setColorSelectCard(null);
          }}
        />
      )}
    </>
  );
}

// ── Draw Pile (stacked cards) ───────────────────────────────────────────────

function DrawPile({ count, showDrawButton, onDraw }: { count: number; showDrawButton?: boolean; onDraw?: () => void }) {
  const layers = Math.min(count, 4);
  return (
    <div className="relative flex flex-col items-center" style={{ width: 80 }}>
      <div className="relative" style={{ width: 80, height: 120 }}>
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: -i * 2,
              left: -i * 1,
              zIndex: i,
            }}
          >
            <UnoCard
              card={{ id: `pile-${i}`, color: "BLACK", type: "NUMBER", value: 0 }}
              size="md"
              faceDown
            />
          </div>
        ))}
      </div>
      {count > 0 && (
        <div className="mt-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
          {count}
        </div>
      )}
      {showDrawButton && onDraw && (
        <button
          onClick={onDraw}
          className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/30 animate-pulse"
        >
          Draw
        </button>
      )}
    </div>
  );
}

// ── Discard Pile ────────────────────────────────────────────────────────────

function DiscardPile({ topCard, currentColor }: { topCard: UnoCardData | null; currentColor: string }) {
  if (!topCard) return <div className="w-[100px] h-[150px] rounded-2xl border-2 border-dashed border-white/20" />;

  return (
    <div className="relative">
      <div
        key={topCard.id}
        className="rounded-2xl transition-shadow duration-300 animate-[fadeIn_0.25s_ease-out]"
        style={{ boxShadow: COLOR_GLOW[currentColor] || "0 0 20px rgba(255,255,255,0.2)" }}
      >
        <UnoCard card={topCard} size="lg" />
      </div>
      {/* Current color indicator */}
      <div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white/80 shadow-lg transition-colors duration-300"
        style={{ backgroundColor: COLOR_HEX[currentColor] || "#666" }}
        title={`Current color: ${currentColor}`}
      />
    </div>
  );
}

// ── Agent Panel ─────────────────────────────────────────────────────────────

function AgentPanel({
  agent,
  cardCount,
  isActive,
  side,
}: {
  agent?: AgentInfo;
  cardCount: number;
  isActive: boolean;
  side: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 ${
        isActive
          ? "bg-white/15 ring-2 ring-amber-400/70 shadow-lg shadow-amber-400/20"
          : "bg-white/5"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          side === "a" ? "bg-blue-500/80 text-white" : "bg-red-500/80 text-white"
        }`}
      >
        {(agent?.name || side.toUpperCase())[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">
          {agent?.name || `Agent ${side.toUpperCase()}`}
        </div>
        {isActive && (
          <div className="text-amber-400 text-[10px] animate-pulse">Thinking...</div>
        )}
      </div>
      <div
        className={`px-2 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
          cardCount <= 2
            ? "bg-red-500/80 text-white animate-pulse"
            : "bg-white/10 text-white/80"
        }`}
      >
        {cardCount} {cardCount === 1 ? "card" : "cards"}
      </div>
    </div>
  );
}

// ── Direction Indicator ─────────────────────────────────────────────────────

function DirectionIndicator({ direction }: { direction: number }) {
  return (
    <div className="text-white/30 text-xs flex items-center gap-1">
      <span className={`transition-transform duration-300 ${direction === 1 ? "rotate-0" : "rotate-180"}`}>
        &#x21BB;
      </span>
      <span>{direction === 1 ? "Normal" : "Reversed"}</span>
    </div>
  );
}

// ── Main Board ──────────────────────────────────────────────────────────────

export default function UnoBoard({
  topCard,
  currentColor,
  currentTurn,
  drawPileCount,
  handCounts,
  status,
  winner,
  lastAction,
  direction,
  moveCount,
  agentA,
  agentB,
  mySide,
  myHand,
  legalActions,
  isMyTurn,
  onPlayCard,
  onDrawCard,
}: UnoBoardProps) {
  const isFinished = status === "finished";
  const isHumanMode = mySide != null && myHand != null;
  const showDrawButton = isMyTurn && legalActions && canDraw(legalActions) && !hasPlayableCard(legalActions);

  // Determine which side is opponent
  const opponentSide = mySide === "a" ? "b" : "a";
  const opponentAgent = mySide === "a" ? agentB : agentA;
  const playerAgent = mySide === "a" ? agentA : agentB;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse at center, #1a5c2a 0%, #0d3518 60%, #091f0e 100%)",
        minHeight: 520,
        border: "3px solid #2a2a2a",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Keyframes for card animations */}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.9) rotate(-4deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }`}</style>

      {/* Felt texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000' fill-opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center p-4 gap-3" style={{ minHeight: 520 }}>
        {/* Opponent (top) */}
        <div className="w-full max-w-md">
          <AgentPanel
            agent={isHumanMode ? opponentAgent : agentB}
            cardCount={handCounts?.[isHumanMode ? opponentSide : "b"] ?? 0}
            isActive={currentTurn === (isHumanMode ? opponentSide : "b") && !isFinished}
            side={isHumanMode ? opponentSide : "b"}
          />
        </div>

        {/* Opponent hand (always face-down) */}
        <FannedHand count={handCounts?.[isHumanMode ? opponentSide : "b"] ?? 0} flipped />

        {/* Center: draw pile + discard pile */}
        <div className="w-full flex items-center justify-center gap-8 my-2">
          <DrawPile count={drawPileCount} showDrawButton={showDrawButton} onDraw={onDrawCard} />
          <div className="flex flex-col items-center gap-2">
            <DiscardPile topCard={topCard} currentColor={currentColor} />
            <DirectionIndicator direction={direction} />
          </div>
        </div>

        {/* Last action */}
        {lastAction && !isFinished && (
          <div className="text-white/50 text-xs text-center">
            {formatAction(lastAction, topCard)}
          </div>
        )}

        {/* Move counter */}
        <div className="text-white/20 text-[10px] font-mono">
          Move #{moveCount}
        </div>

        {/* Player hand */}
        {isHumanMode && myHand ? (
          <PlayerHand
            cards={myHand}
            legalActions={isMyTurn && legalActions ? legalActions : []}
            isMyTurn={!!isMyTurn}
            onPlayCard={onPlayCard || (() => {})}
          />
        ) : (
          <FannedHand count={handCounts?.a ?? 0} />
        )}

        {/* Player (bottom) */}
        <div className="w-full max-w-md">
          <AgentPanel
            agent={isHumanMode ? playerAgent : agentA}
            cardCount={isHumanMode ? (myHand?.length ?? handCounts?.[mySide || "a"] ?? 0) : (handCounts?.a ?? 0)}
            isActive={currentTurn === (mySide || "a") && !isFinished}
            side={mySide || "a"}
          />
        </div>
      </div>

      {/* Winner overlay */}
      {isFinished && winner && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900/90 rounded-2xl px-8 py-6 text-center border border-white/10 shadow-2xl">
            <div className="text-4xl mb-2">
              {winner === mySide
                ? (playerAgent?.name || "You")
                : winner === "a"
                  ? (agentA?.name || "Agent A")
                  : (agentB?.name || "Agent B")}
            </div>
            <div className="text-amber-400 text-lg font-bold">
              {winner === mySide ? "YOU WIN!" : "WINS!"}
            </div>
            <div className="text-white/50 text-sm mt-1">
              {moveCount} moves played
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
