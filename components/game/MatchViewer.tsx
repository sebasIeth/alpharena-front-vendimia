"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Match, Move, BoardState } from "@/lib/types";
import MarrakechBoard from "./MarrakechBoard";
import Badge from "@/components/ui/Badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface MatchViewerProps {
  match: Match;
  onMatchUpdate?: (match: Match) => void;
}

interface AgentThought {
  agentId: string;
  agentName: string;
  side: string;
  text: string;
  timestamp: number;
}

const SIDE_COLORS: Record<string, string> = {
  a: "#EF4444",
  b: "#3B82F6",
  c: "#10B981",
  d: "#8B5CF6",
};

export default function MatchViewer({ match, onMatchUpdate }: MatchViewerProps) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<BoardState | null | undefined>(
    match.boardState
  );
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [thinkingSide, setThinkingSide] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const matchId = match.id || (match as any)._id;
  const agents = Array.isArray(match.agents) ? match.agents : [];

  // Build agentId -> { name, side } lookup
  const agentLookup = React.useMemo(() => {
    const map = new Map<string, { name: string; side: string }>();
    agents.forEach((a, idx) => {
      const side = ["a", "b", "c", "d"][idx] || String(idx);
      map.set(a.agentId, { name: a.agentName, side });
    });
    return map;
  }, [agents]);

  // Fetch moves
  useEffect(() => {
    async function fetchMoves() {
      if (!matchId) return;
      try {
        const data = await api.getMatchMoves(matchId);
        setMoves(data.moves || []);
      } catch {
        // silently fail
      } finally {
        setLoadingMoves(false);
      }
    }
    fetchMoves();
  }, [matchId]);

  // WebSocket for live updates
  const handleWSMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "move" && msg.data) {
          setMoves((prev) => [...prev, msg.data as Move]);
          setThinkingSide(null);
        }
        if (msg.type === "board_update" && msg.data) {
          setCurrentBoard(msg.data as BoardState);
        }
        if (msg.type === "match_update" && msg.data) {
          const updatedMatch = msg.data as Match;
          if (updatedMatch.boardState) {
            setCurrentBoard(updatedMatch.boardState);
          }
          onMatchUpdate?.(updatedMatch);
        }

        // Agent thinking event from backend: "agent:thinking"
        if (msg.type === "agent:thinking" && msg.data) {
          const { agentId, side, raw, moveNumber } = msg.data;
          const info = agentLookup.get(agentId);
          // Extract just the reasoning text (strip JSON action block if present)
          let displayText = raw || "";
          const jsonIdx = displayText.indexOf("\n{");
          if (jsonIdx > 0) {
            displayText = displayText.slice(0, jsonIdx).trim();
          }
          setThinkingSide(null);
          setThoughts((prev) => [
            ...prev,
            {
              agentId,
              agentName: info?.name || "Agent",
              side: side || info?.side || "a",
              text: displayText || `(move #${moveNumber})`,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch {
        // ignore parse errors
      }
    },
    [onMatchUpdate, agentLookup]
  );

  useEffect(() => {
    if (match.status === "active" && matchId) {
      const ws = api.connectMatchWS(matchId);
      if (ws) {
        wsRef.current = ws;
        ws.addEventListener("message", handleWSMessage);
        ws.addEventListener("close", () => {
          wsRef.current = null;
        });
      }
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [matchId, match.status, handleWSMessage]);

  // Polling fallback: re-fetch match + moves every 3s while active
  useEffect(() => {
    if (match.status !== "active" || !matchId) return;

    pollRef.current = setInterval(async () => {
      try {
        const [matchRes, movesRes] = await Promise.allSettled([
          api.getMatch(matchId),
          api.getMatchMoves(matchId),
        ]);

        if (matchRes.status === "fulfilled") {
          const updated = matchRes.value.match;
          if (updated) {
            if (updated.boardState) {
              setCurrentBoard(updated.boardState);
            }
            onMatchUpdate?.({ ...updated, id: updated.id || (updated as any)._id });
          }
        }

        if (movesRes.status === "fulfilled") {
          const newMoves = movesRes.value.moves || [];
          setMoves((prev) =>
            newMoves.length > prev.length ? newMoves : prev
          );
        }
      } catch {
        // silently fail
      }
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [match.status, matchId, onMatchUpdate]);

  // Auto-scroll
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves]);

  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thoughts]);

  return (
    <div className="space-y-6">
      {/* Main grid: Board + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Board Area */}
        <div className="lg:col-span-2">
          <div className="bg-arena-card border border-arena-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-arena-text">Board</h3>
              <div className="flex items-center gap-2">
                <Badge status={match.status} />
                {match.status === "active" && (
                  <span className="flex items-center gap-1 text-xs text-arena-success">
                    <span className="w-2 h-2 bg-arena-success rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
            <MarrakechBoard boardState={currentBoard || match.boardState} />

            {/* Match Info Below Board */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Turn</div>
                <div className="text-arena-text font-medium">
                  {match.currentTurn ?? "-"}
                </div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Moves</div>
                <div className="text-arena-text font-medium">
                  {moves.length || match.moveCount || 0}
                </div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Stake</div>
                <div className="text-arena-primary font-medium">
                  {match.stakeAmount}
                </div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Pot</div>
                <div className="text-arena-primary font-medium">{match.pot}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Players + Moves + Details */}
        <div className="space-y-4">
          {/* Players */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Players</h3>
            <div className="space-y-3">
              {agents.map((agent, idx) => {
                const side = ["a", "b", "c", "d"][idx];
                const isThinking = thinkingSide === side;
                return (
                  <div
                    key={agent.agentId}
                    className={`flex items-center justify-between bg-arena-bg rounded-lg p-3 transition-all ${
                      isThinking ? "ring-1 ring-arena-primary/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                      />
                      <div>
                        <div className="text-sm font-medium text-arena-text">
                          {agent.agentName}
                        </div>
                        <div className="text-xs text-arena-muted">
                          by {agent.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isThinking ? (
                        <span className="text-xs text-arena-primary animate-pulse">
                          Thinking...
                        </span>
                      ) : (
                        <>
                          <div className="text-sm text-arena-primary font-medium">
                            {agent.eloAtStart}
                          </div>
                          {agent.eloChange !== undefined && agent.eloChange !== null && (
                            <div
                              className={`text-xs font-medium ${
                                agent.eloChange > 0
                                  ? "text-arena-success"
                                  : agent.eloChange < 0
                                  ? "text-arena-accent"
                                  : "text-arena-muted"
                              }`}
                            >
                              {agent.eloChange > 0 ? "+" : ""}
                              {agent.eloChange}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result */}
            {match.status === "completed" && match.winnerId && (
              <div className="mt-3 p-3 bg-arena-primary/10 border border-arena-primary/30 rounded-lg">
                <div className="text-xs text-arena-muted mb-1">Winner</div>
                <div className="text-sm font-semibold text-arena-primary">
                  {agents.find((a) => a.agentId === match.winnerId)
                    ?.agentName || "Unknown"}
                </div>
                {match.result && (
                  <div className="text-xs text-arena-muted mt-1">
                    {typeof match.result === "string"
                      ? match.result
                      : (match.result as any)?.reason || JSON.stringify(match.result)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">
              Move History
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {loadingMoves ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  Loading moves...
                </div>
              ) : moves.length === 0 ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  No moves yet
                </div>
              ) : (
                moves.map((move, idx) => (
                  <div
                    key={move.id || idx}
                    className="flex items-center gap-2 text-xs bg-arena-bg rounded px-2 py-1.5"
                  >
                    <span className="text-arena-muted font-mono w-6 text-right">
                      #{move.turnNumber}
                    </span>
                    <span className="text-arena-text flex-1 font-mono truncate">
                      {JSON.stringify(move.moveData)}
                    </span>
                    <span className="text-arena-muted">
                      {formatRelativeTime(move.timestamp)}
                    </span>
                  </div>
                ))
              )}
              <div ref={movesEndRef} />
            </div>
          </div>

          {/* Match Details */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Details</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-arena-muted">Match ID</dt>
                <dd className="text-arena-text font-mono">{(matchId || "unknown").slice(0, 12)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-arena-muted">Game Type</dt>
                <dd className="text-arena-text capitalize">{match.gameType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-arena-muted">Created</dt>
                <dd className="text-arena-text">{formatDate(match.createdAt)}</dd>
              </div>
              {match.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-arena-muted">Completed</dt>
                  <dd className="text-arena-text">{formatDate(match.completedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Agent Thoughts — full width below the board */}
      {match.status === "active" && (
        <div className="bg-arena-card border border-arena-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-arena-text">Agent Thoughts</h3>
            <span className="flex items-center gap-1 text-[10px] text-arena-success">
              <span className="w-1.5 h-1.5 bg-arena-success rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {thoughts.length === 0 ? (
              <div className="text-center text-sm text-arena-muted py-6">
                Waiting for agents to think...
                <div className="text-xs mt-1 text-arena-muted/60">
                  Agent reasoning will appear here in real-time
                </div>
              </div>
            ) : (
              thoughts.map((thought, idx) => (
                <div key={idx} className="flex gap-2">
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SIDE_COLORS[thought.side] || "#8B5CF6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: SIDE_COLORS[thought.side] || "#8B5CF6" }}
                      >
                        {thought.agentName}
                      </span>
                      <span className="text-[10px] text-arena-muted">
                        {new Date(thought.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-arena-text/80 whitespace-pre-wrap break-words">
                      {thought.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            {thinkingSide && (
              <div className="flex gap-2 items-center">
                <div
                  className="w-1 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SIDE_COLORS[thinkingSide] || "#8B5CF6" }}
                />
                <span className="text-xs text-arena-muted animate-pulse">
                  {agents.find((_, idx) => ["a", "b", "c", "d"][idx] === thinkingSide)?.agentName || "Agent"}{" "}
                  is thinking...
                </span>
              </div>
            )}
            <div ref={thoughtsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
