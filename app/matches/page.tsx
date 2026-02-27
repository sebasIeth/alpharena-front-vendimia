"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatRelativeTime, normalizeMatchAgents } from "@/lib/utils";
import type { Match, MatchAgent } from "@/lib/types";

type Tab = "all" | "active" | "completed";

const PLAYER_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];

/* ── VS Match Card ── */
function MatchCard({ match }: { match: Match }) {
  const { t } = useLanguage();
  const agents = normalizeMatchAgents(match.agents);
  const isActive = match.status === "active";
  const isCompleted = match.status === "completed";
  const winnerAgent = isCompleted && match.winnerId
    ? agents.find((a) => a.agentId === match.winnerId)
    : null;

  return (
    <Link href={`/matches/${match.id}`}>
      <div className={`bg-white border rounded-xl p-5 h-full transition-all duration-200 hover:shadow-arena-lg hover:-translate-y-0.5 ${
        isActive ? "live-card-border border-arena-success/30" : "border-arena-border-light hover:border-arena-primary/30"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-arena-primary capitalize font-medium font-mono bg-arena-primary/5 px-2 py-0.5 rounded">
            {match.gameType}
          </span>
          <div className="flex items-center gap-2">
            <Badge status={match.status} />
            {isActive && (
              <span className="flex items-center gap-1.5 text-[10px] text-arena-success font-semibold uppercase tracking-wider">
                <span className="relative w-2 h-2">
                  <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                  <span className="relative block w-2 h-2 bg-arena-success rounded-full" />
                </span>
                {t.common.live}
              </span>
            )}
          </div>
        </div>

        {/* VS Layout */}
        {agents.length >= 2 ? (
          <div className="flex items-center gap-2 mb-4">
            {/* Agent 1 */}
            <AgentSide agent={agents[0]} color={PLAYER_COLORS[0]} isWinner={winnerAgent?.agentId === agents[0].agentId} align="left" />

            {/* VS badge */}
            <div className="shrink-0 flex flex-col items-center">
              <span className={`text-[10px] font-extrabold tracking-wider ${
                isActive ? "text-arena-success" : "text-arena-muted"
              }`}>
                {t.matchmaking.vs}
              </span>
            </div>

            {/* Agent 2 */}
            <AgentSide agent={agents[1]} color={PLAYER_COLORS[1]} isWinner={winnerAgent?.agentId === agents[1].agentId} align="right" />
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {agents.map((agent, idx) => (
              <div key={agent.agentId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx] }} />
                  <span className="text-sm text-arena-text truncate max-w-[140px]">{agent.agentName}</span>
                </div>
                <span className="text-xs text-arena-muted font-mono">{agent.eloAtStart}</span>
              </div>
            ))}
          </div>
        )}

        {/* Winner banner */}
        {winnerAgent && (
          <div className="bg-arena-success/10 border border-arena-success/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-arena-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-arena-success font-medium truncate">
              {winnerAgent.agentName}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-arena-border-light/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-arena-muted font-mono">
            <span>{match.stakeAmount} USDC</span>
            <span className="text-arena-border-light">|</span>
            <span>{t.common.pot}: {match.pot ?? (match as any).potAmount ?? 0}</span>
          </div>
          <span className="text-[10px] text-arena-muted">
            {formatRelativeTime(match.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Agent side in VS layout ── */
function AgentSide({
  agent,
  color,
  isWinner,
  align,
}: {
  agent: MatchAgent;
  color: string;
  isWinner: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`flex-1 min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`flex items-center gap-2 mb-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {agent.agentName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-arena-text truncate">
          {agent.agentName}
        </span>
        {isWinner && (
          <svg className="w-3.5 h-3.5 text-arena-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 1l2.39 6.37H19l-5.31 4.15 1.82 6.48L10 13.85 4.49 18l1.82-6.48L1 7.37h6.61L10 1z" />
          </svg>
        )}
      </div>
      <div className={`flex items-center gap-1.5 text-xs text-arena-muted ${align === "right" ? "justify-end" : ""}`}>
        <span className="font-mono">{agent.eloAtStart}</span>
        {agent.eloChange !== undefined && agent.eloChange !== null && (
          <span className={`font-medium font-mono ${
            agent.eloChange > 0 ? "text-arena-success" : agent.eloChange < 0 ? "text-arena-danger" : "text-arena-muted"
          }`}>
            {agent.eloChange > 0 ? "+" : ""}{agent.eloChange}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const tabLabels: Record<Tab, string> = {
    all: t.matchesList.all,
    active: t.matchesList.active,
    completed: t.matchesList.completed,
  };

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
      setMatches((data.matches || []).map((m) => ({
        ...m,
        id: m.id || (m as any)._id,
      })));
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.matchesList.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [tab, page, t.matchesList.loadFailed]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  const activeMatches = matches.filter((m) => m.status === "active");
  const otherMatches = tab === "all"
    ? matches.filter((m) => m.status !== "active")
    : matches;

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">{t.matchesList.title}</h1>
        <p className="text-arena-muted">
          {t.matchesList.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
        {(["all", "active", "completed"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => handleTabChange(tabKey)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === tabKey
                ? "bg-arena-primary text-white shadow-arena-sm"
                : "text-arena-muted hover:text-arena-text"
            }`}
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : matches.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-arena-muted">
            <p className="text-lg mb-2">{t.matchesList.noMatchesFound}</p>
            <p className="text-sm">
              {tab === "active"
                ? t.matchesList.noActive
                : tab === "completed"
                ? t.matchesList.noCompleted
                : t.matchesList.noMatches}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Live Now Section ── */}
          {tab === "all" && activeMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative w-2.5 h-2.5">
                  <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                  <span className="relative block w-2.5 h-2.5 bg-arena-success rounded-full" />
                </span>
                <h2 className="text-lg font-display font-bold text-arena-text">
                  {t.matchesList.liveNow}
                </h2>
                <span className="text-xs text-arena-muted font-mono">
                  ({activeMatches.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* ── Match Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {(tab === "all" ? otherMatches : matches).map((match) => (
              <MatchCard key={match.id} match={match} />
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
                {t.common.previous}
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
                {t.common.next}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
