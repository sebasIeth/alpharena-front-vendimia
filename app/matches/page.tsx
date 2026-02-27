"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatRelativeTime, normalizeMatchAgents } from "@/lib/utils";
import type { Match } from "@/lib/types";

type Tab = "all" | "active" | "completed";

const AGENT_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];

/* ── Inline SVG icons ────────────────────────────────── */

function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
  );
}

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ── VS badge for 2-player matches ───────────────────── */

function VsSection({ agents }: { agents: ReturnType<typeof normalizeMatchAgents> }) {
  if (agents.length === 2) {
    return (
      <div className="flex items-center justify-between gap-2 py-4 px-2">
        {/* Player 1 */}
        <div className="flex-1 text-center min-w-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: AGENT_COLORS[0] }}
            />
            <span className="text-sm font-medium text-arena-text truncate max-w-[120px]">
              {agents[0].agentName}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-mono text-arena-muted">
              {agents[0].eloAtStart}
            </span>
            {agents[0].eloChange != null && agents[0].eloChange !== 0 && (
              <span
                className={`text-xs font-mono font-medium ${
                  agents[0].eloChange > 0
                    ? "text-arena-success"
                    : "text-arena-accent"
                }`}
              >
                {agents[0].eloChange > 0 ? "▲" : "▼"}
                {agents[0].eloChange > 0 ? "+" : ""}
                {agents[0].eloChange}
              </span>
            )}
          </div>
        </div>

        {/* VS */}
        <div className="shrink-0 flex items-center justify-center">
          <span className="text-lg font-bold text-arena-primary/60 font-display tracking-wider">
            VS
          </span>
        </div>

        {/* Player 2 */}
        <div className="flex-1 text-center min-w-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-sm font-medium text-arena-text truncate max-w-[120px]">
              {agents[1].agentName}
            </span>
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: AGENT_COLORS[1] }}
            />
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs font-mono text-arena-muted">
              {agents[1].eloAtStart}
            </span>
            {agents[1].eloChange != null && agents[1].eloChange !== 0 && (
              <span
                className={`text-xs font-mono font-medium ${
                  agents[1].eloChange > 0
                    ? "text-arena-success"
                    : "text-arena-accent"
                }`}
              >
                {agents[1].eloChange > 0 ? "▲" : "▼"}
                {agents[1].eloChange > 0 ? "+" : ""}
                {agents[1].eloChange}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* 4-player grid (Marrakech-style) */
  return (
    <div className="relative py-4 px-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {agents.map((agent, idx) => (
          <div key={agent.agentId} className="text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: AGENT_COLORS[idx] }}
              />
              <span className="text-sm font-medium text-arena-text truncate max-w-[100px]">
                {agent.agentName}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-mono text-arena-muted">
                {agent.eloAtStart}
              </span>
              {agent.eloChange != null && agent.eloChange !== 0 && (
                <span
                  className={`text-xs font-mono font-medium ${
                    agent.eloChange > 0
                      ? "text-arena-success"
                      : "text-arena-accent"
                  }`}
                >
                  {agent.eloChange > 0 ? "▲" : "▼"}
                  {agent.eloChange > 0 ? "+" : ""}
                  {agent.eloChange}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Central VS overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-bold text-arena-primary/40 font-display tracking-wider">
          ⚔ VS ⚔
        </span>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────── */

export default function MatchesPage() {
  const { t } = useLanguage();
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
      setMatches(
        (data.matches || []).map((m) => ({
          ...m,
          id: m.id || (m as any)._id,
        }))
      );
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.matchesList.loadFailed
      );
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

  /* Count helpers for tab badges */
  const counts = useMemo(() => {
    const active = matches.filter((m) => m.status === "active").length;
    const completed = matches.filter((m) => m.status === "completed").length;
    return { all: matches.length, active, completed };
  }, [matches]);

  const tabLabels: Record<Tab, string> = {
    all: t.matchesList.all,
    active: t.matchesList.active,
    completed: t.matchesList.completed,
  };

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <SwordsIcon className="w-7 h-7 text-arena-primary" />
            <h1 className="page-title mb-0">{t.matchesList.title}</h1>
            <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-arena-primary/10 text-arena-primary">
              {matches.length}
            </span>
          </div>
          <p className="text-arena-muted">{t.matchesList.subtitle}</p>
        </div>
      </div>

      {/* ── Tabs with counters ─────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
        {(["all", "active", "completed"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => handleTabChange(tabKey)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              tab === tabKey
                ? "bg-arena-primary text-white shadow-arena-sm"
                : "text-arena-muted hover:text-arena-text"
            }`}
          >
            {/* Pulsing green dot for Active tab when matches exist */}
            {tabKey === "active" && counts.active > 0 && (
              <span className="relative w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-75" />
                <span className="relative block w-2 h-2 rounded-full bg-arena-success" />
              </span>
            )}
            {tabLabels[tabKey]}
            <span
              className={`text-[10px] rounded-full px-1.5 py-px font-semibold ${
                tab === tabKey
                  ? "bg-white/20 text-white"
                  : "bg-arena-border/40 text-arena-muted"
              }`}
            >
              {counts[tabKey]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Error ──────────────────────────────────── */}
      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <PageSpinner />
      ) : matches.length === 0 ? (
        /* ── Empty state ─────────────────────────── */
        <div className="flex flex-col items-center justify-center py-20">
          <SwordsIcon className="w-16 h-16 text-arena-muted/30 mb-4" />
          <p className="text-lg font-medium text-arena-text mb-1">
            {t.matchesList.noMatchesFound}
          </p>
          <p className="text-sm text-arena-muted mb-6">
            {tab === "active"
              ? t.matchesList.noActive
              : tab === "completed"
              ? t.matchesList.noCompleted
              : t.matchesList.noMatches}
          </p>
          <Link href="/matchmaking">
            <Button variant="primary" size="sm">
              {t.matchesList.title}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── Match Grid ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {matches.map((match) => {
              const agents = normalizeMatchAgents(match.agents);
              const winnerAgent = match.winnerId
                ? agents.find((a) => a.agentId === match.winnerId)
                : null;
              const statusModifier =
                match.status === "active"
                  ? "match-card--active"
                  : match.status === "completed"
                  ? "match-card--completed"
                  : match.status === "pending"
                  ? "match-card--pending"
                  : match.status === "cancelled" || match.status === "error"
                  ? "match-card--cancelled"
                  : "match-card--pending";

              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className={`match-card h-full ${statusModifier}`}>
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <BoardIcon className="w-4 h-4 text-arena-primary" />
                        <span className="text-sm text-arena-primary capitalize font-medium">
                          {match.gameType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={match.status} />
                        {match.status === "active" && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-arena-success">
                            <span className="relative w-2 h-2">
                              <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-75" />
                              <span className="relative block w-2 h-2 rounded-full bg-arena-success" />
                            </span>
                            {t.common.live}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* VS section */}
                    <div className="px-2">
                      <VsSection agents={agents} />
                    </div>

                    {/* Winner banner */}
                    {match.status === "completed" && winnerAgent && (
                      <div className="mx-4 mb-3 flex items-center gap-2 bg-gradient-to-r from-arena-success/10 to-arena-success/5 rounded-lg px-3 py-1.5">
                        <TrophyIcon className="w-4 h-4 text-arena-success shrink-0" />
                        <span className="text-xs font-medium text-arena-success truncate">
                          {t.common.winner}: {winnerAgent.agentName}
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="px-4 pb-4 pt-2 border-t border-arena-border/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-arena-muted">
                        <CoinIcon className="w-3.5 h-3.5" />
                        <span>
                          {match.stakeAmount} / {match.pot ?? (match as any).potAmount ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-arena-muted">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(match.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Pagination ─────────────────────────── */}
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
