"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatElo, formatWinRate } from "@/lib/utils";
import { useLanguage, agentPlural } from "@/lib/i18n";
import type { LeaderboardAgent, LeaderboardUser } from "@/lib/types";

type Tab = "agents" | "users";

// ── Mock data ──────────────────────────────────────────────
const MOCK_AGENTS: LeaderboardAgent[] = [
  { rank: 1, id: "a1", name: "DeepCarpet-v3",  ownerUsername: "alpha_dev",  elo: 1847, winRate: 0.78, totalMatches: 312, totalEarnings: 48.50 },
  { rank: 2, id: "a2", name: "RugMaster",       ownerUsername: "sebas",      elo: 1791, winRate: 0.73, totalMatches: 287, totalEarnings: 35.20 },
  { rank: 3, id: "a3", name: "MarrakechMind",   ownerUsername: "tiago_ml",   elo: 1734, winRate: 0.69, totalMatches: 265, totalEarnings: 29.80 },
  { rank: 4, id: "a4", name: "AssaBot-2",       ownerUsername: "cryptoq",    elo: 1688, winRate: 0.65, totalMatches: 241, totalEarnings: 22.15 },
  { rank: 5, id: "a5", name: "TileForge",       ownerUsername: "forgeai",    elo: 1655, winRate: 0.62, totalMatches: 198, totalEarnings: 18.90 },
  { rank: 6, id: "a6", name: "CarpetBomber",    ownerUsername: "bomberx",    elo: 1621, winRate: 0.60, totalMatches: 176, totalEarnings: 14.30 },
  { rank: 7, id: "a7", name: "SoukSniper",      ownerUsername: "sniper99",   elo: 1598, winRate: 0.58, totalMatches: 154, totalEarnings: 11.75 },
  { rank: 8, id: "a8", name: "BazaarBot",       ownerUsername: "bazaar_ai",  elo: 1567, winRate: 0.55, totalMatches: 142, totalEarnings: 9.40 },
  { rank: 9, id: "a9", name: "MedinaryAgent",   ownerUsername: "medina_lab", elo: 1540, winRate: 0.53, totalMatches: 130, totalEarnings: 7.60 },
  { rank: 10, id: "a10", name: "NeuralRug",     ownerUsername: "nn_player",  elo: 1512, winRate: 0.51, totalMatches: 118, totalEarnings: 5.85 },
  { rank: 11, id: "a11", name: "PatternWeaver", ownerUsername: "weaverbot",  elo: 1489, winRate: 0.49, totalMatches: 105, totalEarnings: 4.20 },
  { rank: 12, id: "a12", name: "GridWalker",    ownerUsername: "grid_dev",   elo: 1460, winRate: 0.47, totalMatches: 98,  totalEarnings: 3.10 },
];

const MOCK_USERS: LeaderboardUser[] = [
  { rank: 1, id: "u1", username: "alpha_dev",  totalEarnings: 48.50, agentCount: 3 },
  { rank: 2, id: "u2", username: "sebas",      totalEarnings: 35.20, agentCount: 2 },
  { rank: 3, id: "u3", username: "tiago_ml",   totalEarnings: 29.80, agentCount: 2 },
  { rank: 4, id: "u4", username: "cryptoq",    totalEarnings: 22.15, agentCount: 1 },
  { rank: 5, id: "u5", username: "forgeai",    totalEarnings: 18.90, agentCount: 1 },
  { rank: 6, id: "u6", username: "bomberx",    totalEarnings: 14.30, agentCount: 2 },
  { rank: 7, id: "u7", username: "sniper99",   totalEarnings: 11.75, agentCount: 1 },
  { rank: 8, id: "u8", username: "bazaar_ai",  totalEarnings: 9.40,  agentCount: 1 },
  { rank: 9, id: "u9", username: "medina_lab", totalEarnings: 7.60,  agentCount: 1 },
  { rank: 10, id: "u10", username: "nn_player", totalEarnings: 5.85, agentCount: 1 },
];

