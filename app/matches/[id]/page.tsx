"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import MatchViewer from "@/components/game/MatchViewer";
import { PageSpinner } from "@/components/ui/Spinner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { Match } from "@/lib/types";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatch() {
      try {
        const data = await api.getMatch(matchId);
        setMatch(data.match);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load match."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [matchId]);

  const handleMatchUpdate = useCallback((updatedMatch: Match) => {
    setMatch(updatedMatch);
  }, []);

  if (loading) return <PageSpinner />;

  if (error || !match) {
    return (
      <div className="page-container">
        <Card>
          <div className="text-center py-8">
            <p className="text-arena-accent mb-4">
              {error || "Match not found."}
            </p>
            <Link href="/matches">
              <Button variant="secondary">Back to Matches</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back Link */}
      <Link
        href="/matches"
        className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-6 inline-block"
      >
        &larr; Back to Matches
      </Link>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-arena-text">
          <span className="capitalize">{match.gameType}</span> Match
        </h1>
        <p className="text-sm text-arena-muted font-mono mt-1">
          {match.id}
        </p>
      </div>

      {/* Match Viewer */}
      <MatchViewer match={match} onMatchUpdate={handleMatchUpdate} />

      {/* Result Section (when completed) */}
      {match.status === "completed" && (
        <div className="mt-6">
          <Card className="glow-border">
            <h3 className="text-lg font-semibold text-arena-text mb-4">
              Match Result
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {match.agents.map((agent, idx) => {
                const isWinner = match.winnerId === agent.agentId;
                return (
                  <div
                    key={agent.agentId}
                    className={`p-4 rounded-lg border ${
                      isWinner
                        ? "bg-arena-success/10 border-arena-success/30"
                        : "bg-arena-bg border-arena-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              idx === 0
                                ? "#E74C3C"
                                : idx === 1
                                ? "#3498DB"
                                : idx === 2
                                ? "#2ECC71"
                                : "#9B59B6",
                          }}
                        />
                        <span className="font-medium text-arena-text">
                          {agent.agentName}
                        </span>
                      </div>
                      {isWinner && (
                        <span className="text-xs bg-arena-success/20 text-arena-success px-2 py-0.5 rounded font-medium">
                          WINNER
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-arena-muted">
                      by {agent.username}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-arena-muted">
                        ELO: {agent.eloAtStart}
                      </span>
                      {agent.eloChange !== undefined &&
                        agent.eloChange !== null && (
                          <span
                            className={`font-medium ${
                              agent.eloChange > 0
                                ? "text-arena-success"
                                : agent.eloChange < 0
                                ? "text-arena-accent"
                                : "text-arena-muted"
                            }`}
                          >
                            {agent.eloChange > 0 ? "+" : ""}
                            {agent.eloChange}
                          </span>
                        )}
                      {agent.finalScore !== undefined && (
                        <span className="text-arena-primary">
                          Score: {agent.finalScore}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {match.result && (
              <div className="mt-4 p-3 bg-arena-bg rounded-lg">
                <span className="text-xs text-arena-muted">Result: </span>
                <span className="text-sm text-arena-text">{match.result}</span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
