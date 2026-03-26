"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { formatElo, formatWinRate, formatEarnings, formatUsdEquivalent } from "@/lib/utils";
import { useLanguage, agentPlural } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import type { LeaderboardAgent, LeaderboardUser } from "@/lib/types";

type Tab = "agents" | "users";

function XBadge({ username }: { username?: string | null }) {
  if (!username) return null;
  return (
    <a href={`https://x.com/${username}`} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0 text-[9px] font-mono bg-gray-900 text-white rounded hover:bg-black transition-colors">
      <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      @{username}
    </a>
  );
}

// ── Normalize backend responses ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAgent(raw: any, index: number): LeaderboardAgent {
  const stats = raw.stats || {};
  const wins = raw.wins ?? stats.wins ?? 0;
  const losses = raw.losses ?? stats.losses ?? 0;
  const draws = raw.draws ?? stats.draws ?? 0;
  const totalMatches = raw.totalMatches ?? stats.totalMatches ?? (wins + losses + draws);
  return {
    rank: raw.rank ?? index + 1,
    id: raw.id ?? raw.agentId ?? raw._id ?? "",
    name: raw.name ?? "Unknown",
    ownerUsername: raw.ownerUsername ?? raw.owner?.username ?? "—",
    isHuman: raw.isHuman ?? false,
    elo: raw.eloRating ?? raw.elo ?? stats.elo ?? 1200,
    winRate: raw.winRate ?? stats.winRate ?? 0,
    wins,
    losses,
    draws,
    totalMatches,
    totalEarnings: raw.totalEarnings ?? stats.totalEarnings ?? 0,
    earningsAlpha: raw.earningsAlpha ?? stats.earningsAlpha ?? 0,
    earningsUsdc: raw.earningsUsdc ?? stats.earningsUsdc ?? 0,
    xUsername: raw.xUsername ?? null,
  };
}

/** Render earnings with token icons */
function TokenEarnings({ alpha, usdc, size = "sm" }: { alpha: number; usdc: number; size?: "sm" | "md" }) {
  const textCls = size === "md" ? "text-sm font-extrabold" : "text-xs font-bold";
  const imgCls = size === "md" ? "w-4 h-4" : "w-3 h-3";
  if (alpha <= 0 && usdc <= 0) return <span className={`${textCls} font-mono text-arena-muted tabular-nums`}>0</span>;
  return (
    <span className="inline-flex flex-col gap-0.5">
      {alpha > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <img src="/tokens/alpha.jpg" alt="" className={`${imgCls} rounded-full`} />
          <span className={`${textCls} font-mono text-arena-accent tabular-nums`}>{formatEarnings(alpha)}</span>
        </span>
      )}
      {usdc > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <img src="/tokens/usdc.jpg" alt="" className={`${imgCls} rounded-full`} />
          <span className={`${textCls} font-mono text-emerald-600 tabular-nums`}>{formatEarnings(usdc)}</span>
        </span>
      )}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUser(raw: any, index: number): LeaderboardUser {
  return {
    rank: raw.rank ?? index + 1,
    id: raw.id ?? raw.userId ?? raw._id ?? "",
    username: raw.username ?? "Unknown",
    totalEarnings: raw.totalEarnings ?? 0,
    earningsAlpha: raw.earningsAlpha ?? 0,
    earningsUsdc: raw.earningsUsdc ?? 0,
    agentCount: raw.agentCount ?? 0,
  };
}

// ── Derived detail helpers ───────────────────────────────────
function getAgentDetails(a: LeaderboardAgent) {
  const { wins, losses, draws } = a;
  const form: ("W" | "L" | "D")[] = Array.from({ length: 5 }, (_, i) =>
    i < Math.round(a.winRate * 5) ? "W" : i < Math.round(a.winRate * 5) + (draws > 0 ? 1 : 0) ? "D" : "L"
  );
  return { wins, losses, draws, form };
}

