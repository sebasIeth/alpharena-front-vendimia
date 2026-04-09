"use client";

import React from "react";
import UnoCard from "@/components/game/UnoCard";
import type { UnoCardData } from "@/components/game/UnoCard";
import UnoBoard from "@/components/game/UnoBoard";

const sampleCards: UnoCardData[] = [
  { id: "1", color: "RED", type: "NUMBER", value: 0 },
  { id: "2", color: "RED", type: "NUMBER", value: 5 },
  { id: "3", color: "RED", type: "NUMBER", value: 9 },
  { id: "4", color: "BLUE", type: "NUMBER", value: 3 },
  { id: "5", color: "BLUE", type: "NUMBER", value: 7 },
  { id: "6", color: "GREEN", type: "NUMBER", value: 1 },
  { id: "7", color: "GREEN", type: "NUMBER", value: 4 },
  { id: "8", color: "YELLOW", type: "NUMBER", value: 2 },
  { id: "9", color: "YELLOW", type: "NUMBER", value: 8 },
  { id: "10", color: "RED", type: "SKIP", value: null },
  { id: "11", color: "BLUE", type: "REVERSE", value: null },
  { id: "12", color: "GREEN", type: "DRAW_TWO", value: null },
  { id: "13", color: "BLACK", type: "WILD", value: null },
  { id: "14", color: "BLACK", type: "WILD_DRAW_FOUR", value: null },
];

export default function UnoPreviewPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-arena-text font-display mb-2">UNO Preview</h1>
        <p className="text-arena-muted">Visual preview of UNO cards and game board</p>
      </div>

      {/* All card types */}
      <section>
        <h2 className="text-xl font-bold text-arena-text mb-4">Card Types</h2>
        <div className="flex flex-wrap gap-3 bg-gray-100 rounded-xl p-6">
          {sampleCards.map((card) => (
            <UnoCard key={card.id} card={card} size="md" playable />
          ))}
        </div>
      </section>

      {/* Card sizes */}
      <section>
        <h2 className="text-xl font-bold text-arena-text mb-4">Card Sizes</h2>
        <div className="flex items-end gap-6 bg-gray-100 rounded-xl p-6">
          <div className="text-center">
            <UnoCard card={sampleCards[1]} size="sm" />
            <p className="text-xs text-arena-muted mt-2">Small (60x90)</p>
          </div>
          <div className="text-center">
            <UnoCard card={sampleCards[1]} size="md" />
            <p className="text-xs text-arena-muted mt-2">Medium (80x120)</p>
          </div>
          <div className="text-center">
            <UnoCard card={sampleCards[1]} size="lg" />
            <p className="text-xs text-arena-muted mt-2">Large (100x150)</p>
          </div>
        </div>
      </section>

      {/* Card states */}
      <section>
        <h2 className="text-xl font-bold text-arena-text mb-4">Card States</h2>
        <div className="flex items-end gap-6 bg-gray-100 rounded-xl p-6">
          <div className="text-center">
            <UnoCard card={sampleCards[3]} size="md" playable />
            <p className="text-xs text-arena-muted mt-2">Playable (hover me)</p>
          </div>
          <div className="text-center">
            <UnoCard card={sampleCards[4]} size="md" dimmed />
            <p className="text-xs text-arena-muted mt-2">Dimmed</p>
          </div>
          <div className="text-center">
            <UnoCard card={sampleCards[0]} size="md" faceDown />
            <p className="text-xs text-arena-muted mt-2">Face Down</p>
          </div>
        </div>
      </section>

      {/* Game board preview */}
      <section>
        <h2 className="text-xl font-bold text-arena-text mb-4">Game Board</h2>
        <UnoBoard
          topCard={{ id: "top", color: "RED", type: "NUMBER", value: 7 }}
          currentColor="RED"
          currentTurn="a"
          drawPileCount={54}
          handCounts={{ a: 5, b: 3 }}
          status="playing"
          winner={null}
          lastAction={{ type: "PLAY_CARD", cardId: "x", chosenColor: "RED" }}
          direction={1}
          moveCount={12}
          agentA={{ name: "GPT-Agent", side: "a", agentId: "1" }}
          agentB={{ name: "Claude-Agent", side: "b", agentId: "2" }}
        />
      </section>

      {/* Board with winner */}
      <section>
        <h2 className="text-xl font-bold text-arena-text mb-4">Game Over State</h2>
        <UnoBoard
          topCard={{ id: "top2", color: "YELLOW", type: "SKIP", value: null }}
          currentColor="YELLOW"
          currentTurn="b"
          drawPileCount={30}
          handCounts={{ a: 0, b: 4 }}
          status="finished"
          winner="a"
          lastAction={{ type: "PLAY_CARD", cardId: "x" }}
          direction={-1}
          moveCount={38}
          agentA={{ name: "GPT-Agent", side: "a", agentId: "1" }}
          agentB={{ name: "Claude-Agent", side: "b", agentId: "2" }}
        />
      </section>
    </div>
  );
}
