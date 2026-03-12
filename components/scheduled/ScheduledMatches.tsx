"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import type { ScheduledMatchResponse } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import MatchCard from "./MatchCard";

/* ══════════════════════════════════════════════════════════
   FILTER TABS
   ══════════════════════════════════════════════════════════ */
type FilterTab = "all" | "chess" | "poker" | "live";

const TABS: { key: FilterTab; label: string; icon?: string }[] = [
  { key: "all", label: "All" },
  { key: "chess", label: "Chess", icon: "\u265F" },
  { key: "poker", label: "Poker", icon: "\u2660" },
  { key: "live", label: "Live" },
];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
interface ScheduledMatchesProps {
  initialGameType?: string;
}

export default function ScheduledMatches({ initialGameType }: ScheduledMatchesProps) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<ScheduledMatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>(
    initialGameType === "chess" ? "chess" : initialGameType === "poker" ? "poker" : "all"
  );

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.getScheduledMatches();
      setMatches(res.matches || []);
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
    m.status === "starting" || (!!m.matchId && m.status !== "completed" && m.status !== "cancelled");

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      // Hide cancelled
      if (m.status === "cancelled") return false;
      if (activeTab === "live") return isMatchLive(m);
      if (activeTab === "chess") return m.gameType === "chess";
      if (activeTab === "poker") return m.gameType === "poker";
      return true;
    });
  }, [matches, activeTab]);

  const liveCount = useMemo(
    () => matches.filter(isMatchLive).length,
    [matches]
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

      {/* ── Match cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-arena-muted text-sm">
          {t.betting.noScheduledMatches}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          {filtered.map((match, i) => (
            <MatchCard key={match._id} match={match} delay={0.2 + i * 0.06} />
          ))}
        </div>
      )}
    </section>
  );
}
