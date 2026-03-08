"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  formatRelativeTime,
  formatWinRate,
  formatElo,
  normalizeMatchAgents,
  formatUsdEquivalent,
  truncateAddress,
} from "@/lib/utils";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import { getExplorerTxUrl } from "@/lib/api";
import type { Agent, Match, PlayBalance, PendingClaim, Chain } from "@/lib/types";

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
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
function IconWallet({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6v6zm0 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6" />
    </svg>
  );
}
function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}
function IconSend({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Avatar with initial ── */
function Avatar({ name, size = "w-10 h-10", textSize = "text-base", gradient = "from-arena-primary to-arena-primary-dark" }: { name: string; size?: string; textSize?: string; gradient?: string }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`} style={{ boxShadow: "0 2px 8px rgba(91, 79, 207, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
      <span className={`${textSize} font-extrabold text-white drop-shadow-sm`}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/* ── Win Rate Ring ── */
function WinRateRing({ rate, size = 110 }: { rate: number; size?: number }) {
  const pct = Math.round(rate * 100);
  const inner = size - 16;
  const color = pct >= 60 ? "#059669" : pct >= 40 ? "#5B4FCF" : "#DC2626";
  const colorLight = pct >= 60 ? "#34D399" : pct >= 40 ? "#7B6FE0" : "#F87171";
  const deg = pct * 3.6;
  return (
    <div
      className="stat-ring shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} 0deg, ${colorLight} ${deg * 0.6}deg, ${color} ${deg}deg, rgba(212, 208, 200, 0.25) ${deg}deg)`,
        boxShadow: `0 0 20px ${color}18, 0 4px 12px rgba(0,0,0,0.06)`,
      }}
    >
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <div className="text-center">
          <span className="text-2xl font-extrabold font-mono text-arena-text-bright tabular-nums">{pct}</span>
          <span className="text-[11px] text-arena-muted font-semibold ml-0.5">%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini Win Rate Ring ── */
function MiniRing({ rate, size = 32 }: { rate: number; size?: number }) {
  const pct = rate * 100;
  const color = pct >= 60 ? "#059669" : pct >= 40 ? "#5B4FCF" : "#DC2626";
  const colorLight = pct >= 60 ? "#34D399" : pct >= 40 ? "#7B6FE0" : "#F87171";
  const inner = size - 6;
  const deg = pct * 3.6;
  return (
    <div className="stat-ring shrink-0" style={{ width: size, height: size, background: `conic-gradient(${color} 0deg, ${colorLight} ${deg * 0.6}deg, ${color} ${deg}deg, rgba(212, 208, 200, 0.25) ${deg}deg)`, boxShadow: `0 0 8px ${color}12` }}>
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <span className="text-[9px] font-bold tabular-nums text-arena-text-bright">{Math.round(pct)}</span>
      </div>
    </div>
  );
}

/* ── W/L/D Horizontal Bar ── */
function WLDBar({ wins, losses, draws, height = "h-2" }: { wins: number; losses: number; draws: number; height?: string }) {
  const total = wins + losses + draws;
  if (total === 0) return <div className={`w-full ${height} rounded-full bg-arena-border-light/40`} style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }} />;
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden flex bg-arena-border-light/25`} style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
      {wPct > 0 && <div className="h-full bg-gradient-to-r from-arena-success to-emerald-400 transition-all duration-700" style={{ width: `${wPct}%` }} />}
      {dPct > 0 && <div className="h-full bg-arena-muted-light/50 transition-all duration-700" style={{ width: `${dPct}%` }} />}
      {lPct > 0 && <div className="h-full bg-gradient-to-r from-arena-danger/70 to-arena-danger/50 transition-all duration-700" style={{ width: `${lPct}%` }} />}
    </div>
  );
}

/* ── Stat Card with icon + accent stripe ── */
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
          <div className="text-[11px] text-arena-muted uppercase tracking-widest font-mono font-semibold mb-2">{label}</div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-arena-text-bright leading-none">{value}</span>
            {sub && <span className="text-[11px] text-arena-muted font-mono font-medium tracking-wider mb-0.5">{sub}</span>}
          </div>
          {children}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentColor}/10 ring-1 ring-inset ${accentColor}/5`}>
          <div className={accentColor.replace("bg-", "text-")}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Onboarding empty state ── */