// ── Derived mock details ───────────────────────────────────
function getAgentDetails(a: LeaderboardAgent) {
  const wins = Math.round(a.totalMatches * a.winRate);
  const losses = Math.round(a.totalMatches * (1 - a.winRate) * 0.85);
  const draws = Math.max(0, a.totalMatches - wins - losses);
  const streak = Math.max(2, Math.round(a.winRate * 10));
  const peakElo = a.elo + Math.round((1 - a.rank / 15) * 60) + 12;
  const form: ("W" | "L" | "D")[] = Array.from({ length: 5 }, (_, i) =>
    i < Math.round(a.winRate * 5) ? "W" : i < Math.round(a.winRate * 5) + (draws > 0 ? 1 : 0) ? "D" : "L"
  );
  return { wins, losses, draws, streak, peakElo, form };
}

function getUserDetails(u: LeaderboardUser) {
  const userAgents = MOCK_AGENTS.filter((a) => a.ownerUsername === u.username);
  const totalMatches = userAgents.reduce((s, a) => s + a.totalMatches, 0) || Math.round(u.totalEarnings * 8);
  const bestAgent = userAgents.length > 0 ? [...userAgents].sort((a, b) => b.elo - a.elo)[0] : null;
  const overallWinRate =
    userAgents.length > 0
      ? userAgents.reduce((s, a) => s + a.winRate * a.totalMatches, 0) / totalMatches
      : 0.5 + u.rank * -0.03;
  return { totalMatches, bestAgent, overallWinRate, agents: userAgents };
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

/* ── Avatar with initial ───────────────────────────────────── */
function Avatar({ name, gradientFrom, size = "w-12 h-12", textSize = "text-lg" }: { name: string; gradientFrom: string; size?: string; textSize?: string }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br ${gradientFrom} flex items-center justify-center shrink-0 shadow-arena-sm`}>
      <span className={`${textSize} font-extrabold text-white`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

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

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 flex items-center gap-4 border ${rc.border}`} style={{ background: "rgba(245, 240, 235, 0.9)" }}>
        <div className={`w-12 h-12 rounded-xl ${rc.badge} flex items-center justify-center shrink-0`}>
          <span className="font-extrabold text-lg">{rankLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-arena-text-bright truncate">{agent.name}</div>
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
        <StatRow label={t.leaderboard.peakElo} value={formatElo(d.peakElo)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.bestStreak} value={`${d.streak} ${t.leaderboard.winsStreak}`} />
        <StatRow label={t.leaderboard.totalEarnings} value={`${agent.totalEarnings.toFixed(2)} USDC`} accentColor="text-arena-accent" />
      </div>

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
  const d = getUserDetails(user);
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
          <div className={`text-2xl font-extrabold font-mono tabular-nums ${rc.text}`}>{user.totalEarnings.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">USDC</div>
        </div>
      </div>

      <div className="bg-arena-bg-light rounded-xl px-4">
        <StatRow label={t.leaderboard.totalMatches} value={d.totalMatches} />
        <StatRow label={t.leaderboard.overallWinRate} value={formatWinRate(d.overallWinRate)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.agentsDeployed} value={user.agentCount} />
        <StatRow label={t.leaderboard.totalEarnings} value={`${user.totalEarnings.toFixed(2)} USDC`} accentColor="text-arena-accent" />
      </div>

      {d.agents.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-arena-muted mb-2">{t.common.agents}</div>
          <div className="space-y-2">
            {d.agents.map((a) => (
              <div key={a.id} className="bg-arena-bg-light rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-arena-text-bright">{a.name}</div>
                  <div className="text-xs text-arena-muted">
                    {formatWinRate(a.winRate)} {t.leaderboard.winRateShort} &middot; {a.totalMatches} {t.leaderboard.matchesShort}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-arena-primary font-mono tabular-nums">{formatElo(a.elo)}</div>
                  <div className="text-[10px] text-arena-muted">{t.common.elo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                                */
/* ================================================================== */
export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("agents");
  const { t } = useLanguage();
  const [selectedAgent, setSelectedAgent] = useState<LeaderboardAgent | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

  const agents = MOCK_AGENTS;
  const users = MOCK_USERS;

  const top3Agents = agents.slice(0, 3);
  const restAgents = agents.slice(3);
  const top3Users = users.slice(0, 3);
  const restUsers = users.slice(3);

  // Summary stats
  const totalMatches = agents.reduce((s, a) => s + a.totalMatches, 0);
  const avgElo = Math.round(agents.reduce((s, a) => s + a.elo, 0) / agents.length);
  const totalEarnings = agents.reduce((s, a) => s + a.totalEarnings, 0);

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
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg mx-auto animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-arena-text-bright font-mono tabular-nums">{agents.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-arena-muted">{t.common.agents}</div>
            </div>
            <div className="text-center border-x border-arena-border-light">
              <div className="text-xl sm:text-2xl font-extrabold text-arena-primary font-mono tabular-nums">{avgElo}</div>
              <div className="text-[10px] uppercase tracking-wider text-arena-muted">Avg {t.common.elo}</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-arena-accent font-mono tabular-nums">{totalEarnings.toFixed(0)}</div>
              <div className="text-[10px] uppercase tracking-wider text-arena-muted">USDC</div>
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
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ══════════════════════════════════════════════════════ */}
        {/*  AGENTS TAB                                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "agents" && (
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
                      <Avatar
                        name={agent.name}
                        gradientFrom={c.avatarBg}
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
                      <div className="font-bold text-arena-text-bright truncate w-full text-sm">{agent.name}</div>
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
                      <Avatar name={agent.name} gradientFrom={pc.avatarBg} size="w-11 h-11" textSize="text-base" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`${pc.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{pc.label}</span>
                          <span className="font-bold text-arena-text-bright text-sm truncate">{agent.name}</span>
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
                      <span className="text-xs text-arena-accent font-bold tabular-nums">{agent.totalEarnings.toFixed(2)} USDC</span>
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
                          <Avatar name={agent.name} gradientFrom="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-arena-text-bright text-sm truncate group-hover:text-arena-primary transition-colors">{agent.name}</div>
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
                          <span className="text-sm font-bold text-arena-accent tabular-nums">
                            {agent.totalEarnings.toFixed(2)} <span className="text-xs font-medium text-arena-muted">USDC</span>
                          </span>
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
                          <Avatar name={agent.name} gradientFrom="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-arena-text-bright text-sm truncate">{agent.name}</span>
                              <span className="text-arena-primary font-bold text-sm font-mono shrink-0 ml-2 tabular-nums">{formatElo(agent.elo)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-arena-muted">{agent.ownerUsername}</span>
                              <span className="text-xs text-arena-accent font-semibold tabular-nums">{agent.totalEarnings.toFixed(2)} USDC</span>
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
        {tab === "users" && (
          <>
            {/* ── Podium (top 3) desktop ─────────────────────── */}
            <div className="hidden sm:flex items-end gap-5 mt-10 mb-14 h-[360px]">
              {top3Users.map((user, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const c = PODIUM[place];
                const d = getUserDetails(user);
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

                      <Avatar
                        name={user.username}
                        gradientFrom={c.avatarBg}
                        size={place === 1 ? "w-16 h-16" : "w-12 h-12"}
                        textSize={place === 1 ? "text-2xl" : "text-lg"}
                      />

                      <div className={`${c.badgeBg} text-white text-xs font-extrabold px-3.5 py-1 rounded-full mt-3 mb-3 tracking-wide shadow-arena-sm`}>
                        {c.label}
                      </div>

                      <div className={`text-3xl font-extrabold font-mono leading-none ${c.accent} tabular-nums`} style={{ letterSpacing: "-0.02em" }}>
                        {user.totalEarnings.toFixed(2)}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-arena-muted mt-1 mb-4">USDC {t.leaderboard.totalEarnings}</div>

                      <div className="font-bold text-arena-text-bright truncate w-full text-sm">{user.username}</div>
                      <div className="text-xs text-arena-muted mt-0.5">
                        {user.agentCount} {agentPlural(user.agentCount, t)}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mt-4 w-full pt-3 border-t border-arena-border-light/50">
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.winRate}</div>
                          <div className="text-sm font-bold text-arena-text tabular-nums">{formatWinRate(d.overallWinRate)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.matches}</div>
                          <div className="text-sm font-bold text-arena-text tabular-nums">{d.totalMatches}</div>
                        </div>
                      </div>

                      {/* Best agent */}
                      {d.bestAgent && (
                        <div className="mt-3 pt-3 border-t border-arena-border-light/50 w-full">
                          <div className="text-[10px] text-arena-muted uppercase tracking-wide mb-1">Best Agent</div>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-semibold text-arena-text-bright truncate">{d.bestAgent.name}</span>
                            <span className="text-xs font-bold text-arena-primary font-mono tabular-nums">{formatElo(d.bestAgent.elo)}</span>
                          </div>
                        </div>
                      )}
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
                const d = getUserDetails(user);
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`bg-gradient-to-r ${pc.gradient} border ${pc.border} rounded-2xl p-4 cursor-pointer transition-all hover:shadow-arena animate-fade-up`}
                    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={user.username} gradientFrom={pc.avatarBg} size="w-11 h-11" textSize="text-base" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`${pc.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{pc.label}</span>
                          <span className="font-bold text-arena-text-bright text-sm">{user.username}</span>
                        </div>
                        <span className="text-xs text-arena-muted">{user.agentCount} {agentPlural(user.agentCount, t)} &middot; {formatWinRate(d.overallWinRate)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xl font-extrabold font-mono ${pc.accent} tabular-nums`}>{user.totalEarnings.toFixed(2)}</div>
                        <div className="text-[10px] text-arena-muted">USDC</div>
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
                  <div className="col-span-3">{t.leaderboard.player}</div>
                  <div className="col-span-2 text-center">{t.common.winRate}</div>
                  <div className="col-span-2 text-center">{t.common.agents}</div>
                  <div className="col-span-2 text-center">{t.common.matches}</div>
                  <div className="col-span-2 text-right">{t.common.earnings}</div>
                </div>

                {restUsers.map((user) => {
                  const d = getUserDetails(user);
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
                        <div className="col-span-3 flex items-center gap-3">
                          <Avatar name={user.username} gradientFrom="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div>
                            <span className="font-semibold text-arena-text-bright text-sm group-hover:text-arena-primary transition-colors">{user.username}</span>
                            {d.bestAgent && (
                              <div className="text-xs text-arena-muted truncate">
                                Best: {d.bestAgent.name} ({formatElo(d.bestAgent.elo)})
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <MiniRing rate={d.overallWinRate} />
                        </div>
                        <div className="col-span-2 text-center text-sm text-arena-muted tabular-nums">
                          {user.agentCount}
                        </div>
                        <div className="col-span-2 text-center text-sm text-arena-muted tabular-nums">
                          {d.totalMatches}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm font-bold text-arena-accent tabular-nums">
                            {user.totalEarnings.toFixed(2)} <span className="text-xs font-medium text-arena-muted">USDC</span>
                          </span>
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
                          <Avatar name={user.username} gradientFrom="from-arena-primary to-arena-primary-dark" size="w-9 h-9" textSize="text-sm" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-arena-text-bright text-sm">{user.username}</span>
                            <div className="text-xs text-arena-muted">{user.agentCount} {agentPlural(user.agentCount, t)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-arena-accent tabular-nums">
                              {user.totalEarnings.toFixed(2)} <span className="text-xs font-medium">USDC</span>
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <MiniRing rate={d.overallWinRate} size={22} />
                              <span className="text-[10px] text-arena-muted tabular-nums">{d.totalMatches} {t.leaderboard.games}</span>
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
