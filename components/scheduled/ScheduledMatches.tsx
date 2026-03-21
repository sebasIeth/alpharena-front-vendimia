"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import type { ScheduledMatchResponse } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { normalizeMatchAgents } from "@/lib/utils";
import MatchCard from "./MatchCard";

/* ══════════════════════════════════════════════════════════
   FILTER TABS & SORT OPTIONS
   ══════════════════════════════════════════════════════════ */
type FilterTab = "all" | "chess" | "poker" | "live";
type SortOption = "mostBets" | "mostViewers" | "soonest";

const TABS: { key: FilterTab; label: string; icon?: string }[] = [
  { key: "all", label: "All" },
  { key: "chess", label: "Chess", icon: "\u265F" },
  { key: "poker", label: "Poker", icon: "\u2660" },
  { key: "live", label: "Live" },
];

const SORT_ICONS: Record<SortOption, React.ReactNode> = {
  mostBets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  mostViewers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  soonest: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "mostBets", label: "Most Bets" },
  { key: "mostViewers", label: "Most Viewers" },
  { key: "soonest", label: "Soonest" },
];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
interface ScheduledMatchesProps {
  initialGameType?: string;
}

const ITEMS_PER_PAGE = 6;

export default function ScheduledMatches({ initialGameType }: ScheduledMatchesProps) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<ScheduledMatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>(
    initialGameType === "chess" ? "chess" : initialGameType === "poker" ? "poker" : "all"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("mostBets");
  const [poolTotals, setPoolTotals] = useState<Record<string, number>>({});

  const fetchMatches = useCallback(async () => {
    try {
      const [scheduledRes, activeRes] = await Promise.all([
        api.getScheduledMatches(),
        api.getActiveMatches().catch(() => ({ matches: [] })),
      ]);

      const scheduled = scheduledRes.matches || [];

      // Deduplicate: skip active matches that already have a ScheduledMatch entry
      const scheduledMatchIds = new Set(
        scheduled.map((m) => m.matchId).filter(Boolean)
      );

      // Transform active Match[] → ScheduledMatchResponse[] so MatchCard can render them
      const activeAsScheduled: ScheduledMatchResponse[] = (activeRes.matches || [])
        .filter((m) => {
          const mid = m.id || (m as any)._id;
          return mid && !scheduledMatchIds.has(mid);
        })
        .map((m) => {
          const mid = m.id || (m as any)._id;
          const agents = normalizeMatchAgents(m.agents, m.pokerPlayers);
          return {
            _id: mid,
            gameType: m.gameType,
            scheduledAt: m.createdAt,
            status: m.status === "active" ? "starting" as const : m.status as ScheduledMatchResponse["status"],
            stakeAmount: m.stakeAmount,
            agents: agents.map((a, i) => ({
              agentId: a.agentId,
              userId: a.userId,
              name: a.agentName,
              elo: a.eloAtStart,
              color: ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6"][i] || "#8B5CF6",
            })),
            matchId: mid,
            createdBy: "",
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          };
        });

      const allMatches = [...scheduled, ...activeAsScheduled];
      setMatches(allMatches);
      api.getMatchViewers().then(setViewerCounts).catch(() => {});

      // Fetch betting pool totals sequentially to avoid 429 rate limiting
      const matchIds = allMatches.map((m) => m.matchId).filter(Boolean) as string[];
      if (matchIds.length > 0) {
        const totals: Record<string, number> = {};
        for (const mid of matchIds) {
          try {
            const res = await api.getBettingPool(mid);
            totals[mid] = Number(res.pool?.totalPool ?? 0);
          } catch { totals[mid] = 0; }
        }
        setPoolTotals(totals);
      }
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const isMatchLive = (m: ScheduledMatchResponse) =>
    m.status === "starting" || (!!m.matchId && !["pending", "completed", "cancelled"].includes(m.status));

  const filtered = useMemo(() => {
    const list = matches.filter((m) => {
      if (m.status === "cancelled") return false;
      if (activeTab === "live") return isMatchLive(m);
      if (activeTab === "chess") return m.gameType === "chess";
      if (activeTab === "poker") return m.gameType === "poker";
      return true;
    });

    // Sort
    return list.sort((a, b) => {
      if (sortBy === "mostBets") {
        const poolA = a.matchId ? (poolTotals[a.matchId] ?? 0) : 0;
        const poolB = b.matchId ? (poolTotals[b.matchId] ?? 0) : 0;
        return poolB - poolA;
      }
      if (sortBy === "mostViewers") {
        const viewA = a.matchId ? (viewerCounts[a.matchId] ?? 0) : 0;
        const viewB = b.matchId ? (viewerCounts[b.matchId] ?? 0) : 0;
        return viewB - viewA;
      }
      // soonest
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }, [matches, activeTab, sortBy, poolTotals, viewerCounts]);

  const liveCount = useMemo(
    () => matches.filter(isMatchLive).length,
    [matches]
  );

  // Reset page when tab or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedMatches = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <section className="opacity-0 animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          <span className="ml-3 text-sm text-arena-muted">{t.betting.loading}</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="opacity-0 animate-fade-up"
      style={{ animationDelay: "0.15s", animationFillMode: "both" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-arena-text-bright tracking-tight">
          {t.betting.scheduledMatches}
        </h2>
        <span className="text-[10px] font-mono text-arena-muted uppercase tracking-widest">
          {matches.filter((m) => m.status !== "cancelled").length} {t.betting.scheduled}
        </span>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-black/[0.04] rounded-lg w-fit overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200 whitespace-nowrap shrink-0
                ${
                  isActive
                    ? "bg-arena-text-bright text-white shadow-sm"
                    : "text-arena-muted hover:text-arena-text"
                }
              `}
            >
              {tab.icon && <span className="text-[11px]">{tab.icon}</span>}
              {tab.label}
              {tab.key === "live" && (
                <span className="relative flex items-center ml-0.5">
                  {liveCount > 0 ? (
                    <>
                      <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="absolute inline-flex w-1.5 h-1.5 rounded-full bg-red-500 animate-ping opacity-60" />
                    </>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-arena-muted/30" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sort buttons ── */}
      <div className="flex items-center gap-1.5 mb-6">
        <span className="text-[10px] font-mono text-arena-muted uppercase tracking-wider mr-1">Sort:</span>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border transition-all duration-200
                ${
                  isActive
                    ? "bg-arena-primary/10 text-arena-primary border-arena-primary/30 shadow-sm"
                    : "bg-white text-arena-muted border-arena-border-light/40 hover:text-arena-text hover:border-arena-primary/20"
                }
              `}
            >
              {SORT_ICONS[opt.key]}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Match cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-arena-muted text-sm">
          {t.betting.noScheduledMatches}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedMatches.map((match, i) => (
              <MatchCard key={match._id} match={match} delay={0.2 + i * 0.06} viewers={match.matchId ? viewerCounts[match.matchId] : undefined} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-arena-border bg-white hover:bg-arena-card-hover text-arena-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                &larr;
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm transition-all ${
                        currentPage === pageNum
                          ? "bg-arena-text-bright text-white font-semibold shadow-sm"
                          : "text-arena-muted hover:text-arena-text hover:bg-black/[0.04]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-arena-border bg-white hover:bg-arena-card-hover text-arena-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