// ── Podium config ──────────────────────────────────────────
const PODIUM = {
  1: {
    order: "order-2",
    height: "h-full",
    gradient: "from-amber-500/20 via-amber-400/10 to-amber-300/5",
    border: "border-amber-400/60",
    badgeBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    accent: "text-amber-600",
    ringColor: "ring-amber-400/40",
    avatarBg: "from-amber-400 to-amber-600",
    medalColor: "#F59E0B",
    label: "1st",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
  2: {
    order: "order-1",
    height: "h-[80%]",
    gradient: "from-slate-400/15 via-slate-300/8 to-slate-200/5",
    border: "border-slate-400/50",
    badgeBg: "bg-gradient-to-br from-slate-300 to-slate-500",
    accent: "text-slate-500",
    ringColor: "ring-slate-400/30",
    avatarBg: "from-slate-300 to-slate-500",
    medalColor: "#94A3B8",
    label: "2nd",
    glow: "",
  },
  3: {
    order: "order-3",
    height: "h-[72%]",
    gradient: "from-orange-500/15 via-orange-400/8 to-orange-300/5",
    border: "border-orange-400/50",
    badgeBg: "bg-gradient-to-br from-orange-400 to-orange-700",
    accent: "text-orange-600",
    ringColor: "ring-orange-400/30",
    avatarBg: "from-orange-400 to-orange-700",
    medalColor: "#C2703E",
    label: "3rd",
    glow: "",
  },
} as const;

// ── Rank color helpers ─────────────────────────────────────
const RANK_COLORS: Record<number, { badge: string; text: string; bg: string; border: string }> = {
  1: { badge: "bg-gradient-to-br from-amber-400 to-amber-600 text-white", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-400" },
  2: { badge: "bg-gradient-to-br from-slate-300 to-slate-500 text-white", text: "text-slate-500", bg: "bg-slate-50", border: "border-slate-400" },
  3: { badge: "bg-gradient-to-br from-orange-400 to-orange-700 text-white", text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-400" },
};
const DEFAULT_RANK = { badge: "bg-arena-primary/10 text-arena-primary", text: "text-arena-primary", bg: "bg-arena-primary/5", border: "border-arena-border" };
function getRankColor(rank: number) { return RANK_COLORS[rank] || DEFAULT_RANK; }

/* ── SVG Icons ─────────────────────────────────────────────── */
function TrophyIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 17C14.7614 17 17 14.7614 17 12V4H7V12C7 14.7614 9.23858 17 12 17Z" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 7H19C20.1046 7 21 7.89543 21 9V10C21 11.6569 19.6569 13 18 13H17" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 7H5C3.89543 7 3 7.89543 3 9V10C3 11.6569 4.34315 13 6 13H7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 21H16" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
      <path d="M12 17V21" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 8L6 20H18L22 8L17 12L12 4L7 12L2 8Z" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Avatar ── (shared component) */
import AgentAvatar from "@/components/ui/AgentAvatar";

/* ── Stat row inside modals ───────────────────────────────── */
function StatRow({ label, value, accentColor }: { label: string; value: string | number; accentColor?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-arena-border/30 last:border-0">
      <span className="text-sm text-arena-muted">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accentColor || "text-arena-text-bright"}`}>
        {value}
      </span>
    </div>
  );
}

/* ── Form dots (W / L / D) ─────────────────────────────────── */
function FormDots({ form }: { form: ("W" | "L" | "D")[] }) {
  const { t } = useLanguage();
  const colors = { W: "bg-emerald-500", L: "bg-rose-500", D: "bg-arena-muted" };
  const labels = { W: t.leaderboard.winLabel, L: t.leaderboard.lossLabel, D: t.leaderboard.drawLabel };
  return (
    <div className="flex items-center gap-1.5">
      {form.map((r, i) => (
        <div key={i} className={`w-7 h-7 rounded-lg ${colors[r]} flex items-center justify-center`} title={labels[r]}>
          <span className="text-[10px] font-bold text-white">{r}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Mini form dots for table rows ─────────────────────────── */
function MiniFormDots({ form }: { form: ("W" | "L" | "D")[] }) {
  const colors = { W: "bg-emerald-500", L: "bg-rose-500", D: "bg-slate-300" };
  return (
    <div className="flex items-center gap-1">
      {form.map((r, i) => (
        <div key={i} className={`w-5 h-5 rounded-md ${colors[r]} flex items-center justify-center`}>
          <span className="text-[8px] font-bold text-white">{r}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Win rate bar ──────────────────────────────────────────── */
function WinRateBar({ rate, showLabel = true }: { rate: number; showLabel?: boolean }) {
  const pct = rate * 100;
  const color = pct >= 70 ? "#059669" : pct >= 55 ? "#5B4FCF" : "#9CA3AF";
  return (
    <div className="flex items-center gap-2.5 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-arena-bg-light rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-arena-text w-11 text-right tabular-nums">{formatWinRate(rate)}</span>
      )}
    </div>
  );
}

/* ── Mini win rate ring ────────────────────────────────────── */
function MiniRing({ rate, size = 36 }: { rate: number; size?: number }) {
  const pct = rate * 100;
  const color = pct >= 70 ? "#059669" : pct >= 55 ? "#5B4FCF" : "#9CA3AF";
  const inner = size - 6;
  return (
    <div
      className="stat-ring shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${pct * 3.6}deg, #E5E7EB ${pct * 3.6}deg)`,
      }}
    >
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <span className="text-[9px] font-bold tabular-nums text-arena-text">{Math.round(pct)}</span>
      </div>
    </div>
  );
}

