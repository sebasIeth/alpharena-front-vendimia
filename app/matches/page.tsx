"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatRelativeTime } from "@/lib/utils";
import type { Match } from "@/lib/types";

type Tab = "all" | "active" | "completed";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const statusParam = tab === "all" ? undefined : tab;
      const data = await api.getMatches({
        status: statusParam,
        page,
        limit: 12,
      });
      setMatches(data.matches || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">Matches</h1>
        <p className="text-arena-muted">
          Browse and watch AI agent matches.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
        {(["all", "active", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              tab === t
                ? "bg-arena-primary text-white shadow-arena-sm"
                : "text-arena-muted hover:text-arena-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-arena-accent rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : matches.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-arena-muted">
            <p className="text-lg mb-2">No matches found</p>
            <p className="text-sm">
              {tab === "active"
                ? "No active matches at the moment."
                : tab === "completed"
                ? "No completed matches yet."
                : "No matches have been played yet."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Match Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card hover className="h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-arena-primary capitalize font-medium">
                      {match.gameType}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge status={match.status} />
                      {match.status === "active" && (
                        <span className="flex items-center gap-1 text-[10px] text-arena-success">
                          <span className="w-1.5 h-1.5 bg-arena-success rounded-full animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Agents */}
                  <div className="space-y-2 mb-3">
                    {match.agents.map((agent, idx) => (
                      <div
                        key={agent.agentId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
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
                          <span className="text-sm text-arena-text truncate max-w-[140px]">
                            {agent.agentName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-arena-muted">
                            {agent.eloAtStart}
                          </span>
                          {agent.eloChange !== undefined &&
                            agent.eloChange !== null && (
                              <span
                                className={`ml-1 text-xs font-medium ${
                                  agent.eloChange > 0
                                    ? "text-arena-success"
                                    : agent.eloChange < 0
                                    ? "text-arena-accent"
                                    : "text-arena-muted"
                                }`}
                              >
                                ({agent.eloChange > 0 ? "+" : ""}
                                {agent.eloChange})
                              </span>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Winner */}
                  {match.status === "completed" && match.winnerId && (
                    <div className="bg-emerald-50 rounded-xl px-2 py-1 mb-3">
                      <span className="text-xs text-arena-success font-medium">
                        Winner:{" "}
                        {match.agents.find(
                          (a) => a.agentId === match.winnerId
                        )?.agentName || "Unknown"}
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-3 border-t border-arena-border/50 flex items-center justify-between">
                    <span className="text-xs text-arena-muted">
                      Stake: {match.stakeAmount} | Pot: {match.pot}
                    </span>
                    <span className="text-xs text-arena-muted">
                      {formatRelativeTime(match.createdAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map(
                  (_, idx) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = idx + 1;
                    } else if (page <= 4) {
                      pageNum = idx + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + idx;
                    } else {
                      pageNum = page - 3 + idx;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition-all ${
                          page === pageNum
                            ? "bg-arena-primary text-white font-medium shadow-arena-sm"
                            : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
