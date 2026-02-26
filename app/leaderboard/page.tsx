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
// ───────────────────────────────────────────────────────────

const PODIUM_CONFIG = {
  1: {
    order: "order-2",
    height: "h-full",
    ring: "ring-2 ring-amber-400/50",
    glow: "",
    bg: "bg-amber-50",
    border: "border-amber-400",
    badgeBg: "bg-amber-500 text-black",
    accent: "text-amber-600",
    label: "1st",
    medalColor: "#F59E0B",
  },
  2: {
    order: "order-1",
    height: "h-[78%]",
    ring: "",
    glow: "",
    bg: "bg-slate-50",
    border: "border-slate-400",
    badgeBg: "bg-slate-400 text-black",
    accent: "text-slate-500",
    label: "2nd",
    medalColor: "#94A3B8",
  },
  3: {
    order: "order-3",
    height: "h-[70%]",
    ring: "",
    glow: "",
    bg: "bg-orange-50",
    border: "border-orange-400",
    badgeBg: "bg-orange-600 text-white",
    accent: "text-orange-600",
    label: "3rd",
    medalColor: "#C2703E",
  },
} as const;

/* ── Rank color helpers ────────────────────────────────────── */
const RANK_COLORS: Record<number, { badge: string; text: string; bg: string; glow: string; border: string }> = {
  1: { badge: "bg-amber-500 text-black", text: "text-amber-600", bg: "bg-amber-100", glow: "", border: "border-amber-400" },
  2: { badge: "bg-slate-400 text-black", text: "text-slate-500", bg: "bg-slate-100", glow: "", border: "border-slate-400" },
  3: { badge: "bg-orange-600 text-white", text: "text-orange-600", bg: "bg-orange-100", glow: "", border: "border-orange-400" },
};
const DEFAULT_RANK_COLOR = { badge: "bg-arena-primary/10 text-arena-primary", text: "text-arena-primary", bg: "bg-arena-primary/10", glow: "", border: "border-arena-border" };

function getRankColor(rank: number) {
  return RANK_COLORS[rank] || DEFAULT_RANK_COLOR;
}

/* ── Trophy icon ───────────────────────────────────────────── */
function TrophyIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 17C14.7614 17 17 14.7614 17 12V4H7V12C7 14.7614 9.23858 17 12 17Z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 7H19C20.1046 7 21 7.89543 21 9V10C21 11.6569 19.6569 13 18 13H17"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 7H5C3.89543 7 3 7.89543 3 9V10C3 11.6569 4.34315 13 6 13H7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 21H16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M12 17V21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
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