/* ── Agent detail modal ───────────────────────────────────── */
function AgentModalContent({ agent }: { agent: LeaderboardAgent }) {
  const { t } = useLanguage();
  const d = getAgentDetails(agent);
  const rc = getRankColor(agent.rank);
  const rankLabel = agent.rank <= 3 ? ["", "1st", "2nd", "3rd"][agent.rank] : `#${agent.rank}`;

  const [statsByGame, setStatsByGame] = useState<Record<string, { wins: number; losses: number; draws: number; totalMatches: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getAgentStats(agent.id).then((res) => {
      if (!cancelled && res.statsByGameType) setStatsByGame(res.statsByGameType);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [agent.id]);

  const GAME_LABELS: Record<string, string> = { chess: "Chess", poker: "Poker", rps: "RPS" };

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 flex items-center gap-4 border ${rc.border}`} style={{ background: "rgba(245, 240, 235, 0.9)" }}>
        <div className={`w-12 h-12 rounded-xl ${rc.badge} flex items-center justify-center shrink-0`}>
          <span className="font-extrabold text-lg">{rankLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-arena-text-bright truncate">{agent.name}</span>
            {agent.isHuman && (
              <span className="shrink-0 px-1 py-0 text-[9px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
            )}
            <XBadge username={agent.xUsername} />
          </div>
          <div className="text-xs text-arena-muted">{t.common.by} {agent.ownerUsername}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-extrabold font-mono tabular-nums ${rc.text}`}>{formatElo(agent.elo)}</div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">{t.common.elo}</div>
        </div>
      </div>

      <div className="bg-arena-bg-light rounded-xl px-4">
        <StatRow label={t.common.winRate} value={formatWinRate(agent.winRate)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.totalMatches} value={agent.totalMatches} />
        <StatRow label={t.common.wins} value={d.wins} accentColor="text-emerald-600" />
        <StatRow label={t.common.losses} value={d.losses} accentColor="text-rose-600" />
        <StatRow label={t.common.draws} value={d.draws} />
        <div className="flex items-center justify-between py-2.5 border-b border-arena-border-light/40">
          <span className="text-xs text-arena-muted">{t.leaderboard.totalEarnings}</span>
          <TokenEarnings alpha={agent.earningsAlpha || 0} usdc={agent.earningsUsdc || 0} />
        </div>
      </div>

      {/* Wins by game type */}
      {statsByGame && Object.keys(statsByGame).length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-arena-muted mb-2">Wins by Game</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(statsByGame).map(([gameType, s]) => (
              <div key={gameType} className="bg-arena-bg-light rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-arena-muted mb-1">{GAME_LABELS[gameType] || gameType}</div>
                <div className="text-lg font-extrabold text-emerald-600 font-mono tabular-nums">{s.wins}</div>
                <div className="text-[10px] text-arena-muted font-mono">{s.losses}L · {s.draws}D</div>
                <div className="text-[10px] text-arena-muted">{s.totalMatches} played</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-arena-muted mb-2">{t.leaderboard.recentForm}</div>
        <FormDots form={d.form} />
      </div>
    </div>
  );
}

/* ── User detail modal ────────────────────────────────────── */
function UserModalContent({ user }: { user: LeaderboardUser }) {
  const { t } = useLanguage();
  const rc = getRankColor(user.rank);
  const rankLabel = user.rank <= 3 ? ["", "1st", "2nd", "3rd"][user.rank] : `#${user.rank}`;

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 flex items-center gap-4 border ${rc.border}`} style={{ background: "rgba(245, 240, 235, 0.9)" }}>
        <div className={`w-12 h-12 rounded-xl ${rc.badge} flex items-center justify-center shrink-0`}>
          <span className="font-extrabold text-lg">{rankLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-arena-text-bright">{user.username}</div>
          <div className="text-xs text-arena-muted">{user.agentCount} {agentPlural(user.agentCount, t)}</div>
        </div>
        <div className="text-right shrink-0">
          <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} size="md" />
        </div>
      </div>

      <div className="bg-arena-bg-light rounded-xl px-4">
        <StatRow label={t.leaderboard.agentsDeployed} value={user.agentCount} />
        <div className="flex items-center justify-between py-2.5 border-b border-arena-border-light/40">
          <span className="text-xs text-arena-muted">{t.leaderboard.totalEarnings}</span>
          <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                                */
/* ================================================================== */
export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("agents");
  const [gameType, setGameType] = useState<string>("");
  const { t } = useLanguage();
  const { priceUsd } = useAlphaPrice();
  const [selectedAgent, setSelectedAgent] = useState<LeaderboardAgent | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

  const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [agentsRes, usersRes] = await Promise.all([
          api.getLeaderboardAgents(50, gameType || undefined),
          api.getLeaderboardUsers(50),
        ]);
        if (cancelled) return;
        setAgents((agentsRes.agents || []).map(normalizeAgent));
        setUsers((usersRes.users || []).map(normalizeUser));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [gameType]);

  const top3Agents = agents.slice(0, 3);
  const restAgents = agents.slice(3);
  const top3Users = users.slice(0, 3);
  const restUsers = users.slice(3);

  // Summary stats
  const totalMatches = agents.reduce((s, a) => s + a.totalMatches, 0);
  const avgEloRaw = agents.length > 0 ? agents.reduce((s, a) => s + a.elo, 0) / agents.length : 0;
  const avgElo = Math.round(avgEloRaw * 10) / 10;
  const totalAlpha = agents.reduce((s, a) => s + (a.earningsAlpha || 0), 0);
  const totalUsdc = agents.reduce((s, a) => s + (a.earningsUsdc || 0), 0);

  return (
    <div className="min-h-screen">
      {/* ── Modals ──────────────────────────────────────────── */}
      <Modal isOpen={!!selectedAgent} onClose={() => setSelectedAgent(null)} title={t.leaderboard.agentStats}>
        {selectedAgent && <AgentModalContent agent={selectedAgent} />}
      </Modal>
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={t.leaderboard.playerStats}>
        {selectedUser && <UserModalContent user={selectedUser} />}
      </Modal>

      {/* ── Hero header ────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="dash-hero-orb w-64 h-64 bg-arena-primary/10 -top-20 -left-20 animate-pulse-soft" />
        <div className="dash-hero-orb w-48 h-48 bg-arena-accent/8 -top-10 right-10 animate-pulse-soft" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
          {/* Title */}
          <div className="text-center animate-fade-up" style={{ animationFillMode: "both" }}>
            <div className="inline-flex items-center gap-2 mb-3">
              <TrophyIcon color="#E8A500" size={28} />
              <span className="text-xs uppercase tracking-widest text-arena-accent font-semibold">AlphArena</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-arena-text-bright font-display mb-2">
              {t.leaderboard.title}
            </h1>
            <p className="text-arena-muted max-w-md mx-auto text-sm">
              {t.leaderboard.subtitle}
            </p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg mx-auto items-center animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="text-center flex flex-col items-center justify-center">
              <div className="text-xl sm:text-2xl font-extrabold text-arena-text-bright font-mono tabular-nums">{agents.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-arena-muted">{t.common.agents}</div>
            </div>
            <div className="text-center flex flex-col items-center justify-center border-x border-arena-border-light">
              <div className="text-xl sm:text-2xl font-extrabold text-arena-primary font-mono tabular-nums">{avgElo}</div>
              <div className="text-[10px] uppercase tracking-wider text-arena-muted">Average {t.common.elo}</div>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase tracking-wider text-arena-muted mb-1">{t.common.earnings}</div>
              <TokenEarnings alpha={agents.reduce((s, a) => s + (a.earningsAlpha || 0), 0)} usdc={agents.reduce((s, a) => s + (a.earningsUsdc || 0), 0)} size="md" />
              {(() => { const usd = formatUsdEquivalent(totalAlpha, priceUsd, totalUsdc); return usd ? <div className="text-[10px] text-arena-muted">{usd}</div> : null; })()}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex justify-center mt-8 animate-fade-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
            <div className="inline-flex items-center bg-white rounded-xl p-1 border border-arena-border-light shadow-arena-sm">
              <button
                onClick={() => setTab("agents")}
                className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  tab === "agents"
                    ? "bg-arena-primary text-white shadow-arena-sm"
                    : "text-arena-muted hover:text-arena-text"
                }`}
              >
                {t.leaderboard.topAgents}
              </button>
              <button
                onClick={() => setTab("users")}
                className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  tab === "users"
                    ? "bg-arena-primary text-white shadow-arena-sm"
                    : "text-arena-muted hover:text-arena-text"
                }`}
              >
                {t.leaderboard.topPlayers}
              </button>
            </div>
          </div>

          {/* Game type filter */}
          {tab === "agents" && (
            <div className="flex justify-center mt-4 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
              <div className="inline-flex items-center gap-1.5 bg-white rounded-xl p-1 border border-arena-border-light shadow-arena-sm">
                {[
                  { value: "", label: "All" },
                  { value: "chess", label: "Chess" },
                  { value: "poker", label: "Poker" },
                  { value: "rps", label: "RPS" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGameType(opt.value)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                      gameType === opt.value
                        ? "bg-arena-accent text-white shadow-arena-sm"
                        : "text-arena-muted hover:text-arena-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ── Loading / Error / Empty ───────────────────────── */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-arena-primary/30 border-t-arena-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center mt-8">
            <p className="text-rose-700 font-medium">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-sm text-arena-primary underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && agents.length === 0 && users.length === 0 && (
          <div className="text-center py-20 text-arena-muted">
            <p className="text-lg font-medium">{t.leaderboard.title}</p>
            <p className="text-sm mt-1">No data yet. Start playing to see rankings!</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/*  AGENTS TAB                                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "agents" && !loading && !error && agents.length > 0 && (
          <>
            {/* ── Podium (top 3) desktop ─────────────────────── */}
            <div className="hidden sm:flex items-end gap-5 mt-10 mb-14 h-[380px]">
              {top3Agents.map((agent, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const c = PODIUM[place];
                const d = getAgentDetails(agent);
                return (
                  <div key={agent.id} className={`${c.order} flex items-end flex-1 min-w-0 animate-fade-up`} style={{ animationDelay: `${0.1 + i * 0.15}s`, animationFillMode: "both" }}>
                    <div
                      onClick={() => setSelectedAgent(agent)}
                      className={`${c.height} w-full bg-gradient-to-b ${c.gradient} border ${c.border} rounded-2xl p-5 flex flex-col items-center justify-end text-center transition-all duration-300 cursor-pointer hover:shadow-arena-lg ${c.glow} ring-1 ${c.ringColor}`}
                    >
                      {/* Crown for #1 */}
                      {place === 1 && (
                        <div className="text-amber-500 mb-1 animate-float" style={{ animationDuration: "3s" }}>
                          <CrownIcon />
                        </div>
                      )}

                      {/* Avatar */}
                      <AgentAvatar
                        name={agent.name}
                        gradient={c.avatarBg}
                        size={place === 1 ? "w-16 h-16" : "w-12 h-12"}
                        textSize={place === 1 ? "text-2xl" : "text-lg"}
                      />

                      {/* Rank badge */}
                      <div className={`${c.badgeBg} text-white text-xs font-extrabold px-3.5 py-1 rounded-full mt-3 mb-3 tracking-wide shadow-arena-sm`}>
                        {c.label}
                      </div>

                      {/* ELO */}
                      <div className={`text-3xl font-extrabold font-mono leading-none ${c.accent} tabular-nums`} style={{ letterSpacing: "-0.02em" }}>
                        {formatElo(agent.elo)}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-arena-muted mt-1 mb-4">
                        {t.leaderboard.eloRating}
                      </div>

                      {/* Name + owner */}
                      <div className="flex items-center justify-center gap-1.5 w-full">
                        <span className="font-bold text-arena-text-bright truncate text-sm">{agent.name}</span>
                        {agent.isHuman && (
                          <span className="shrink-0 px-1.5 py-0 text-[9px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                        )}
                        <XBadge username={agent.xUsername} />
                      </div>
                      <div className="text-xs text-arena-muted mt-0.5 truncate w-full">{t.common.by} {agent.ownerUsername}</div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 w-full pt-3 border-t border-arena-border-light/50">
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.winRate}</div>
                          <div className="text-sm font-bold text-arena-text tabular-nums">{formatWinRate(agent.winRate)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.matches}</div>
                          <div className="text-sm font-bold text-arena-text tabular-nums">{agent.totalMatches}</div>
                        </div>
                      </div>

                      {/* Mini form dots */}
                      <div className="mt-3 pt-3 border-t border-arena-border-light/50 w-full flex justify-center">
                        <MiniFormDots form={d.form} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile top-3 ────────────────────────────────── */}
            <div className="sm:hidden space-y-3 mt-6 mb-8">
              {top3Agents.map((agent, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const pc = PODIUM[place];
                const d = getAgentDetails(agent);
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`bg-gradient-to-r ${pc.gradient} border ${pc.border} rounded-2xl p-4 cursor-pointer transition-all hover:shadow-arena animate-fade-up`}
                    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-3">
                      <AgentAvatar name={agent.name} gradient={pc.avatarBg} size="w-11 h-11" textSize="text-base" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`${pc.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{pc.label}</span>
                          <span className="font-bold text-arena-text-bright text-sm truncate">{agent.name}</span>
                          {agent.isHuman && (
                            <span className="shrink-0 px-1 py-0 text-[9px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                          )}
                          <XBadge username={agent.xUsername} />
                        </div>
                        <span className="text-xs text-arena-muted">{t.common.by} {agent.ownerUsername}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xl font-extrabold font-mono ${pc.accent} tabular-nums`}>{formatElo(agent.elo)}</div>
                        <div className="text-[10px] text-arena-muted">{formatWinRate(agent.winRate)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-arena-border-light/40">
                      <MiniFormDots form={d.form} />
                      <span className="text-xs text-arena-accent font-bold tabular-nums"><TokenEarnings alpha={agent.earningsAlpha || 0} usdc={agent.earningsUsdc || 0} /></span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Rest of rankings ──────────────────────────── */}
            {restAgents.length > 0 && (
              <div className="bg-white border border-arena-border-light rounded-2xl overflow-hidden shadow-arena-sm animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 text-[11px] uppercase tracking-wider text-arena-muted bg-arena-bg-light/60 border-b border-arena-border-light font-medium">
                  <div className="col-span-1">{t.leaderboard.rank}</div>
                  <div className="col-span-3">{t.leaderboard.agentSingular}</div>
                  <div className="col-span-1 text-center">{t.common.elo}</div>
                  <div className="col-span-2">{t.common.winRate}</div>
                  <div className="col-span-2 text-center">{t.leaderboard.recentForm}</div>
                  <div className="col-span-1 text-center">{t.common.matches}</div>
                  <div className="col-span-2 text-right">{t.common.earnings}</div>
                </div>

                {restAgents.map((agent, idx) => {
                  const d = getAgentDetails(agent);
                  return (
                    <div key={agent.id}>
                      {/* Desktop row */}
                      <div
                        onClick={() => setSelectedAgent(agent)}
                        className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 border-b border-arena-border-light/40 items-center cursor-pointer hover:bg-arena-primary/[0.03] transition-colors group"
                      >
                        <div className="col-span-1">
                          <span className="text-lg font-extrabold font-mono tabular-nums text-arena-muted-light group-hover:text-arena-text-bright transition-colors">
                            {agent.rank}
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center gap-3 min-w-0">
                          <AgentAvatar name={agent.name} gradient="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-arena-text-bright text-sm truncate group-hover:text-arena-primary transition-colors">{agent.name}</span>
                              {agent.isHuman && (
                                <span className="shrink-0 px-1 py-0 text-[9px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                              )}
                              <XBadge username={agent.xUsername} />
                            </div>
                            <div className="text-xs text-arena-muted truncate">{agent.ownerUsername}</div>
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="text-arena-primary font-bold text-sm font-mono tabular-nums">{formatElo(agent.elo)}</span>
                        </div>
                        <div className="col-span-2">
                          <WinRateBar rate={agent.winRate} />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <MiniFormDots form={d.form} />
                        </div>
                        <div className="col-span-1 text-center text-sm text-arena-muted tabular-nums">
                          {agent.totalMatches}
                        </div>
                        <div className="col-span-2 text-right">
                          <TokenEarnings alpha={agent.earningsAlpha || 0} usdc={agent.earningsUsdc || 0} />
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div
                        onClick={() => setSelectedAgent(agent)}
                        className="sm:hidden px-4 py-4 border-b border-arena-border-light/40 cursor-pointer active:bg-arena-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base font-extrabold font-mono w-7 text-center shrink-0 tabular-nums text-arena-muted-light">
                            {agent.rank}
                          </span>
                          <AgentAvatar name={agent.name} gradient="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-arena-text-bright text-sm truncate">{agent.name}</span>
                                {agent.isHuman && (
                                  <span className="shrink-0 px-1 py-0 text-[9px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                                )}
                              </span>
                              <span className="text-arena-primary font-bold text-sm font-mono shrink-0 ml-2 tabular-nums">{formatElo(agent.elo)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-arena-muted">{agent.ownerUsername}</span>
                              <span className="text-xs text-arena-accent font-semibold tabular-nums"><TokenEarnings alpha={agent.earningsAlpha || 0} usdc={agent.earningsUsdc || 0} /></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5 ml-10">
                          <MiniFormDots form={d.form} />
                          <div className="flex items-center gap-2">
                            <MiniRing rate={agent.winRate} size={28} />
                            <span className="text-xs text-arena-muted tabular-nums">{agent.totalMatches} {t.leaderboard.games}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/*  USERS TAB                                            */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "users" && !loading && !error && users.length > 0 && (
          <>
            {/* ── Podium (top 3) desktop ─────────────────────── */}
            <div className="hidden sm:flex items-end gap-5 mt-10 mb-14 h-[360px]">
              {top3Users.map((user, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const c = PODIUM[place];
                return (
                  <div key={user.id} className={`${c.order} flex items-end flex-1 min-w-0 animate-fade-up`} style={{ animationDelay: `${0.1 + i * 0.15}s`, animationFillMode: "both" }}>
                    <div
                      onClick={() => setSelectedUser(user)}
                      className={`${c.height} w-full bg-gradient-to-b ${c.gradient} border ${c.border} rounded-2xl p-5 flex flex-col items-center justify-end text-center transition-all duration-300 cursor-pointer hover:shadow-arena-lg ${c.glow} ring-1 ${c.ringColor}`}
                    >
                      {place === 1 && (
                        <div className="text-amber-500 mb-1 animate-float" style={{ animationDuration: "3s" }}>
                          <CrownIcon />
                        </div>
                      )}

                      <AgentAvatar
                        name={user.username}
                        gradient={c.avatarBg}
                        size={place === 1 ? "w-16 h-16" : "w-12 h-12"}
                        textSize={place === 1 ? "text-2xl" : "text-lg"}
                      />

                      <div className={`${c.badgeBg} text-white text-xs font-extrabold px-3.5 py-1 rounded-full mt-3 mb-3 tracking-wide shadow-arena-sm`}>
                        {c.label}
                      </div>

                      <div className={`text-3xl font-extrabold font-mono leading-none ${c.accent} tabular-nums`} style={{ letterSpacing: "-0.02em" }}>
                        <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} size="md" />
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-arena-muted mt-1 mb-4">{t.leaderboard.totalEarnings}</div>

                      <div className="font-bold text-arena-text-bright truncate w-full text-sm">{user.username}</div>
                      <div className="text-xs text-arena-muted mt-0.5">
                        {user.agentCount} {agentPlural(user.agentCount, t)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile top-3 ────────────────────────────────── */}
            <div className="sm:hidden space-y-3 mt-6 mb-8">
              {top3Users.map((user, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const pc = PODIUM[place];
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`bg-gradient-to-r ${pc.gradient} border ${pc.border} rounded-2xl p-4 cursor-pointer transition-all hover:shadow-arena animate-fade-up`}
                    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-3">
                      <AgentAvatar name={user.username} gradient={pc.avatarBg} size="w-11 h-11" textSize="text-base" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`${pc.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{pc.label}</span>
                          <span className="font-bold text-arena-text-bright text-sm">{user.username}</span>
                        </div>
                        <span className="text-xs text-arena-muted">{user.agentCount} {agentPlural(user.agentCount, t)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Rest of rankings ──────────────────────────── */}
            {restUsers.length > 0 && (
              <div className="bg-white border border-arena-border-light rounded-2xl overflow-hidden shadow-arena-sm animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
                <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 text-[11px] uppercase tracking-wider text-arena-muted bg-arena-bg-light/60 border-b border-arena-border-light font-medium">
                  <div className="col-span-1">{t.leaderboard.rank}</div>
                  <div className="col-span-4">{t.leaderboard.player}</div>
                  <div className="col-span-3 text-center">{t.common.agents}</div>
                  <div className="col-span-4 text-right">{t.common.earnings}</div>
                </div>

                {restUsers.map((user) => {
                  return (
                    <div key={user.id}>
                      {/* Desktop */}
                      <div
                        onClick={() => setSelectedUser(user)}
                        className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 border-b border-arena-border-light/40 items-center cursor-pointer hover:bg-arena-primary/[0.03] transition-colors group"
                      >
                        <div className="col-span-1">
                          <span className="text-lg font-extrabold font-mono tabular-nums text-arena-muted-light group-hover:text-arena-text-bright transition-colors">
                            {user.rank}
                          </span>
                        </div>
                        <div className="col-span-4 flex items-center gap-3">
                          <AgentAvatar name={user.username} gradient="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <span className="font-semibold text-arena-text-bright text-sm group-hover:text-arena-primary transition-colors">{user.username}</span>
                        </div>
                        <div className="col-span-3 text-center text-sm text-arena-muted tabular-nums">
                          {user.agentCount}
                        </div>
                        <div className="col-span-4 text-right">
                          <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} />
                        </div>
                      </div>

                      {/* Mobile */}
                      <div
                        onClick={() => setSelectedUser(user)}
                        className="sm:hidden px-4 py-4 border-b border-arena-border-light/40 cursor-pointer active:bg-arena-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base font-extrabold font-mono w-7 text-center shrink-0 tabular-nums text-arena-muted-light">
                            {user.rank}
                          </span>
                          <AgentAvatar name={user.username} gradient="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-arena-text-bright text-sm">{user.username}</span>
                            <div className="text-xs text-arena-muted">{user.agentCount} {agentPlural(user.agentCount, t)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-arena-accent tabular-nums">
                              <TokenEarnings alpha={user.earningsAlpha || 0} usdc={user.earningsUsdc || 0} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
