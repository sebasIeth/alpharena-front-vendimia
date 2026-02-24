"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { Match, Move, BoardState } from "@/lib/types";
import MarrakechBoard from "./MarrakechBoard";
import Badge from "@/components/ui/Badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface MatchViewerProps {
  match: Match;
  onMatchUpdate?: (match: Match) => void;
}

export default function MatchViewer({ match, onMatchUpdate }: MatchViewerProps) {
  const { t } = useLanguage();
  const [moves, setMoves] = useState<Move[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<BoardState | null | undefined>(
    match.boardState
  );
  const wsRef = useRef<WebSocket | null>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);

  // Fetch moves
  useEffect(() => {
    async function fetchMoves() {
      try {
        const data = await api.getMatchMoves(match.id);
        setMoves(data.moves || []);
      } catch {
        // silently fail
      } finally {
        setLoadingMoves(false);
      }
    }
    fetchMoves();
  }, [match.id]);

  // WebSocket for live updates
  const handleWSMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "move" && msg.data) {
          setMoves((prev) => [...prev, msg.data as Move]);
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
      } catch {
        // ignore parse errors
      }
    },
    [onMatchUpdate]
  );

  useEffect(() => {
    if (match.status === "active") {
      const ws = api.connectMatchWS(match.id);
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
  }, [match.id, match.status, handleWSMessage]);

  // Auto-scroll moves
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Board Area */}
      <div className="lg:col-span-2">
        <div className="bg-arena-card border border-arena-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-arena-text">{t.matchViewer.board}</h3>
            <div className="flex items-center gap-2">
              <Badge status={match.status} />
              {match.status === "active" && (
                <span className="flex items-center gap-1 text-xs text-arena-success">
                  <span className="w-2 h-2 bg-arena-success rounded-full animate-pulse" />
                  {t.common.live}
                </span>
              )}
            </div>
          </div>
          <MarrakechBoard boardState={currentBoard || match.boardState} />

          {/* Match Info Below Board */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-arena-bg rounded-lg p-2 text-center">
              <div className="text-arena-muted text-xs">{t.common.turn}</div>
              <div className="text-arena-text font-medium">
                {match.currentTurn ?? "-"}
              </div>
            </div>
            <div className="bg-arena-bg rounded-lg p-2 text-center">
              <div className="text-arena-muted text-xs">{t.common.moves}</div>
              <div className="text-arena-text font-medium">
                {moves.length || match.moveCount || 0}
              </div>
            </div>
            <div className="bg-arena-bg rounded-lg p-2 text-center">
              <div className="text-arena-muted text-xs">{t.common.stake}</div>
              <div className="text-arena-primary font-medium">
                {match.stakeAmount}
              </div>
            </div>
            <div className="bg-arena-bg rounded-lg p-2 text-center">
              <div className="text-arena-muted text-xs">{t.common.pot}</div>
              <div className="text-arena-primary font-medium">{match.pot}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar: Players + Moves */}
      <div className="space-y-4">
        {/* Players */}
        <div className="bg-arena-card border border-arena-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-arena-text mb-3">{t.matchViewer.players}</h3>
          <div className="space-y-3">
            {match.agents.map((agent, idx) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between bg-arena-bg rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor:
                        idx === 0
                          ? "#EF4444"
                          : idx === 1
                          ? "#3B82F6"
                          : idx === 2
                          ? "#10B981"
                          : "#8B5CF6",
                    }}
                  />
                  <div>
                    <div className="text-sm font-medium text-arena-text">
                      {agent.agentName}
                    </div>
                    <div className="text-xs text-arena-muted">
                      {t.common.by} {agent.username}
                    </div>
                  </div>
                </div>
                <div className="text-right">
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
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          {match.status === "completed" && match.winnerId && (
            <div className="mt-3 p-3 bg-arena-primary/10 border border-arena-primary/30 rounded-lg">
              <div className="text-xs text-arena-muted mb-1">{t.common.winner}</div>
              <div className="text-sm font-semibold text-arena-primary">
                {match.agents.find((a) => a.agentId === match.winnerId)
                  ?.agentName || "Unknown"}
              </div>
              {match.result && (
                <div className="text-xs text-arena-muted mt-1">
                  {match.result}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Move History */}
        <div className="bg-arena-card border border-arena-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-arena-text mb-3">
            {t.matchViewer.moveHistory}
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
            {loadingMoves ? (
              <div className="text-center text-sm text-arena-muted py-4">
                {t.matchViewer.loadingMoves}
              </div>
            ) : moves.length === 0 ? (
              <div className="text-center text-sm text-arena-muted py-4">
                {t.matchViewer.noMoves}
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
          <h3 className="text-sm font-semibold text-arena-text mb-3">{t.matchViewer.details}</h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-arena-muted">{t.matchViewer.matchId}</dt>
              <dd className="text-arena-text font-mono">{match.id.slice(0, 12)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-arena-muted">{t.common.gameType}</dt>
              <dd className="text-arena-text capitalize">{match.gameType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-arena-muted">{t.common.created}</dt>
              <dd className="text-arena-text">{formatDate(match.createdAt)}</dd>
            </div>
            {match.completedAt && (
              <div className="flex justify-between">
                <dt className="text-arena-muted">{t.common.completed}</dt>
                <dd className="text-arena-text">{formatDate(match.completedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
