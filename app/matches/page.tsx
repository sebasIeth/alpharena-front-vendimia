"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatRelativeTime, normalizeMatchAgents } from "@/lib/utils";
import type { Match, MatchAgent, Chain } from "@/lib/types";

type Tab = "all" | "active" | "completed";
type SortKey = "newest" | "oldest" | "highestStake";

const PLAYER_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];
const PLAYER_GRADIENTS = [
  "from-red-500 to-red-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
];

/* ── SVG Icons ── */
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconTrophy({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a18.991 18.991 0 01-4.27.492 18.99 18.99 0 01-4.27-.493" />
    </svg>
  );
}
function IconArrowRight({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function IconCrown({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
      <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
    </svg>
  );
}
function IconRefresh({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}
function IconSort({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6m-6 4h10m-10 4h14" />
    </svg>
  );
}

/* ── Skeleton Card ── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="match-card-enhanced p-5 h-full opacity-0 animate-fade-up"
      style={{ animationDelay: `${0.05 + index * 0.04}s`, animationFillMode: "both" }}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="skeleton w-16 h-5" />
        </div>
        <div className="skeleton w-20 h-5" />
      </div>

      {/* VS section skeleton */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {/* Agent A */}
        <div className="flex-1 flex flex-col items-center">
          <div className="skeleton w-11 h-11 !rounded-xl mb-1.5" />
          <div className="skeleton w-20 h-4 mb-1" />
          <div className="skeleton w-12 h-3" />
        </div>
        {/* VS */}
        <div className="shrink-0 pt-3">
          <div className="skeleton w-9 h-9 !rounded-full" />
        </div>
        {/* Agent B */}
        <div className="flex-1 flex flex-col items-center">
          <div className="skeleton w-11 h-11 !rounded-xl mb-1.5" />
          <div className="skeleton w-20 h-4 mb-1" />
          <div className="skeleton w-12 h-3" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="pt-3 border-t border-arena-border-light/60 flex items-center justify-between">
        <div className="skeleton w-32 h-3" />
        <div className="skeleton w-16 h-3" />
      </div>
    </div>
  );
}

/* ── Agent Column in VS Card ── */
function AgentColumn({
  agent,
  color,
  gradient,
  isWinner,
  isDraw,
}: {
  agent: MatchAgent;
  color: string;
  gradient: string;
  isWinner: boolean;
  isDraw: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center min-w-0">
      {/* Avatar with optional crown */}
      <div className="relative mb-1.5">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
          style={{ boxShadow: `0 3px 10px ${color}35, inset 0 1px 0 rgba(255,255,255,0.25)` }}
        >
          <span className="text-sm font-bold text-white drop-shadow-sm">
            {agent.agentName.charAt(0).toUpperCase()}
          </span>
        </div>
        {isWinner && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-arena-accent flex items-center justify-center shadow-sm">
            <IconCrown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm font-semibold text-arena-text-bright truncate max-w-full leading-tight">
        {agent.agentName}
      </span>

      {/* Username */}
      {agent.username && (
        <span className="text-[10px] text-arena-muted truncate max-w-full leading-tight">
          by {agent.username}
        </span>
      )}

      {/* ELO + change */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px] text-arena-muted font-mono">{agent.eloAtStart}</span>
        {agent.eloChange !== undefined && agent.eloChange !== null && agent.eloChange !== 0 && (
          <span className={`text-[11px] font-semibold font-mono ${
            agent.eloChange > 0 ? "text-arena-success" : "text-arena-danger"
          }`}>
            {agent.eloChange > 0 ? "+" : ""}{agent.eloChange}
          </span>
        )}
        {isDraw && agent.eloChange === 0 && (
          <span className="text-[11px] font-mono text-arena-muted">±0</span>
        )}
      </div>
    </div>
  );
}

/* ── Match Card ── */
function MatchCard({ match, index }: { match: Match; index: number }) {
  const { t } = useLanguage();
  const agents = normalizeMatchAgents(match.agents);
  const isActive = match.status === "active";
  const isCompleted = match.status === "completed";
  const sideMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  const isDraw = isCompleted && !match.winnerId;
  const winnerAgent = isCompleted && match.winnerId
    ? agents.find((a) => a.agentId === match.winnerId)
      ?? (match.winnerId in sideMap ? agents[sideMap[match.winnerId]] : null)
    : null;
  const pot = match.pot ?? (match as any).potAmount ?? 0;

  return (
    <Link href={`/matches/${match.id}`}>
      <div
        className={`group match-card-enhanced match-card-enhanced--${match.status} p-5 h-full opacity-0 animate-fade-up ${
          isActive ? "live-card-border" : ""
        }`}
        style={{ animationDelay: `${0.05 + index * 0.04}s`, animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-arena-primary capitalize font-medium font-mono bg-arena-primary/5 px-2 py-0.5 rounded">
              {match.gameType}
            </span>
            {match.chain && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                match.chain === "celo"
                  ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
                  : "bg-blue-50 text-blue-600 border border-blue-200"
              }`}>
                {match.chain === "celo" ? "Celo" : "Base"}
              </span>
            )}
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
          <div className="flex items-center gap-2">
            <Badge status={match.status} />
          </div>
        </div>

        {/* VS Section - Centered Layout */}
        {agents.length >= 2 ? (
          <div className="flex items-start justify-between gap-2 mb-4">
            <AgentColumn
              agent={agents[0]}
              color={PLAYER_COLORS[0]}
              gradient={PLAYER_GRADIENTS[0]}
              isWinner={winnerAgent?.agentId === agents[0].agentId}
              isDraw={isDraw}
            />

            {/* VS Divider */}
            <div className="shrink-0 flex flex-col items-center pt-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                isActive
                  ? "bg-arena-success/10 border-arena-success/30"
                  : "bg-arena-bg border-arena-border-light"
              }`}>
                <span className={`text-[10px] font-extrabold tracking-wider ${
                  isActive ? "text-arena-success" : "text-arena-muted"
                }`}>
                  VS
                </span>
              </div>
            </div>

            <AgentColumn
              agent={agents[1]}
              color={PLAYER_COLORS[1]}
              gradient={PLAYER_GRADIENTS[1]}
              isWinner={winnerAgent?.agentId === agents[1].agentId}
              isDraw={isDraw}
            />
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

        {/* Winner / Draw Banner */}
        {isCompleted && (
          winnerAgent ? (
            <div className="bg-arena-accent/8 border border-arena-accent/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <IconCrown className="w-3.5 h-3.5 text-arena-accent shrink-0" />
              <span className="text-xs text-arena-accent font-semibold truncate">
                {winnerAgent.agentName}
              </span>
              <span className="text-[10px] text-arena-accent/70 font-medium uppercase tracking-wider ml-auto">
                {t.common.winner}
              </span>
            </div>
          ) : (
            <div className="bg-arena-muted/8 border border-arena-muted/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <span className="text-xs text-arena-muted font-semibold">
                {t.matchesList.draw}
              </span>
            </div>
          )
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-arena-border-light/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-arena-muted font-mono">
            <span>{match.stakeAmount} ALPHA</span>
            <span className="text-arena-border-light/80">·</span>
            <span>{t.common.pot} {pot}</span>
            {match.moveCount > 0 && (
              <>
                <span className="text-arena-border-light/80">·</span>
                <span>{match.moveCount} {(match.gameType === "poker" ? t.common.hands : t.common.moves).toLowerCase()}</span>
              </>
            )}
          </div>

          {isActive ? (
            <span className="flex items-center gap-1 text-xs font-medium text-arena-primary group-hover:gap-1.5 transition-all">
              {t.matchesList.watchMatch}
              <IconArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          ) : (
            <span className="text-[10px] text-arena-muted">
              {formatRelativeTime(match.createdAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Sort Helper ── */
function sortMatches(matches: Match[], sortKey: SortKey): Match[] {
  const sorted = [...matches];
  switch (sortKey) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case "highestStake":
      return sorted.sort((a, b) => (b.stakeAmount || 0) - (a.stakeAmount || 0));
    default:
      return sorted;
  }
}

export default function MatchesPage() {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = 12;

  const tabLabels: Record<Tab, string> = {
    all: t.matchesList.all,
    active: t.matchesList.active,
    completed: t.matchesList.completed,
  };

  const sortLabels: Record<SortKey, string> = {
    newest: t.matchesList.newest,
    oldest: t.matchesList.oldest,
    highestStake: t.matchesList.highestStake,
  };

  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError("");
    try {
      const statusParam = tab === "all" ? undefined : tab;
      const data = await api.getMatches({
        status: statusParam,
        page,
        limit,
      });
      setMatches((data.matches || []).map((m) => {
        const raw = m as any;
        return {
          ...m,
          id: m.id || raw._id,
          winnerId: m.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || undefined,
        };
      }));
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : t.matchesList.loadFailed);
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [tab, page, t.matchesList.loadFailed]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Auto-refresh every 15s when not on completed tab
  useEffect(() => {
    if (tab === "completed") {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }
    refreshTimerRef.current = setInterval(() => {
      fetchMatches(true);
    }, 15000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [tab, fetchMatches]);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  const activeMatches = matches.filter((m) => m.status === "active");
  const otherMatches = tab === "all"
    ? matches.filter((m) => m.status !== "active")
    : matches;

  const sortedActiveMatches = sortMatches(activeMatches, sortKey);
  const sortedOtherMatches = sortMatches(otherMatches, sortKey);

  // Pagination info
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div className="page-container">

      {/* ── Hero Banner ── */}
      <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        {/* Gradient orbs */}
        <div className="dash-hero-orb w-56 h-56 bg-arena-primary/10 -top-24 -right-14 animate-pulse-soft" />
        <div className="dash-hero-orb w-40 h-40 bg-arena-accent/8 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />
        <div className="dash-hero-orb w-24 h-24 bg-arena-success/6 top-4 left-1/3 animate-pulse-soft" style={{ animationDelay: "3.5s" }} />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright leading-tight">
                {t.matchesList.title}
              </h1>
              <p className="text-sm text-arena-muted mt-1">
                {t.matchesList.subtitle}
              </p>
            </div>
            <Link href="/matchmaking">
              <Button>
                <span className="flex items-center gap-2">
                  <IconBolt className="w-4 h-4" />
                  {t.matchmaking.joinQueue}
                </span>
              </Button>
            </Link>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
                <IconTrophy className="w-3.5 h-3.5 text-arena-primary" />
              </div>
              <div>
                <span className="text-lg font-extrabold font-mono tabular-nums text-arena-text-bright leading-none">{totalCount}</span>
                <span className="text-[10px] text-arena-muted uppercase tracking-wider font-semibold ml-1.5">{t.common.matches}</span>
              </div>
            </div>
            {activeMatches.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-arena-success/5 border border-arena-success/20 rounded-xl">
                <span className="relative w-2.5 h-2.5">
                  <span className="absolute inset-0 rounded-full bg-arena-success" />
                  <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-50" />
                </span>
                <span className="text-sm font-semibold text-arena-success font-mono">
                  {activeMatches.length} {t.common.live}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs + Sort + Auto-refresh indicator ── */}
      <div
        className="flex items-center gap-3 mb-6 flex-wrap opacity-0 animate-fade-up relative z-30"
        style={{ animationDelay: "0.06s", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-1 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
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

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-arena-muted hover:text-arena-text bg-white border border-arena-border-light rounded-lg transition-all hover:border-arena-primary/30 shadow-arena-sm"
          >
            <IconSort className="w-3.5 h-3.5" />
            <span>{sortLabels[sortKey]}</span>
            <svg className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-arena-border-light rounded-lg shadow-arena-lg z-20 min-w-[150px] overflow-hidden">
              {(["newest", "oldest", "highestStake"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setSortKey(key); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    sortKey === key
                      ? "bg-arena-primary/5 text-arena-primary"
                      : "text-arena-muted hover:bg-arena-bg hover:text-arena-text"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto-refresh indicator */}
        {tab !== "completed" && (
          <div className={`flex items-center gap-1.5 text-[10px] text-arena-muted font-mono transition-opacity ${
            isRefreshing ? "opacity-100" : "opacity-50"
          }`}>
            <IconRefresh className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{t.matchesList.autoUpdating}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        /* ── Skeleton Loading ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        /* ── Empty State ── */
        <div className="dash-glass-card rounded-2xl">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
              <IconBolt className="w-8 h-8 text-arena-primary" />
            </div>
            <p className="text-arena-text-bright font-semibold mb-1 font-display">{t.matchesList.noMatchesFound}</p>
            <p className="text-sm text-arena-muted mb-6 max-w-xs mx-auto">
              {tab === "active"
                ? t.matchesList.noActive
                : tab === "completed"
                ? t.matchesList.noCompleted
                : t.matchesList.noMatches}
            </p>
            <Link href="/matchmaking">
              <Button variant="secondary" size="sm">
                <span className="flex items-center gap-2">
                  <IconBolt className="w-4 h-4" />
                  {t.matchmaking.joinQueue}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Live Now Section ── */}
          {tab === "all" && sortedActiveMatches.length > 0 && (
            <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="relative w-3 h-3">
                  <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                  <span className="relative block w-3 h-3 bg-arena-success rounded-full" />
                </span>
                <h2 className="text-lg font-display font-bold text-arena-text-bright">
                  {t.matchesList.liveNow}
                </h2>
                <span className="text-xs text-arena-success font-mono font-semibold bg-arena-success/10 px-2 py-0.5 rounded-full">
                  {sortedActiveMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedActiveMatches.map((match, i) => (
                  <MatchCard key={match.id} match={match} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Pagination Info ── */}
          {totalCount > 0 && (
            <div
              className="flex items-center justify-between mb-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.12s", animationFillMode: "both" }}
            >
              <p className="text-xs text-arena-muted font-mono">
                {t.matchesList.showing} {startItem}–{endItem} {t.matchesList.ofTotal} {totalCount} {t.matchesList.results}
              </p>
            </div>
          )}

          {/* ── Match Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {(tab === "all" ? sortedOtherMatches : sortMatches(matches, sortKey)).map((match, i) => (
              <MatchCard key={match.id} match={match} index={i + (tab === "all" ? sortedActiveMatches.length : 0)} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-center gap-2 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.3s", animationFillMode: "both" }}
            >
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
