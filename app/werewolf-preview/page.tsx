"use client";

import React, { useState } from "react";
import WerewolfBoard, {
  WerewolfAction,
  WerewolfPhase,
  WerewolfPlayerView,
} from "@/components/game/WerewolfBoard";

const samplePlayers: Record<string, WerewolfPlayerView> = {
  a: { side: "a", displayName: "Player1", isAlive: true, role: "WEREWOLF" },
  b: { side: "b", displayName: "Player2", isAlive: true },
  c: { side: "c", displayName: "Player3", isAlive: true },
  d: { side: "d", displayName: "Player4", isAlive: false, deathCycle: 1, deathCause: "night", role: "VILLAGER" },
  e: { side: "e", displayName: "Player5", isAlive: true },
  f: { side: "f", displayName: "Player6", isAlive: true },
  g: { side: "g", displayName: "Player7", isAlive: true },
};

const sampleDiscussion = [
  { cycle: 2, speaker: "b", speakerDisplayName: "Player2", action: { type: "DAY_ACCUSE" as const, target: "e", targetDisplayName: "Player5" } },
  { cycle: 2, speaker: "e", speakerDisplayName: "Player5", action: { type: "DAY_DEFEND" as const, target: "e", targetDisplayName: "Player5" } },
  { cycle: 2, speaker: "c", speakerDisplayName: "Player3", action: { type: "DAY_CLAIM" as const, role: "SEER" as const } },
  { cycle: 2, speaker: "f", speakerDisplayName: "Player6", action: { type: "DAY_PASS" as const } },
];

const sampleDeaths = [
  { cycle: 1, side: "d", displayName: "Player4", role: "VILLAGER" as const, cause: "night" as const },
];

export default function WerewolfPreview() {
  const [phase, setPhase] = useState<WerewolfPhase>("DAY_DISCUSSION");
  const [mySide, setMySide] = useState<string>("b");

  const me = samplePlayers[mySide];
  const isMyTurn = true;

  const legalActions: WerewolfAction[] =
    phase === "NIGHT_WOLVES"
      ? [
          { type: "NIGHT_KILL_VOTE", target: "b" },
          { type: "NIGHT_KILL_VOTE", target: "c" },
          { type: "NIGHT_KILL_VOTE", target: "e" },
          { type: "NIGHT_KILL_VOTE", target: "f" },
          { type: "NIGHT_KILL_VOTE", target: "g" },
        ]
      : phase === "NIGHT_SEER"
      ? [
          { type: "SEER_INVESTIGATE", target: "a" },
          { type: "SEER_INVESTIGATE", target: "e" },
        ]
      : phase === "DAY_DISCUSSION"
      ? [
          { type: "DAY_ACCUSE", target: "a" },
          { type: "DAY_ACCUSE", target: "e" },
          { type: "DAY_DEFEND", target: "c" },
          { type: "DAY_CLAIM", role: "VILLAGER" },
          { type: "DAY_CLAIM", role: "SEER" },
          { type: "DAY_CLAIM", role: "WEREWOLF" },
          { type: "DAY_PASS" },
        ]
      : phase === "DAY_VOTE"
      ? [
          { type: "DAY_VOTE", target: "a" },
          { type: "DAY_VOTE", target: "c" },
          { type: "DAY_VOTE", target: "e" },
          { type: "DAY_VOTE", target: mySide },
        ]
      : [];

  const phases: WerewolfPhase[] = ["NIGHT_WOLVES", "NIGHT_SEER", "DAY_DISCUSSION", "DAY_VOTE", "FINISHED"];

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Werewolf Preview</h1>
          <p className="text-sm text-white/60">
            7-player social deduction · 2 Werewolves · 1 Seer · 4 Villagers
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-white/60 uppercase tracking-wider">Phase:</span>
          {phases.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                phase === p ? "bg-amber-400 text-black" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {p.toLowerCase()}
            </button>
          ))}
          <span className="text-xs text-white/60 uppercase tracking-wider ml-4">View as:</span>
          {Object.values(samplePlayers).map((p) => (
            <button
              key={p.side}
              onClick={() => setMySide(p.side)}
              className={`px-2 py-1 rounded text-xs transition ${
                mySide === p.side ? "bg-emerald-400 text-black" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {p.displayName}
            </button>
          ))}
        </div>

        <WerewolfBoard
          players={samplePlayers}
          phase={phase}
          cycle={2}
          activeSide={mySide}
          discussionLog={sampleDiscussion}
          deaths={sampleDeaths}
          status={phase === "FINISHED" ? "finished" : "playing"}
          winner={phase === "FINISHED" ? "VILLAGERS" : null}
          mySide={mySide}
          myRole={me?.role ?? "VILLAGER"}
          knownWerewolves={me?.role === "WEREWOLF" ? ["a"].filter((s) => s !== mySide) : undefined}
          seerMemory={
            me?.role === "SEER"
              ? [
                  { cycle: 1, target: "a", targetDisplayName: "Player1", isWerewolf: true },
                ]
              : undefined
          }
          legalActions={legalActions}
          isMyTurn={isMyTurn}
          onSubmitAction={(a) => alert(`Submitted: ${JSON.stringify(a)}`)}
        />
      </div>
    </div>
  );
}
