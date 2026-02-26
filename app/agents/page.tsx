"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatWinRate, formatElo, formatRelativeTime } from "@/lib/utils";
import type { Agent } from "@/lib/types";

/* ── Win/Loss/Draw proportional bar ── */
function WLDBar({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws;
  if (total === 0) {
    return (
      <div className="w-full h-1.5 rounded-full bg-arena-border-light/60" />
    );
  }
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-arena-border-light/40">
      {wPct > 0 && (
        <div
          className="h-full bg-arena-success transition-all duration-500"
          style={{ width: `${wPct}%` }}
        />
      )}
      {dPct > 0 && (
        <div
          className="h-full bg-arena-muted-light transition-all duration-500"
          style={{ width: `${dPct}%` }}
        />
      )}
      {lPct > 0 && (
        <div
          className="h-full bg-arena-danger/70 transition-all duration-500"
          style={{ width: `${lPct}%` }}
        />
      )}
    </div>
  );
}

/* ── Summary stat mini card ── */
function SummaryStat({
  label,
  value,
  accent,
  delay,
}: {
  label: string;
  value: string;
  accent?: string;
  delay: number;
}) {
  return (
    <div
      className="bg-white border border-arena-border-light rounded-xl px-5 py-4 shadow-arena-sm opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-xs text-arena-muted uppercase tracking-wider font-mono mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${accent || "text-arena-text"}`}>
        {value}
      </div>
    </div>
  );
}

/* ── Agent card ── */
function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const router = useRouter();
  const { t } = useLanguage();
  const wins = agent.stats?.wins || 0;
  const losses = agent.stats?.losses || 0;
  const draws = agent.stats?.draws || 0;
  const totalMatches = wins + losses + draws;

  return (
    <div
      className="agent-card cursor-pointer opacity-0 animate-fade-up"
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
      onClick={() => router.push(`/agents/${agent.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-arena-text truncate text-lg">
              {agent.name}
            </h3>
            {agent.type === "openclaw" && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 rounded">
                OC
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={agent.status} />
            {agent.gameTypes.map((gt) => (
              <span
                key={gt}
                className="px-1.5 py-0.5 text-[10px] bg-arena-primary/5 text-arena-primary rounded capitalize font-mono"
              >
                {gt}
              </span>
            ))}
          </div>
        </div>

        {/* ELO highlight */}
        <div className="text-right shrink-0 ml-3">
          <div className="text-2xl font-bold font-mono text-arena-primary tabular-nums leading-none">
            {formatElo(agent.elo)}
          </div>
          <div className="text-[10px] text-arena-muted uppercase tracking-widest mt-0.5">
            {t.common.elo}
          </div>
        </div>
      </div>

      {/* W/L/D Bar */}
      <div className="mb-4">
        <WLDBar wins={wins} losses={losses} draws={draws} />
        <div className="flex items-center justify-between mt-1.5 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="text-arena-success font-medium">{wins}W</span>
            <span className="text-arena-danger/80 font-medium">{losses}L</span>
            <span className="text-arena-muted">{draws}D</span>
          </div>
          <span className="text-arena-muted">{totalMatches} {t.common.matches.toLowerCase()}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-arena-border-light/60">
        <div>
          <div className="text-[10px] text-arena-muted uppercase tracking-wider">{t.common.winRate}</div>
          <div className="text-sm font-semibold text-arena-text font-mono tabular-nums">
            {formatWinRate(agent.stats?.winRate || 0)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-arena-muted uppercase tracking-wider">{t.common.earnings}</div>
          <div className="text-sm font-semibold text-arena-primary font-mono tabular-nums">
            {(agent.stats?.totalEarnings || 0).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentsContent() {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await api.getAgents();
        setAgents(data.agents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.agents.loadFailed);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const summary = useMemo(() => {
    if (agents.length === 0) return null;
    const bestElo = Math.max(...agents.map((a) => a.elo));
    const totalEarnings = agents.reduce(
      (sum, a) => sum + (a.stats?.totalEarnings || 0),
      0
    );
    return { count: agents.length, bestElo, totalEarnings };
  }, [agents]);

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="opacity-0 animate-fade-up">
          <h1 className="page-title">{t.agents.title}</h1>
          <p className="text-arena-muted">{t.agents.subtitle}</p>
        </div>
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <Link href="/agents/new">
            <Button size="lg">{t.agents.createAgent}</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        /* ── Empty State ── */
        <Card className="opacity-0 animate-scale-in">
          <div className="text-center py-16">
            <div className="text-5xl mb-4 animate-float inline-block">&#129302;</div>
            <h3 className="text-xl font-display font-semibold text-arena-text mb-2">
              {t.agents.noAgentsTitle}
            </h3>
            <p className="text-arena-muted mb-8 max-w-md mx-auto leading-relaxed">
              {t.agents.noAgentsDesc}
            </p>
            <Link href="/agents/new">
              <Button size="lg">{t.agents.createFirst}</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* ── Summary Stats ── */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <SummaryStat
                label={t.common.agents}
                value={summary.count.toString()}
                delay={0.05}
              />
              <SummaryStat
                label={`${t.common.elo} ${t.common.winRate.split(" ")[0] === "Win" ? "Best" : "Top"}`}
                value={formatElo(summary.bestElo)}
                accent="text-arena-primary"
                delay={0.1}
              />
              <SummaryStat
                label={t.common.earnings}
                value={summary.totalEarnings.toFixed(2)}
                accent="text-arena-accent"
                delay={0.15}
              />
            </div>
          )}

          {/* ── Agent Cards Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <AuthGuard>
      <AgentsContent />
    </AuthGuard>
  );
}