function OnboardingState({ t }: { t: any }) {
  const steps = [
    { num: "01", title: t.home.step1Title, desc: t.home.step1Desc, done: true },
    { num: "02", title: t.home.step2Title, desc: t.home.step2Desc, href: "/agents/new", cta: t.dashboard.createAgent },
    { num: "03", title: t.home.step3Title, desc: t.home.step3Desc, href: "/matchmaking", cta: t.dashboard.joinQueue },
    { num: "04", title: t.home.step4Title, desc: t.home.step4Desc },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div
          key={step.num}
          className="dash-glass-card rounded-xl p-5 opacity-0 animate-fade-up"
          style={{ animationDelay: `${0.2 + i * 0.08}s`, animationFillMode: "both" }}
        >
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono shrink-0 ${
              step.done ? "bg-arena-success/15 text-arena-success" : "bg-arena-primary/10 text-arena-primary"
            }`}>
              {step.done ? <IconCheck /> : step.num}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-arena-text-bright mb-0.5">{step.title}</h4>
              <p className="text-sm text-arena-muted leading-relaxed">{step.desc}</p>
              {step.href && step.cta && (
                <Link href={step.href}>
                  <Button size="sm" className="mt-3">{step.cta}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════ */
function DashboardContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useLanguage();
  const { priceUsd } = useAlphaPrice();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Play Wallet state ── */
  const [playBalance, setPlayBalance] = useState<PlayBalance | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  /* ── Pending Claims state ── */
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ matchId: string; type: "success" | "error"; text: string; txHash?: string; chain?: Chain } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsRes, matchesRes, balRes, claimsRes] = await Promise.allSettled([
          api.getAgents(),
          api.getMatches({ limit: 6 }),
          api.playBalance(),
          api.getMyPendingClaims(),
        ]);
        if (agentsRes.status === "fulfilled") setAgents(agentsRes.value.agents || []);
        if (matchesRes.status === "fulfilled")
          setRecentMatches(
            (matchesRes.value.matches || []).map((m) => {
              const raw = m as any;
              return {
                ...m,
                id: m.id || raw._id,
                winnerId: m.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || undefined,
              };
            })
          );
        if (balRes.status === "fulfilled") setPlayBalance(balRes.value);
        if (claimsRes.status === "fulfilled") setPendingClaims(claimsRes.value.claims || []);
      } catch {
        /* silently handle */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCopyAddress = async () => {
    if (!playBalance?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(playBalance.walletAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handlePlayWithdraw = async () => {
    const value = parseFloat(withdrawAmt);
    if (!value || value <= 0) { setWithdrawError(t.matchmaking.insufficientBalance); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawAddr)) { setWithdrawError("Invalid address"); return; }
    setWithdrawLoading(true);
    setWithdrawError("");
    setWithdrawSuccess("");
    try {
      await api.playWithdraw(value, withdrawAddr);
      setWithdrawSuccess(t.dashboard.withdrawSuccess);
      setWithdrawAmt("");
      setWithdrawAddr("");
      const bal = await api.playBalance();
      setPlayBalance(bal);
    } catch (err: any) {
      setWithdrawError(err?.message || "Withdraw failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleClaimBet = async (matchId: string, chain: Chain) => {
    setClaimingId(matchId);
    setClaimMsg(null);
    try {
      const res = await api.claimBet(matchId);
      setClaimMsg({ matchId, type: "success", text: t.betting.claimSuccess, txHash: res.txHash, chain: res.chain || chain });
      setPendingClaims((prev) => prev.filter((c) => c.matchId !== matchId));
    } catch (err) {
      setClaimMsg({ matchId, type: "error", text: err instanceof Error ? err.message : t.betting.claimFailed });
    } finally {
      setClaimingId(null);
    }
  };

  const stats = useMemo(() => {
    const active = agents.filter((a) => a.status === "in_match").length;
    const queued = agents.filter((a) => a.status === "queued" || (a.autoPlay && a.status === "idle")).length;
    const earnings = agents.reduce((s, a) => s + (a.stats?.totalEarnings || 0), 0);
    const bestElo = agents.length > 0 ? Math.max(...agents.map((a) => a.elo || 0)) : 0;
    const wins = agents.reduce((s, a) => s + (a.stats?.wins || 0), 0);
    const losses = agents.reduce((s, a) => s + (a.stats?.losses || 0), 0);
    const draws = agents.reduce((s, a) => s + (a.stats?.draws || 0), 0);
    const total = wins + losses + draws;
    const winRate = total > 0 ? wins / total : 0;
    const bestAgent = agents.length > 0
      ? agents.reduce((best, a) => ((a.elo || 0) > (best.elo || 0) ? a : best), agents[0])
      : null;
    return { active, queued, earnings, bestElo, wins, losses, draws, total, winRate, bestAgent };
  }, [agents]);

  /* Time-based greeting */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.goodMorning;
    if (hour < 18) return t.dashboard.goodAfternoon;
    return t.dashboard.goodEvening;
  }, [t]);

  /* Dynamic subtitle */
  const subtitle = useMemo(() => {
    if (!agents.length) return t.dashboard.readyToCompete;
    if (stats.active > 0)
      return `${stats.active} ${t.dashboard.matchesLive}`;
    return `${agents.length} ${t.dashboard.agentsCompeting}`;
  }, [agents, stats, t]);

  if (loading) return <PageSpinner />;

  const hasAgents = agents.length > 0;

  return (
    <div className="page-container">

      {/* ═══════════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════════ */}
      <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        {/* Gradient orbs */}
        <div className="dash-hero-orb w-56 h-56 bg-arena-primary/10 -top-24 -right-14 animate-pulse-soft" />
        <div className="dash-hero-orb w-40 h-40 bg-arena-accent/8 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />
        <div className="dash-hero-orb w-24 h-24 bg-arena-success/6 top-4 left-1/3 animate-pulse-soft" style={{ animationDelay: "3.5s" }} />

        <div className="relative z-10">
          {/* Top row: avatar + greeting + CTAs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
            {/* Avatar + greeting */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-arena-primary to-arena-accent flex items-center justify-center ring-4 ring-arena-primary/10" style={{ boxShadow: "0 4px 16px rgba(91, 79, 207, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">{user?.username?.charAt(0).toUpperCase()}</span>
                </div>
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-arena-success border-[2.5px] border-white shadow-sm" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright truncate leading-tight">
                  {greeting}, <span className="text-arena-primary">{user?.username}</span>
                </h1>
                <p className="text-sm text-arena-muted mt-1 flex items-center gap-1.5">
                  {stats.active > 0 && (
                    <span className="relative inline-flex w-2 h-2 shrink-0">
                      <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-60" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-arena-success" />
                    </span>
                  )}
                  {subtitle}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link href="/agents/new">
                <Button>
                  <span className="flex items-center gap-2">
                    <IconPlus className="w-4 h-4" />
                    {t.dashboard.createAgent}
                  </span>
                </Button>
              </Link>
              <Link href="/matchmaking">
                <Button variant="outline">
                  <span className="flex items-center gap-2">
                    <IconBolt className="w-4 h-4" />
                    {t.dashboard.joinQueue}
                  </span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats pills */}
          {hasAgents ? (
            <div className="flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
                  <IconUsers className="w-3.5 h-3.5 text-arena-primary" />
                </div>
                <div>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-arena-text-bright leading-none">{agents.length}</span>
                  <span className="text-[10px] text-arena-muted uppercase tracking-wider font-semibold ml-1.5">{t.common.agents}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-arena-success/10 flex items-center justify-center ring-1 ring-inset ring-arena-success/5">
                  <IconTrophy className="w-3.5 h-3.5 text-arena-success" />
                </div>
                <div>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-arena-success leading-none">{stats.wins}</span>
                  <span className="text-[10px] text-arena-muted uppercase tracking-wider font-semibold ml-1.5">{t.common.wins}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-arena-accent/10 flex items-center justify-center ring-1 ring-inset ring-arena-accent/5">
                  <IconCoin className="w-3.5 h-3.5 text-arena-accent" />
                </div>
                <div>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-arena-accent leading-none">{stats.earnings.toFixed(2)}</span>
                  <span className="text-[10px] text-arena-muted uppercase tracking-wider font-semibold ml-1.5">ALPHA</span>
                </div>
              </div>
              {stats.active > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-arena-success/5 border border-arena-success/20 rounded-xl">
                  <span className="relative w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-arena-success" />
                    <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-50" />
                  </span>
                  <span className="text-xs font-semibold text-arena-success">
                    {stats.active} {t.common.live}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-arena-muted text-sm">{t.dashboard.overview}</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          NO-AGENTS ONBOARDING
          ═══════════════════════════════════════════════════ */}
      {!hasAgents && (
        <div className="mb-8">
          <h2 className="text-lg font-display font-semibold text-arena-text-bright mb-4 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
            {t.home.howItWorks}
          </h2>
          <OnboardingState t={t} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STATS GRID
          ═══════════════════════════════════════════════════ */}
      {hasAgents && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <DashStat
            label={t.dashboard.yourAgents}
            value={agents.length}
            icon={<IconUsers className="w-4 h-4" />}
            accentColor="bg-arena-primary"
            delay={0.08}
          />
          <DashStat
            label={t.dashboard.activeMatches}
            value={stats.active}
            icon={<IconBolt className="w-4 h-4" />}
            accentColor="bg-arena-success"
            delay={0.12}
          >
            {stats.active > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative w-2 h-2 live-dot">
                  <span className="absolute inset-0 rounded-full bg-arena-success" />
                </span>
                <span className="text-[10px] text-arena-success font-mono uppercase tracking-wider">{t.common.live}</span>
              </div>
            )}
          </DashStat>
          <DashStat
            label={t.dashboard.inQueue}
            value={stats.queued}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            accentColor="bg-amber-400"
            delay={0.16}
          />
          <DashStat
            label={t.dashboard.totalEarnings}
            value={stats.earnings.toFixed(2)}
            sub="ALPHA"
            icon={<IconCoin className="w-4 h-4" />}
            accentColor="bg-arena-accent"
            delay={0.2}
          >
            {(() => { const usd = formatUsdEquivalent(stats.earnings, priceUsd); return usd ? <div className="text-[10px] text-arena-muted mt-1">{usd}</div> : null; })()}
          </DashStat>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PERFORMANCE + BEST AGENT (2-col)
          ═══════════════════════════════════════════════════ */}
      {hasAgents && stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
          {/* Overall Performance — 3 cols wide */}
          <div
            className="lg:col-span-3 dash-glass-card rounded-2xl p-6 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.18s", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] text-arena-text font-semibold uppercase tracking-widest font-mono">
                {t.leaderboard.overallWinRate}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-arena-muted">
                <div className="w-2 h-2 rounded-full bg-arena-success" />
                {stats.wins}W
                <div className="w-2 h-2 rounded-full bg-arena-muted-light/60 ml-1" />
                {stats.draws}D
                <div className="w-2 h-2 rounded-full bg-arena-danger/60 ml-1" />
                {stats.losses}L
              </div>
            </div>

            <div className="flex items-center gap-8">
              <WinRateRing rate={stats.winRate} />
              <div className="flex-1 space-y-4">
                {/* WLD Bar */}
                <div>
                  <WLDBar wins={stats.wins} losses={stats.losses} draws={stats.draws} height="h-3" />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-success" />
                      <span className="font-mono font-semibold text-arena-text-bright">{stats.wins}</span>
                      <span className="text-arena-muted">{t.common.wins}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-muted-light/60" />
                      <span className="font-mono font-semibold text-arena-text-bright">{stats.draws}</span>
                      <span className="text-arena-muted">{t.common.draws}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-danger/60" />
                      <span className="font-mono font-semibold text-arena-text-bright">{stats.losses}</span>
                      <span className="text-arena-muted">{t.common.losses}</span>
                    </div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-arena-border-light/40">
                  <div>
                    <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">{t.common.matches}</div>
                    <div className="text-xl font-extrabold text-arena-text-bright font-mono tabular-nums">{stats.total}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">Best {t.common.elo}</div>
                    <div className="text-xl font-extrabold text-arena-primary font-mono tabular-nums">{formatElo(stats.bestElo)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">{t.common.earnings}</div>
                    <div className="text-xl font-extrabold text-arena-accent font-mono tabular-nums">{stats.earnings.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Best Agent Spotlight — 2 cols */}
          {stats.bestAgent && (
            <div
              className="lg:col-span-2 dash-glass-card rounded-2xl p-6 cursor-pointer opacity-0 animate-fade-up group"
              style={{ animationDelay: "0.22s", animationFillMode: "both" }}
              onClick={() => router.push(`/agents/${stats.bestAgent!.id}`)}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-arena-muted uppercase tracking-widest font-mono">Top Agent</h3>
                <IconStar className="w-5 h-5 text-arena-accent" />
              </div>

              <div className="flex items-center gap-4 mb-5">
                <Avatar
                  name={stats.bestAgent.name}
                  size="w-14 h-14"
                  textSize="text-xl"
                  gradient="from-arena-primary to-arena-accent"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-arena-text-bright text-lg truncate group-hover:text-arena-primary transition-colors">
                      {stats.bestAgent.name}
                    </h4>
                    <Badge status={stats.bestAgent.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-arena-muted">
                    {stats.bestAgent.type === "openclaw" && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 rounded">OC</span>
                    )}
                    {stats.bestAgent.gameTypes.map((gt) => (
                      <span key={gt} className="capitalize font-mono">{gt}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-arena-border-light/40">
                <div>
                  <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">{t.common.elo}</div>
                  <div className="text-xl font-extrabold text-arena-primary font-mono tabular-nums">{formatElo(stats.bestAgent.elo)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">{t.common.winRate}</div>
                  <div className="text-xl font-extrabold text-arena-text-bright font-mono tabular-nums">{formatWinRate(stats.bestAgent.stats?.winRate || 0)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-arena-muted uppercase tracking-wider font-semibold">{t.common.earnings}</div>
                  <div className="text-xl font-extrabold text-arena-accent font-mono tabular-nums">{(stats.bestAgent.stats?.totalEarnings || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* View arrow */}
              <div className="flex items-center justify-end mt-4 text-xs text-arena-muted group-hover:text-arena-primary transition-colors">
                <span className="mr-1">View agent</span>
                <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PLAY WALLET
          ═══════════════════════════════════════════════════ */}
      {playBalance && (
        <div
          className="dash-glass-card rounded-2xl p-6 mb-8 opacity-0 animate-fade-up"
          style={{ animationDelay: "0.22s", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
                <IconWallet className="w-5 h-5 text-arena-primary" />
              </div>
              <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">
                {t.dashboard.playWallet}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Balance + Address */}
            <div className="space-y-4">
              {/* Balances */}
              <div className="flex items-end gap-5">
                <div>
                  <span className="text-2xl font-bold font-mono tabular-nums text-arena-primary">{playBalance.alpha}</span>
                  <span className="text-xs text-arena-muted ml-1">ALPHA</span>
                  {(() => { const usd = formatUsdEquivalent(parseFloat(playBalance.alpha) || 0, priceUsd); return usd ? <span className="text-xs text-arena-muted ml-2">({usd})</span> : null; })()}
                </div>
                <div>
                  <span className="text-sm font-mono tabular-nums text-arena-muted">{playBalance.eth}</span>
                  <span className="text-xs text-arena-muted ml-1">ETH</span>
                </div>
              </div>

              {/* Deposit address + copy */}
              {playBalance.walletAddress && (
                <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">{t.play.depositAddress}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-arena-text break-all">{truncateAddress(playBalance.walletAddress, 10)}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-arena-primary/10 text-arena-primary hover:bg-arena-primary/20 transition-colors"
                    >
                      {addressCopied ? (
                        <>
                          <IconCheck className="w-3 h-3" />
                          {t.matchDetail.copied}
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Withdraw */}
            <div className="space-y-2">
              <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">{t.play.withdraw} ALPHA</div>
              <input
                type="text"
                value={withdrawAddr}
                onChange={(e) => { setWithdrawAddr(e.target.value); setWithdrawError(""); setWithdrawSuccess(""); }}
                placeholder={`${t.dashboard.withdrawTo} (0x...)`}
                className="w-full px-3 py-2 bg-white border border-arena-border-light rounded-lg text-arena-text text-sm font-mono placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={withdrawAmt}
                  onChange={(e) => { setWithdrawAmt(e.target.value); setWithdrawError(""); setWithdrawSuccess(""); }}
                  placeholder={t.dashboard.withdrawAmount}
                  className="flex-1 px-3 py-2 bg-white border border-arena-border-light rounded-lg text-arena-text text-sm font-mono placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all"
                />
                <Button
                  size="sm"
                  onClick={handlePlayWithdraw}
                  disabled={withdrawLoading || !withdrawAmt || !withdrawAddr}
                  isLoading={withdrawLoading}
                >
                  <span className="flex items-center gap-1.5">
                    <IconSend className="w-3.5 h-3.5" />
                    {withdrawLoading ? t.dashboard.withdrawing : t.dashboard.withdrawBtn}
                  </span>
                </Button>
              </div>
              {withdrawError && <p className="text-xs text-arena-danger mt-1">{withdrawError}</p>}
              {withdrawSuccess && <p className="text-xs text-arena-success mt-1">{withdrawSuccess}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          PENDING CLAIMS
          ═══════════════════════════════════════════════════ */}
      {pendingClaims.length > 0 && (
        <div
          className="dash-glass-card rounded-2xl p-6 mb-8 opacity-0 animate-fade-up ring-1 ring-arena-accent/20"
          style={{ animationDelay: "0.24s", animationFillMode: "both" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-arena-accent/10 flex items-center justify-center ring-1 ring-inset ring-arena-accent/5">
              <IconCoin className="w-5 h-5 text-arena-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">
                {t.betting.pendingClaims}
              </h3>
              <p className="text-xs text-arena-muted">{pendingClaims.length} {t.betting.unclaimedBets}</p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingClaims.map((claim) => (
              <div
                key={claim.matchId}
                className="flex items-center justify-between gap-4 p-4 bg-white/50 border border-arena-border-light/40 rounded-xl"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-arena-text-bright capitalize">
                      {claim.gameType}
                    </span>
                    <span className="text-[10px] font-mono text-arena-muted px-1.5 py-0.5 bg-arena-bg/50 rounded">
                      {claim.matchId.slice(0, 8)}...
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      claim.chain === "celo"
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {claim.chain === "celo" ? "Celo" : "Base"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-arena-muted font-mono">
                      {t.betting.yourTotal}: {(parseFloat(claim.betOnA || "0") + parseFloat(claim.betOnB || "0")).toFixed(2)} ALPHA
                    </span>
                    {claim.winnings > 0 && (
                      <span className="text-xs font-semibold text-arena-success font-mono">
                        +{claim.winnings.toFixed(2)} ALPHA
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                      claim.outcome === "won" ? "bg-arena-success/10 text-arena-success" :
                      claim.outcome === "refund" ? "bg-arena-muted/10 text-arena-muted" :
                      "bg-arena-accent/10 text-arena-accent"
                    }`}>
                      {claim.outcome === "won" ? t.common.won : claim.outcome === "refund" ? t.betting.refunded : claim.outcome}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/matches/${claim.matchId}`}>
                    <Button variant="ghost" size="sm">
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => handleClaimBet(claim.matchId, claim.chain)}
                    disabled={claimingId === claim.matchId}
                    isLoading={claimingId === claim.matchId}
                  >
                    {claimingId === claim.matchId ? t.betting.claiming : claim.outcome === "refund" ? t.betting.claimRefund : t.betting.claimWinnings}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Claim feedback */}
          {claimMsg && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              claimMsg.type === "success" ? "bg-arena-success/10 text-arena-success" : "bg-arena-danger/10 text-arena-danger"
            }`}>
              {claimMsg.text}
              {claimMsg.txHash && claimMsg.chain && (
                <a
                  href={getExplorerTxUrl(claimMsg.txHash, claimMsg.chain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline text-xs"
                >
                  {t.common.viewOnExplorer}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          QUICK ACTIONS
          ═══════════════════════════════════════════════════ */}
      {hasAgents && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              href: "/agents/new",
              icon: <IconPlus />,
              label: t.dashboard.createAgent,
              desc: t.dashboard.deployNew,
              accent: "bg-arena-primary/10 text-arena-primary",
              delay: 0.24,
            },
            {
              href: "/matchmaking",
              icon: <IconBolt />,
              label: t.dashboard.joinQueue,
              desc: t.dashboard.enterMatchmaking,
              accent: "bg-arena-accent/10 text-arena-accent",
              delay: 0.28,
            },
            {
              href: "/leaderboard",
              icon: <IconChart />,
              label: t.dashboard.leaderboard,
              desc: t.dashboard.viewRankings,
              accent: "bg-arena-success/10 text-arena-success",
              delay: 0.32,
            },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div
                className="dash-glass-card rounded-xl p-5 group cursor-pointer opacity-0 animate-fade-up"
                style={{ animationDelay: `${action.delay}s`, animationFillMode: "both" }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action.accent}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-arena-text-bright group-hover:text-arena-primary transition-colors">{action.label}</div>
                    <div className="text-xs text-arena-muted mt-0.5">{action.desc}</div>
                  </div>
                  <IconArrowRight className="w-4 h-4 text-arena-muted-light group-hover:text-arena-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          YOUR AGENTS
          ═══════════════════════════════════════════════════ */}
      {hasAgents && (
        <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-arena-text-bright">{t.dashboard.yourAgents}</h2>
            <Link href="/agents">
              <Button variant="ghost" size="sm">
                <span className="flex items-center gap-1">
                  {t.common.viewAll}
                  <IconArrowRight className="w-3.5 h-3.5" />
                </span>
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 6).map((agent, i) => {
              const w = agent.stats?.wins || 0;
              const l = agent.stats?.losses || 0;
              const d = agent.stats?.draws || 0;
              const isBest = stats.bestAgent?.id === agent.id;
              const isLive = agent.status === "in_match";

              return (
                <div
                  key={agent.id}
                  className={`dash-glass-card rounded-xl p-5 cursor-pointer opacity-0 animate-fade-up ${
                    isBest ? "ring-1 ring-arena-primary/15" : ""
                  }`}
                  style={{ animationDelay: `${0.35 + i * 0.06}s`, animationFillMode: "both" }}
                  onClick={() => router.push(`/agents/${agent.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <Avatar
                          name={agent.name}
                          size="w-10 h-10"
                          textSize="text-sm"
                          gradient={isBest ? "from-arena-primary to-arena-accent" : "from-arena-primary to-arena-primary-dark"}
                        />
                        {isLive && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-arena-success border-2 border-white">
                            <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-60" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-arena-text-bright truncate text-sm leading-tight">
                          {isBest && <IconStar className="w-3.5 h-3.5 text-arena-accent inline mr-1 -mt-0.5" />}
                          {agent.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {agent.type === "openclaw" && (
                            <span className="px-1 py-0 text-[9px] font-mono bg-purple-50 text-purple-500 rounded">OC</span>
                          )}
                          <span className="text-[10px] text-arena-muted font-mono">{formatElo(agent.elo)} ELO</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {agent.status === "idle" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-muted-light idle-pulse" />
                      )}
                      <Badge status={agent.autoPlay && agent.status === "idle" ? "auto-play" : agent.status} />
                    </div>
                  </div>

                  {/* WLD Bar */}
                  <WLDBar wins={w} losses={l} draws={d} height="h-1.5" />

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-arena-success font-mono font-semibold">{w}W</span>
                      <span className="text-arena-danger/70 font-mono font-semibold">{l}L</span>
                      <span className="text-arena-muted font-mono">{d}D</span>
                    </div>
                    <MiniRing rate={agent.stats?.winRate || 0} size={28} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          RECENT MATCHES (Timeline)
          ═══════════════════════════════════════════════════ */}
      <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-arena-text-bright">{t.dashboard.recentMatches}</h2>
          <Link href="/matches">
            <Button variant="ghost" size="sm">
              <span className="flex items-center gap-1">
                {t.common.viewAll}
                <IconArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className="dash-glass-card rounded-2xl">
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                <IconBolt className="w-8 h-8 text-arena-primary" />
              </div>
              <p className="text-arena-text-bright font-semibold mb-1">{t.dashboard.noMatchesYet}</p>
              <p className="text-sm text-arena-muted mb-6 max-w-xs mx-auto">
                {hasAgents ? t.matchmaking.subtitle : t.agents.noAgentsDesc}
              </p>
              <Link href={hasAgents ? "/matchmaking" : "/agents/new"}>
                <Button variant="secondary" size="sm">
                  {hasAgents ? t.dashboard.startFirst : t.dashboard.createAgent}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {recentMatches.map((match, i) => {
              const agentsArr = normalizeMatchAgents(match.agents);
              const myAgent = agentsArr.find((a) => agents.some((ag) => ag.id === a.agentId));
              const myAgentIdx = myAgent ? agentsArr.indexOf(myAgent) : -1;
              const sides = ["a", "b", "c", "d"];
              const isWinner = myAgent && (match.winnerId === myAgent.agentId || match.winnerId === sides[myAgentIdx]);
              const isLoss = myAgent && match.status === "completed" && match.winnerId && !isWinner;
              const isLast = i === recentMatches.length - 1;
              const isActive = match.status === "active";

              const dotColor = isActive
                ? "bg-arena-success"
                : isWinner
                ? "bg-arena-success"
                : isLoss
                ? "bg-arena-danger/70"
                : "bg-arena-border-light";

              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div
                    className="flex gap-4 group opacity-0 animate-fade-up"
                    style={{ animationDelay: `${0.45 + i * 0.06}s`, animationFillMode: "both" }}
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center pt-5 shrink-0">
                      <div className={`timeline-dot ${dotColor}`}>
                        {isActive && (
                          <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-40" />
                        )}
                      </div>
                      {!isLast && <div className="timeline-line" style={{ position: "relative", width: 2, flex: 1, minHeight: 20 }} />}
                    </div>

                    {/* Card */}
                    <div className="dash-glass-card rounded-xl p-4 flex-1 mb-3 group-hover:border-arena-primary/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge status={match.status} />
                          {match.status === "completed" && myAgent && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isWinner
                                ? "bg-arena-success/12 text-arena-success"
                                : isLoss
                                ? "bg-arena-danger/12 text-arena-danger"
                                : "bg-arena-muted-light/15 text-arena-muted"
                            }`}>
                              {isWinner ? t.common.won : isLoss ? t.common.lost : t.common.draws}
                            </span>
                          )}
                          <span className="text-sm font-medium text-arena-text-bright">
                            {agentsArr.map((a) => a.agentName).join(" vs ") || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-arena-muted">
                          <span className="capitalize font-mono">{match.gameType}</span>
                          {myAgent?.eloChange !== undefined && myAgent.eloChange !== null && (
                            <span className={`font-mono font-semibold ${
                              myAgent.eloChange > 0 ? "text-arena-success" : myAgent.eloChange < 0 ? "text-arena-danger" : "text-arena-muted"
                            }`}>
                              {myAgent.eloChange > 0 ? "+" : ""}{myAgent.eloChange} ELO
                            </span>
                          )}
                          <span className="font-mono">{match.stakeAmount} ALPHA</span>
                          <span>{formatRelativeTime(match.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
