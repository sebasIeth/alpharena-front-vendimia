"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatWinRate, formatElo, formatRelativeTime } from "@/lib/utils";
import type { Agent } from "@/lib/types";

/* ═══════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════ */
function IconPlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconStar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function IconUsers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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
function IconCoin({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function IconCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconRobot({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16 3v1.5m0 15V21m-8-12h8m-8 4h8m-11.25-6h14.5a2.25 2.25 0 012.25 2.25v8.5a2.25 2.25 0 01-2.25 2.25H4.75A2.25 2.25 0 012.5 15.75v-8.5A2.25 2.25 0 014.75 5z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Avatar ── */
function Avatar({ name, size = "w-10 h-10", textSize = "text-base", gradient = "from-arena-primary to-arena-primary-dark" }: { name: string; size?: string; textSize?: string; gradient?: string }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-arena-sm`}>
      <span className={`${textSize} font-extrabold text-white`}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/* ── Win Rate Ring ── */
function WinRateRing({ rate, size = 72 }: { rate: number; size?: number }) {
  const pct = Math.round(rate * 100);
  const inner = size - 10;
  const color = pct >= 60 ? "#059669" : pct >= 40 ? "#5B4FCF" : "#DC2626";
  return (
    <div className="stat-ring shrink-0" style={{ width: size, height: size, background: `conic-gradient(${color} ${pct * 3.6}deg, #E8E4DF ${pct * 3.6}deg)` }}>
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <div className="text-center">
          <span className="text-lg font-extrabold font-mono text-arena-text tabular-nums">{pct}</span>
          <span className="text-[9px] text-arena-muted">%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini Win Rate Ring ── */
function MiniRing({ rate, size = 36 }: { rate: number; size?: number }) {
  const pct = Math.round(rate * 100);
  const inner = size - 6;
  const color = pct >= 60 ? "#059669" : pct >= 40 ? "#5B4FCF" : "#DC2626";
  return (
    <div className="stat-ring shrink-0" style={{ width: size, height: size, background: `conic-gradient(${color} ${pct * 3.6}deg, #E8E4DF ${pct * 3.6}deg)` }}>
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <span className="text-[9px] font-bold font-mono text-arena-text tabular-nums">{pct}</span>
      </div>
    </div>
  );
}

/* ── W/L/D Bar ── */
function WLDBar({ wins, losses, draws, height = "h-1.5" }: { wins: number; losses: number; draws: number; height?: string }) {
  const total = wins + losses + draws;
  if (total === 0) return <div className={`w-full ${height} rounded-full bg-arena-border-light/50`} />;
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden flex bg-arena-border-light/30`}>
      {wPct > 0 && <div className="h-full bg-arena-success transition-all duration-700" style={{ width: `${wPct}%` }} />}
      {dPct > 0 && <div className="h-full bg-arena-muted-light/60 transition-all duration-700" style={{ width: `${dPct}%` }} />}
      {lPct > 0 && <div className="h-full bg-arena-danger/60 transition-all duration-700" style={{ width: `${lPct}%` }} />}
    </div>
  );
}

/* ── DashStat card with icon ── */
function DashStat({ label, value, sub, icon, accentColor, delay, children }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accentColor: string;
  delay: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="dash-stat opacity-0 animate-fade-up" style={{ animationDelay: `${delay}s`, animationFillMode: "both" }}>
      <div className={`dash-stat-accent ${accentColor}`} />
      <div className="pl-3 flex items-start justify-between">
        <div>
          <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1.5">{label}</div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-arena-text-bright leading-none">{value}</span>
            {sub && <span className="text-[10px] text-arena-muted font-mono tracking-wider mb-0.5">{sub}</span>}
          </div>
          {children}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentColor}/10`}>
          <div className={accentColor.replace("bg-", "text-")}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Sort pill button ── */
function SortPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-mono rounded-lg transition-all duration-200 ${
        active
          ? "bg-arena-primary text-white shadow-arena-sm"
          : "bg-white text-arena-muted hover:text-arena-text border border-arena-border-light hover:border-arena-primary/30"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Featured best agent spotlight ── */
function FeaturedAgent({ agent, t }: { agent: Agent; t: any }) {
  const router = useRouter();
  const w = agent.stats?.wins || 0;
  const l = agent.stats?.losses || 0;
  const d = agent.stats?.draws || 0;
  const total = w + l + d;
  const isLive = agent.status === "in_match";

  return (
    <div
      className="dash-hero p-6 sm:p-7 cursor-pointer group opacity-0 animate-fade-up hover:shadow-arena-lg transition-all"
      style={{ animationDelay: "0.15s", animationFillMode: "both" }}
      onClick={() => router.push(`/agents/${agent.id}`)}
    >
      {/* Orbs */}
      <div className="dash-hero-orb w-44 h-44 bg-arena-primary/10 -top-16 -right-8 animate-pulse-soft" />
      <div className="dash-hero-orb w-32 h-32 bg-arena-accent/8 -bottom-12 left-8 animate-pulse-soft" style={{ animationDelay: "2s" }} />

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <IconStar className="w-5 h-5 text-arena-accent" />
          <span className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">Top Agent</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative">
              <Avatar name={agent.name} size="w-16 h-16" textSize="text-2xl" gradient="from-arena-primary to-arena-accent" />
              {isLive && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-arena-success border-2 border-white">
                  <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-60" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="text-xl font-display font-extrabold text-arena-text-bright truncate group-hover:text-arena-primary transition-colors">
                  {agent.name}
                </h3>
                <Badge status={agent.autoPlay && agent.status === "idle" ? "auto-play" : agent.status} />
                {agent.type === "openclaw" && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 rounded">OC</span>
                )}
                {agent.isHuman && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-arena-muted">
                {agent.gameTypes.map((gt) => (
                  <span key={gt} className="capitalize font-mono">{gt}</span>
                ))}
                <span>{formatRelativeTime(agent.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 shrink-0">
            {/* ELO */}
            <div className="text-center">
              <div className="text-3xl font-extrabold font-mono text-arena-primary tabular-nums leading-none">
                {formatElo(agent.elo)}
              </div>
              <div className="text-[9px] text-arena-muted uppercase tracking-widest mt-1 font-mono">ELO</div>
            </div>

            {/* Ring */}
            <WinRateRing rate={agent.stats?.winRate || 0} />

            {/* WLD */}
            <div className="hidden sm:block space-y-1.5 min-w-[100px]">
              <WLDBar wins={w} losses={l} draws={d} height="h-2" />
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-arena-success font-mono font-semibold">{w}W</span>
                <span className="text-arena-danger/70 font-mono font-semibold">{l}L</span>
                <span className="text-arena-muted font-mono">{d}D</span>
                <span className="text-arena-muted font-mono ml-1">/ {total}</span>
              </div>
            </div>

            {/* Earnings */}
            <div className="text-center hidden sm:block">
              <div className="text-xl font-extrabold font-mono text-arena-accent tabular-nums">
                {(agent.stats?.totalEarnings || 0).toFixed(2)}
              </div>
              <div className="text-[9px] text-arena-muted uppercase tracking-widest mt-0.5 font-mono">ALPHA</div>
            </div>
          </div>
        </div>

        {/* View arrow */}
        <div className="flex items-center justify-end mt-3 text-xs text-arena-muted group-hover:text-arena-primary transition-colors">
          <span className="mr-1">View details</span>
          <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

/* ── Agent card ── */
function AgentCard({ agent, index, isBest }: { agent: Agent; index: number; isBest: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  const w = agent.stats?.wins || 0;
  const l = agent.stats?.losses || 0;
  const d = agent.stats?.draws || 0;
  const total = w + l + d;
  const isLive = agent.status === "in_match";

  return (
    <div
      className={`bg-white border rounded-xl p-5 shadow-arena-sm cursor-pointer transition-all duration-200 hover:shadow-arena-lg hover:-translate-y-0.5 opacity-0 animate-fade-up ${
        isBest
          ? "border-arena-primary/30 ring-1 ring-arena-primary/10 hover:border-arena-primary/50"
          : "border-arena-border-light hover:border-arena-primary/30"
      }`}
      style={{ animationDelay: `${0.2 + index * 0.06}s`, animationFillMode: "both" }}
      onClick={() => router.push(`/agents/${agent.id}`)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Avatar
            name={agent.name}
            size="w-11 h-11"
            textSize="text-base"
            gradient={isBest ? "from-arena-primary to-arena-accent" : "from-arena-primary to-arena-primary-dark"}
          />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-arena-success border-2 border-white">
              <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-60" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isBest && <IconStar className="w-3.5 h-3.5 text-arena-accent shrink-0" />}
            <h3 className="font-semibold text-arena-text-bright truncate leading-tight">{agent.name}</h3>
            {agent.type === "openclaw" && (
              <span className="shrink-0 px-1 py-0 text-[9px] font-mono bg-purple-50 text-purple-500 rounded">OC</span>
            )}
            {agent.autoPlay && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-arena-primary/10 text-arena-primary border border-arena-primary/20 rounded">
                AP
              </span>
            )}
            {agent.isHuman && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">
                Human
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {agent.gameTypes.map((gt) => (
              <span key={gt} className="text-[10px] text-arena-muted capitalize font-mono">{gt}</span>
            ))}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <Badge status={agent.autoPlay && agent.status === "idle" ? "auto-play" : agent.status} />
        </div>
      </div>

      {/* ELO + Ring row */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <div className="text-2xl font-extrabold font-mono text-arena-primary tabular-nums leading-none">
            {formatElo(agent.elo)}
          </div>
          <div className="text-[9px] text-arena-muted uppercase tracking-widest mt-0.5 font-mono">ELO</div>
        </div>

        <MiniRing rate={agent.stats?.winRate || 0} size={40} />

        <div className="flex-1">
          <WLDBar wins={w} losses={l} draws={d} />
          <div className="flex items-center gap-2 mt-1.5 text-[10px]">
            <span className="text-arena-success font-mono font-semibold">{w}W</span>
            <span className="text-arena-danger/70 font-mono font-semibold">{l}L</span>
            <span className="text-arena-muted font-mono">{d}D</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-arena-border-light/50 text-[11px]">
        <span className="text-arena-muted font-mono">
          {total} {t.common.matches.toLowerCase()} &middot; {formatRelativeTime(agent.createdAt)}
        </span>
        <span className="font-mono font-bold text-arena-accent tabular-nums">
          {(agent.stats?.totalEarnings || 0).toFixed(2)} ALPHA
        </span>
      </div>
    </div>
  );
}

/* ── Empty state with onboarding ── */
function EmptyState({ t }: { t: any }) {
  return (
    <div className="opacity-0 animate-scale-in" style={{ animationFillMode: "both" }}>
      <div className="text-center py-8 mb-6">
        <div className="w-20 h-20 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-5 animate-float">
          <IconRobot className="w-10 h-10 text-arena-primary" />
        </div>
        <h3 className="text-2xl font-display font-extrabold text-arena-text-bright mb-2">{t.agents.noAgentsTitle}</h3>
        <p className="text-arena-muted max-w-lg mx-auto leading-relaxed text-sm">{t.agents.noAgentsDesc}</p>
      </div>

      <div className="max-w-lg mx-auto space-y-3 mb-8">
        {[
          { num: "1", title: t.home.step2Title, text: t.home.step2Desc, icon: <IconRobot className="w-4 h-4" />, active: true },
          { num: "2", title: t.home.step3Title, text: t.home.step3Desc, icon: <IconBolt className="w-4 h-4" /> },
          { num: "3", title: t.home.step4Title, text: t.home.step4Desc, icon: <IconTrophy className="w-4 h-4" /> },
        ].map((step, i) => (
          <div
            key={step.num}
            className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm opacity-0 animate-fade-up"
            style={{ animationDelay: `${0.25 + i * 0.1}s`, animationFillMode: "both" }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                step.active ? "bg-arena-primary/15 text-arena-primary" : "bg-arena-border-light/40 text-arena-muted"
              }`}>
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-arena-text-bright mb-0.5">{step.title}</h4>
                <p className="text-sm text-arena-muted leading-relaxed">{step.text}</p>
              </div>
              <span className="text-xs font-mono text-arena-muted-light shrink-0 mt-1">{step.num}/3</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center opacity-0 animate-fade-up" style={{ animationDelay: "0.55s", animationFillMode: "both" }}>
        <Link href="/agents/new">
          <Button size="lg">
            <span className="flex items-center gap-2">
              <IconPlus className="w-4 h-4" />
              {t.agents.createFirst}
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SORT TYPES
   ═══════════════════════════════════════════════════════ */
type SortKey = "elo" | "winrate" | "matches" | "earnings" | "recent";

function sortAgents(agents: Agent[], key: SortKey): Agent[] {
  const arr = [...agents];
  switch (key) {
    case "elo":
      return arr.sort((a, b) => (b.elo || 0) - (a.elo || 0));
    case "winrate":
      return arr.sort((a, b) => (b.stats?.winRate || 0) - (a.stats?.winRate || 0));
    case "matches":
      return arr.sort((a, b) => {
        const tA = (a.stats?.wins || 0) + (a.stats?.losses || 0) + (a.stats?.draws || 0);
        const tB = (b.stats?.wins || 0) + (b.stats?.losses || 0) + (b.stats?.draws || 0);
        return tB - tA;
      });
    case "earnings":
      return arr.sort((a, b) => (b.stats?.totalEarnings || 0) - (a.stats?.totalEarnings || 0));
    case "recent":
      return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default:
      return arr;
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
function AgentsContent() {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("elo");

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
    const totalW = agents.reduce((s, a) => s + (a.stats?.wins || 0), 0);
    const totalL = agents.reduce((s, a) => s + (a.stats?.losses || 0), 0);
    const totalD = agents.reduce((s, a) => s + (a.stats?.draws || 0), 0);
    const totalM = totalW + totalL + totalD;
    const winRate = totalM > 0 ? totalW / totalM : 0;
    const earnings = agents.reduce((s, a) => s + (a.stats?.totalEarnings || 0), 0);
    const bestAgent = agents.reduce(
      (best, a) => ((a.elo || 0) > (best.elo || 0) ? a : best),
      agents[0]
    );
    const activeLive = agents.filter((a) => a.status === "in_match").length;
    return { totalW, totalL, totalD, totalM, winRate, earnings, bestAgent, activeLive };
  }, [agents]);

  const sorted = useMemo(() => sortAgents(agents, sortKey), [agents, sortKey]);

  const showFeatured = agents.length > 1 && summary?.bestAgent;
  const gridAgents = showFeatured
    ? sorted.filter((a) => a.id !== summary!.bestAgent.id)
    : sorted;

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">

      {/* ═══════ HERO HEADER ═══════ */}
      <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        <div className="dash-hero-orb w-56 h-56 bg-arena-primary/10 -top-24 -right-14 animate-pulse-soft" />
        <div className="dash-hero-orb w-36 h-36 bg-arena-accent/8 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright mb-1">{t.agents.title}</h1>
            <p className="text-arena-muted text-sm">{t.agents.subtitle}</p>
          </div>
          <Link href="/agents/new">
            <Button>
              <span className="flex items-center gap-2">
                <IconPlus className="w-4 h-4" />
                {t.agents.createAgent}
              </span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down" style={{ animationFillMode: "both" }}>
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <>
          {/* ═══════ SUMMARY STATS ═══════ */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <DashStat
                label={t.common.agents}
                value={agents.length}
                icon={<IconUsers className="w-4 h-4" />}
                accentColor="bg-arena-primary"
                delay={0.06}
              >
                {summary.activeLive > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="relative w-2 h-2 live-dot">
                      <span className="absolute inset-0 rounded-full bg-arena-success" />
                    </span>
                    <span className="text-[10px] text-arena-success font-mono uppercase tracking-wider">{summary.activeLive} live</span>
                  </div>
                )}
              </DashStat>

              <DashStat
                label={t.common.winRate}
                value={formatWinRate(summary.winRate)}
                icon={<IconTrophy className="w-4 h-4" />}
                accentColor="bg-arena-success"
                delay={0.1}
              >
                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  <span className="text-arena-success font-mono font-semibold">{summary.totalW}W</span>
                  <span className="text-arena-danger/70 font-mono font-semibold">{summary.totalL}L</span>
                  <span className="text-arena-muted font-mono">{summary.totalD}D</span>
                </div>
              </DashStat>

              <DashStat
                label={"Best ELO"}
                value={formatElo(summary.bestAgent.elo)}
                icon={<IconStar className="w-4 h-4" />}
                accentColor="bg-arena-primary-light"
                delay={0.14}
              >
                <div className="text-[10px] text-arena-muted font-mono mt-1 truncate">{summary.bestAgent.name}</div>
              </DashStat>

              <DashStat
                label={t.common.earnings}
                value={summary.earnings.toFixed(2)}
                sub="ALPHA"
                icon={<IconCoin className="w-4 h-4" />}
                accentColor="bg-arena-accent"
                delay={0.18}
              />
            </div>
          )}

          {/* ═══════ FEATURED BEST AGENT ═══════ */}
          {showFeatured && summary?.bestAgent && (
            <div className="mb-8">
              <FeaturedAgent agent={summary.bestAgent} t={t} />
            </div>
          )}

          {/* ═══════ SORT BAR ═══════ */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            <h2 className="text-sm font-mono text-arena-muted uppercase tracking-widest flex items-center gap-2">
              {showFeatured ? "All Agents" : t.common.agents}
              <span className="bg-arena-primary/10 text-arena-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                {gridAgents.length}
              </span>
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { key: "elo", label: "ELO" },
                  { key: "winrate", label: t.common.winRate },
                  { key: "matches", label: t.common.matches },
                  { key: "earnings", label: t.common.earnings },
                  { key: "recent", label: "Recent" },
                ] as { key: SortKey; label: string }[]
              ).map((s) => (
                <SortPill key={s.key} label={s.label} active={sortKey === s.key} onClick={() => setSortKey(s.key)} />
              ))}
            </div>
          </div>

          {/* ═══════ AGENTS GRID ═══════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {gridAgents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={i}
                isBest={!showFeatured && summary?.bestAgent.id === agent.id}
              />
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