/* ── Form indicator (W / L / D) ───────────────────────────── */
function FormDots({ form }: { form: ("W" | "L" | "D")[] }) {
  const { t } = useLanguage();
  const colors = { W: "bg-emerald-500", L: "bg-rose-500", D: "bg-arena-muted" };
  const labels = { W: t.leaderboard.winLabel, L: t.leaderboard.lossLabel, D: t.leaderboard.drawLabel };
  return (
    <div className="flex items-center gap-2">
      {form.map((r, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-lg ${colors[r]} flex items-center justify-center`}
          title={labels[r]}
        >
          <span className="text-[10px] font-bold text-white">{r}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Agent detail modal content ───────────────────────────── */
function AgentModalContent({ agent }: { agent: LeaderboardAgent }) {
  const { t } = useLanguage();
  const d = getAgentDetails(agent);
  const rc = getRankColor(agent.rank);
  const rankLabel = agent.rank <= 3 ? ["", "1st", "2nd", "3rd"][agent.rank] : `#${agent.rank}`;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className={`rounded-xl p-4 flex items-center gap-4 border ${rc.border} ${rc.glow}`}
        style={{ background: "rgba(245, 240, 235, 0.9)" }}
      >
        <div className={`w-12 h-12 rounded-xl ${rc.badge} flex items-center justify-center shrink-0`}>
          <span className="font-extrabold text-lg">{rankLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-arena-text-bright truncate">{agent.name}</div>
          <div className="text-xs text-arena-muted">{t.common.by} {agent.ownerUsername}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-extrabold font-mono tabular-nums ${rc.text}`}>
            {formatElo(agent.elo)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">{t.common.elo}</div>
        </div>
      </div>

      {/* Stats list */}
      <div className="bg-arena-bg-light rounded-xl px-4">
        <StatRow label={t.common.winRate} value={formatWinRate(agent.winRate)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.totalMatches} value={agent.totalMatches} />
        <StatRow label={t.common.wins} value={d.wins} accentColor={rc.text} />
        <StatRow label={t.common.losses} value={d.losses} />
        <StatRow label={t.common.draws} value={d.draws} />
        <StatRow label={t.leaderboard.peakElo} value={formatElo(d.peakElo)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.bestStreak} value={`${d.streak} ${t.leaderboard.winsStreak}`} />
        <StatRow label={t.leaderboard.totalEarnings} value={`${agent.totalEarnings.toFixed(2)} USDC`} accentColor={rc.text} />
      </div>

      {/* Recent form */}
      <div>
        <div className="text-xs uppercase tracking-wider text-arena-muted mb-2">{t.leaderboard.recentForm}</div>
        <FormDots form={d.form} />
      </div>
    </div>
  );
}

/* ── User detail modal content ────────────────────────────── */
function UserModalContent({ user }: { user: LeaderboardUser }) {
  const { t } = useLanguage();
  const d = getUserDetails(user);
  const rc = getRankColor(user.rank);
  const rankLabel = user.rank <= 3 ? ["", "1st", "2nd", "3rd"][user.rank] : `#${user.rank}`;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className={`rounded-xl p-4 flex items-center gap-4 border ${rc.border} ${rc.glow}`}
        style={{ background: "rgba(245, 240, 235, 0.9)" }}
      >
        <div className={`w-12 h-12 rounded-xl ${rc.badge} flex items-center justify-center shrink-0`}>
          <span className="font-extrabold text-lg">{rankLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-arena-text-bright">{user.username}</div>
          <div className="text-xs text-arena-muted">
            {user.agentCount} {agentPlural(user.agentCount, t)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-extrabold font-mono tabular-nums ${rc.text}`}>
            {user.totalEarnings.toFixed(2)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">USDC</div>
        </div>
      </div>

      {/* Stats list */}
      <div className="bg-arena-bg-light rounded-xl px-4">
        <StatRow label={t.leaderboard.totalMatches} value={d.totalMatches} />
        <StatRow label={t.leaderboard.overallWinRate} value={formatWinRate(d.overallWinRate)} accentColor={rc.text} />
        <StatRow label={t.leaderboard.agentsDeployed} value={user.agentCount} />
        <StatRow label={t.leaderboard.totalEarnings} value={`${user.totalEarnings.toFixed(2)} USDC`} accentColor={rc.text} />
      </div>

      {/* Agents list */}
      {d.agents.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-arena-muted mb-2">{t.common.agents}</div>
          <div className="space-y-2">
            {d.agents.map((a) => (
              <div
                key={a.id}
                className="bg-arena-bg-light rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-arena-text-bright">{a.name}</div>
                  <div className="text-xs text-arena-muted">
                    {formatWinRate(a.winRate)} {t.leaderboard.winRateShort} &middot; {a.totalMatches} {t.leaderboard.matchesShort}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-arena-primary font-mono tabular-nums">
                    {formatElo(a.elo)}
                  </div>
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

/* ── Podium card shell ────────────────────────────────────── */
function PodiumShell({
  place,
  onClick,
  children,
}: {
  place: 1 | 2 | 3;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const c = PODIUM_CONFIG[place];
  return (
    <div className={`${c.order} flex items-end flex-1 min-w-0`}>
      <div
        onClick={onClick}
        className={`${c.height} w-full ${c.bg} border ${c.border} ${c.ring} ${c.glow} rounded-xl p-5 flex flex-col items-center justify-end text-center transition-all duration-200 cursor-pointer hover:shadow-arena`}
      >
        {/* Trophy + Rank badge */}
        <TrophyIcon color={c.medalColor} size={32} />
        <div className={`${c.badgeBg} text-sm font-extrabold px-3.5 py-1 rounded-full mb-4 mt-2 tracking-wide`}>
          {c.label}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Win-rate bar ─────────────────────────────────────────── */
function WinRateBar({ rate }: { rate: number }) {
  const pct = rate * 100;
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-arena-bg-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              pct >= 70
                ? "#059669"
                : pct >= 55
                ? "#5B4FCF"
                : "#9CA3AF",
          }}
        />
      </div>
      <span className="text-xs font-mono text-arena-text w-11 text-right">
        {formatWinRate(rate)}
      </span>
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

  return (
    <div className="min-h-screen">
      {/* ── Agent detail modal ──────────────────────────────── */}
      <Modal
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        title={t.leaderboard.agentStats}
      >
        {selectedAgent && <AgentModalContent agent={selectedAgent} />}
      </Modal>

      {/* ── User detail modal ───────────────────────────────── */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={t.leaderboard.playerStats}
      >
        {selectedUser && <UserModalContent user={selectedUser} />}
      </Modal>

      {/* ── Header ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-arena-text-bright mb-2 font-display">
            {t.leaderboard.title}
          </h1>
          <p className="text-arena-muted-light max-w-md mx-auto">
            {t.leaderboard.subtitle}
          </p>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-1 mt-8 bg-white rounded-xl p-1 inline-flex border border-arena-border">
            <button
              onClick={() => setTab("agents")}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "agents"
                  ? "bg-arena-primary text-white shadow-arena-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              {t.leaderboard.topAgents}
            </button>
            <button
              onClick={() => setTab("users")}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "users"
                  ? "bg-arena-primary text-white shadow-arena-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              {t.leaderboard.topPlayers}
            </button>
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
            <div className="hidden sm:flex items-end gap-4 mt-8 mb-12 h-[340px]">
              {top3Agents.map((agent, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const c = PODIUM_CONFIG[place];
                return (
                  <PodiumShell key={agent.id} place={place} onClick={() => setSelectedAgent(agent)}>
                    <div
                      className={`text-4xl font-extrabold font-mono leading-none ${c.accent}`}
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {formatElo(agent.elo)}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-arena-muted mt-1 mb-5">
                      {t.leaderboard.eloRating}
                    </div>
                    <div className="font-bold text-arena-text-bright truncate w-full">
                      {agent.name}
                    </div>
                    <div className="text-xs text-arena-muted mt-0.5 truncate w-full">
                      {t.common.by} {agent.ownerUsername}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4 w-full pt-4 border-t border-arena-border/50">
                      <div>
                        <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.winRate}</div>
                        <div className="text-sm font-bold text-arena-text tabular-nums">
                          {formatWinRate(agent.winRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.matches}</div>
                        <div className="text-sm font-bold text-arena-text tabular-nums">
                          {agent.totalMatches}
                        </div>
                      </div>
                    </div>
                  </PodiumShell>
                );
              })}
            </div>

            {/* Mobile top-3 */}
            <div className="sm:hidden space-y-3 mt-6 mb-8">
              {top3Agents.map((agent, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const pc = PODIUM_CONFIG[place];
                const medalColors = [
                  "border-amber-500/40 bg-amber-500/5",
                  "border-slate-400/40 bg-slate-400/5",
                  "border-orange-600/40 bg-orange-600/5",
                ];
                const eloColors = ["text-amber-400", "text-slate-300", "text-orange-400"];
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`border rounded-2xl p-4 cursor-pointer transition-all hover:ring-1 hover:ring-arena-primary/30 ${medalColors[i]}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0"><TrophyIcon color={pc.medalColor} size={22} /></span>
                      <span className={`text-2xl font-extrabold font-mono ${eloColors[i]} tabular-nums`}>
                        {formatElo(agent.elo)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-arena-text-bright text-sm truncate">
                          {agent.name}
                        </div>
                        <span className="text-xs text-arena-muted">{t.common.by} {agent.ownerUsername}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-arena-muted">{t.common.winRate}</div>
                        <div className="text-sm font-bold text-arena-text tabular-nums">
                          {formatWinRate(agent.winRate)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Rest of rankings ──────────────────────────── */}
            {restAgents.length > 0 && (
              <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider text-arena-muted bg-arena-bg-light border-b border-arena-border font-medium">
                  <div className="col-span-1">{t.leaderboard.rank}</div>
                  <div className="col-span-3">{t.leaderboard.agentSingular}</div>
                  <div className="col-span-1 text-center">{t.common.elo}</div>
                  <div className="col-span-3">{t.common.winRate}</div>
                  <div className="col-span-2 text-center">{t.common.matches}</div>
                  <div className="col-span-2 text-right">{t.common.earnings}</div>
                </div>

                {restAgents.map((agent) => (
                  <div key={agent.id}>
                    {/* Desktop row */}
                    <div
                      onClick={() => setSelectedAgent(agent)}
                      className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 border-b border-arena-border/40 items-center cursor-pointer hover:bg-arena-primary/5 transition-colors"
                    >
                      <div className="col-span-1">
                        <span className="text-lg font-extrabold font-mono tabular-nums text-arena-text-bright">
                          {agent.rank}
                        </span>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <div className="font-semibold text-arena-text-bright text-sm truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-arena-muted truncate">
                          {agent.ownerUsername}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-arena-primary font-bold text-sm font-mono tabular-nums">
                          {formatElo(agent.elo)}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <WinRateBar rate={agent.winRate} />
                      </div>
                      <div className="col-span-2 text-center text-sm text-arena-muted-light tabular-nums">
                        {agent.totalMatches}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-arena-accent tabular-nums">
                          {agent.totalEarnings.toFixed(2)} <span className="text-xs font-medium">USDC</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div
                      onClick={() => setSelectedAgent(agent)}
                      className="sm:hidden px-4 py-4 border-b border-arena-border/40 cursor-pointer active:bg-arena-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base font-extrabold font-mono w-7 text-center shrink-0 tabular-nums text-arena-text-bright">
                          {agent.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-arena-text-bright text-sm truncate">
                              {agent.name}
                            </span>
                            <span className="text-arena-primary font-bold text-sm font-mono shrink-0 ml-2 tabular-nums">
                              {formatElo(agent.elo)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-arena-muted">{agent.ownerUsername}</span>
                            <span className="text-xs text-arena-muted tabular-nums">
                              {formatWinRate(agent.winRate)} &middot; {agent.totalMatches} {t.leaderboard.games}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
            <div className="hidden sm:flex items-end gap-4 mt-8 mb-12 h-[340px]">
              {top3Users.map((user, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const c = PODIUM_CONFIG[place];
                return (
                  <PodiumShell key={user.id} place={place} onClick={() => setSelectedUser(user)}>
                    <div
                      className={`text-4xl font-extrabold font-mono leading-none ${c.accent}`}
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      {user.totalEarnings.toFixed(2)}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-arena-muted mt-1 mb-5">
                      {t.leaderboard.totalEarnings}
                    </div>
                    <div className="font-bold text-arena-text-bright truncate w-full">
                      {user.username}
                    </div>
                    <div className="text-xs text-arena-muted mt-0.5">
                      {user.agentCount} {agentPlural(user.agentCount, t)}
                    </div>
                    <div className="mt-4 w-full pt-4 border-t border-arena-border/50">
                      <div className="text-[10px] text-arena-muted uppercase tracking-wide">{t.common.agents}</div>
                      <div className="text-sm font-bold text-arena-text tabular-nums">
                        {user.agentCount}
                      </div>
                    </div>
                  </PodiumShell>
                );
              })}
            </div>

            {/* Mobile top-3 */}
            <div className="sm:hidden space-y-3 mt-6 mb-8">
              {top3Users.map((user, i) => {
                const place = (i + 1) as 1 | 2 | 3;
                const pc = PODIUM_CONFIG[place];
                const medalColors = [
                  "border-amber-500/40 bg-amber-500/5",
                  "border-slate-400/40 bg-slate-400/5",
                  "border-orange-600/40 bg-orange-600/5",
                ];
                const accentColors = ["text-amber-400", "text-slate-300", "text-orange-400"];
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`border rounded-2xl p-4 cursor-pointer transition-all hover:ring-1 hover:ring-arena-primary/30 ${medalColors[i]}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span><TrophyIcon color={pc.medalColor} size={22} /></span>
                        <span className="font-bold text-arena-text-bright text-sm">
                          {user.username}
                        </span>
                      </div>
                      <span className={`text-xl font-extrabold tabular-nums ${accentColors[i]}`}>
                        {user.totalEarnings.toFixed(2)} <span className="text-xs font-medium">USDC</span>
                      </span>
                    </div>
                    <div className="text-xs text-arena-muted mt-1 ml-10">
                      {user.agentCount} {agentPlural(user.agentCount, t)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Rest of rankings ──────────────────────────── */}
            {restUsers.length > 0 && (
              <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider text-arena-muted bg-arena-bg-light border-b border-arena-border font-medium">
                  <div className="col-span-1">{t.leaderboard.rank}</div>
                  <div className="col-span-5">{t.leaderboard.player}</div>
                  <div className="col-span-3 text-center">{t.common.agents}</div>
                  <div className="col-span-3 text-right">{t.common.earnings}</div>
                </div>

                {restUsers.map((user) => (
                  <div key={user.id}>
                    {/* Desktop */}
                    <div
                      onClick={() => setSelectedUser(user)}
                      className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 border-b border-arena-border/40 items-center cursor-pointer hover:bg-arena-primary/5 transition-colors"
                    >
                      <div className="col-span-1">
                        <span className="text-lg font-extrabold font-mono tabular-nums text-arena-text-bright">
                          {user.rank}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <span className="font-semibold text-arena-text-bright text-sm">
                          {user.username}
                        </span>
                      </div>
                      <div className="col-span-3 text-center text-sm text-arena-muted-light tabular-nums">
                        {user.agentCount}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-sm font-bold text-arena-accent tabular-nums">
                          {user.totalEarnings.toFixed(2)} <span className="text-xs font-medium">USDC</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div
                      onClick={() => setSelectedUser(user)}
                      className="sm:hidden px-4 py-4 border-b border-arena-border/40 cursor-pointer active:bg-arena-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base font-extrabold font-mono w-7 text-center shrink-0 tabular-nums text-arena-text-bright">
                          {user.rank}
                        </span>
                        <span className="flex-1 font-medium text-arena-text-bright text-sm">
                          {user.username}
                        </span>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-arena-accent tabular-nums">
                            {user.totalEarnings.toFixed(2)} <span className="text-xs font-medium">USDC</span>
                          </div>
                          <div className="text-xs text-arena-muted">
                            {user.agentCount} {agentPlural(user.agentCount, t)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
