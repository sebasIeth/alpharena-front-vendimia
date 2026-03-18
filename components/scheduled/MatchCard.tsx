"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCountdown } from "@/hooks/useCountdown";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatEarnings } from "@/lib/utils";
import CountdownTimer from "./CountdownTimer";
import type { ScheduledMatchResponse, BettingInfo, BettingPoolResponse, AgentPool } from "@/lib/types";

/* ══════════════════════════════════════════════════════════
   GAME CONFIG — gradients, accents, icons per game type
   ══════════════════════════════════════════════════════════ */
const GAME_CONFIG: Record<
  string,
  {
    icon: string;
    label: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    liveBorder: string;
  }
> = {
  chess: {
    icon: "\u265F",
    label: "CHESS",
    accentColor: "#5B4FCF",
    badgeBg: "bg-arena-primary/10",
    badgeText: "text-arena-primary",
    liveBorder: "ring-red-400/30",
  },
  poker: {
    icon: "\u2660",
    label: "POKER",
    accentColor: "#4CAF7D",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600",
    liveBorder: "ring-red-400/30",
  },
};

const PLAYER_COLORS = ["#E84855", "#3B82F6"];

/* ── Icons ── */
function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* ── Player avatar ── */
import AgentAvatar from "@/components/ui/AgentAvatar";

/* ── Format date/time ── */
function formatMatchTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ══════════════════════════════════════════════════════════
   MATCH CARD
   ══════════════════════════════════════════════════════════ */
interface MatchCardProps {
  match: ScheduledMatchResponse;
  delay: number;
  viewers?: number;
}

export default function MatchCard({ match, delay, viewers }: MatchCardProps) {
  const { t } = useLanguage();
  const config = GAME_CONFIG[match.gameType] || GAME_CONFIG.chess;
  const isChess = match.gameType === "chess";
  const scheduledDate = useMemo(() => new Date(match.scheduledAt), [match.scheduledAt]);
  const countdown = useCountdown(scheduledDate);
  const isLive = countdown.isLive || match.status === "starting" || match.status === "active";

  // Betting state
  const [bettingInfo, setBettingInfo] = useState<BettingInfo | null>(null);
  const [poolResp, setPoolResp] = useState<BettingPoolResponse | null>(null);
  const [showBetting, setShowBetting] = useState(false);
  const [selectedAgentIdx, setSelectedAgentIdx] = useState(0);
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("arena_token");

  const fetchBettingData = useCallback(() => {
    if (!match.matchId) return;
    api.getBettingInfo(match.matchId).then(setBettingInfo).catch(() => {});
    api.getBettingPool(match.matchId).then(setPoolResp).catch(() => {});
  }, [match.matchId]);

  // Fetch betting data when matchId exists
  useEffect(() => {
    fetchBettingData();
  }, [fetchBettingData]);

  // Poll betting pool every 15s while betting is open
  useEffect(() => {
    if (!match.matchId) return;
    const bettingOpen = bettingInfo?.betting?.open ?? poolResp?.bettingOpen ?? false;
    if (!bettingOpen) return;
    const interval = setInterval(() => {
      api.getBettingPool(match.matchId!).then(setPoolResp).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [match.matchId, bettingInfo?.betting?.open, poolResp?.bettingOpen]);

  const handlePlaceBet = async () => {
    if (!match.matchId) return;
    const amount = parseFloat(betAmount);
    if (!amount || amount < 0.01) return;
    setPlacing(true);
    setMsg(null);
    try {
      const selectedAgentId = agents[selectedAgentIdx]?.agentId;
      await api.placeBet(match.matchId, selectedAgentId, amount);
      setMsg({ type: "success", text: t.betting.betPlaced });
      setBetAmount("");
      fetchBettingData();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : t.betting.betFailed });
    } finally {
      setPlacing(false);
    }
  };

  // Pool data
  const pool = poolResp?.pool ?? bettingInfo?.betting?.pool;
  const totalPool = Number(pool?.totalPool ?? 0);
  const bettingOpen = bettingInfo?.betting?.open ?? poolResp?.bettingOpen ?? false;

  // Agent pool data — build a lookup by agentId from pool.agents[]
  const agentPools: AgentPool[] = pool?.agents ?? [];
  const agentPoolMap = useMemo(() => {
    const map = new Map<string, AgentPool>();
    for (const ap of agentPools) map.set(ap.agentId, ap);
    return map;
  }, [agentPools]);

  // Agent names
  const agents = match.agents || [];
  const nameA = agents[0]?.name ?? "Agent A";
  const nameB = agents[1]?.name ?? "Agent B";
  const eloA = agents[0]?.elo ?? 0;
  const eloB = agents[1]?.elo ?? 0;
  const colorA = agents[0]?.color || PLAYER_COLORS[0];
  const colorB = agents[1]?.color || PLAYER_COLORS[1];

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl
        bg-white/80 backdrop-blur-sm
        border border-arena-border-light/40
        ${isLive ? "ring-2 ring-red-400/20" : ""}
        hover:border-arena-primary/30 hover:-translate-y-0.5
        hover:shadow-lg hover:shadow-arena-primary/5
        transition-all duration-300 ease-out
        opacity-0 animate-fade-up
      `}
      style={{ animationDelay: `${delay}s`, animationFillMode: "both" }}
    >
      {/* ── LIVE top glow bar ── */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-orange-400 to-red-500 animate-pulse" />
      )}

      {/* ── Left accent bar ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: isLive ? "#E84855" : config.accentColor }}
      />

      <div className="p-5 pl-6">
        {/* ── Top row: game type badge + date ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${config.badgeBg}`}>
              <span className={`text-sm leading-none ${config.badgeText}`}>
                {config.icon}
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.15em] ${config.badgeText}`}>
                {config.label}
              </span>
            </div>
            {agents.length > 2 && (
              <span className="text-arena-muted text-[10px] font-mono">
                {agents.length} players
              </span>
            )}
          </div>
          <span className="text-arena-muted text-xs font-mono">
            {formatMatchTime(match.scheduledAt)}
          </span>
        </div>

        {/* ── Players: HERO of the card ── */}
        <div className="py-3 mb-3">
          {isChess && agents.length === 2 ? (
            /* ─── Chess: dramatic face-off ─── */
            <div className="flex items-center justify-between">
              {/* Player A */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <AgentAvatar name={nameA} bgColor={colorA} rounded="rounded-full" shadow={`0 4px 14px ${colorA}25`} />
                <div className="min-w-0">
                  <div className="text-arena-text-bright font-bold text-base sm:text-lg truncate">
                    {nameA}
                  </div>
                  <div className="text-arena-muted text-[11px] font-mono">
                    {eloA} ELO
                  </div>
                </div>
              </div>

              {/* VS badge */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-arena-primary/5 border border-arena-border-light/50 flex items-center justify-center mx-3">
                <span className="text-arena-muted text-xs font-display italic">vs</span>
              </div>

              {/* Player B */}
              <div className="flex items-center gap-3 min-w-0 flex-1 flex-row-reverse text-right">
                <AgentAvatar name={nameB} bgColor={colorB} rounded="rounded-full" shadow={`0 4px 14px ${colorB}25`} />
                <div className="min-w-0">
                  <div className="text-arena-text-bright font-bold text-base sm:text-lg truncate">
                    {nameB}
                  </div>
                  <div className="text-arena-muted text-[11px] font-mono">
                    {eloB} ELO
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Poker / multi-player: horizontal row ─── */
            <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {agents.map((agent) => (
                <div key={agent.agentId} className="flex items-center gap-2.5 shrink-0">
                  <AgentAvatar
                    name={agent.name}
                    bgColor={agent.color || PLAYER_COLORS[0]}
                    size="w-9 h-9"
                    textSize="text-sm"
                    rounded="rounded-full"
                    shadow={`0 4px 14px ${agent.color || PLAYER_COLORS[0]}40`}
                  />
                  <div>
                    <div className="text-arena-text-bright text-sm font-medium whitespace-nowrap">
                      {agent.name}
                    </div>
                    <div className="text-arena-muted text-[10px] font-mono">{agent.elo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Betting pool info ── */}
        {match.matchId && (
          <div className="mb-3 px-1">
            {/* Total pool header */}
            <div className="flex items-center justify-center mb-2">
              <span className="text-arena-muted text-[10px] font-mono font-semibold">
                {t.betting.totalPool}: {formatEarnings(totalPool)} ALPHA
              </span>
            </div>

            {/* Per-agent breakdown */}
            {agents.length > 0 && (
              <div className="space-y-1.5">
                {agents.map((agent, i) => {
                  const ap = agentPoolMap.get(agent.agentId);
                  const bets = ap?.totalBets ?? 0;
                  const pct = ap?.percent ?? 0;
                  const odds = ap?.odds ?? 0;
                  const color = agent.color || PLAYER_COLORS[i % PLAYER_COLORS.length];
                  return (
                    <div key={agent.agentId}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-arena-text-bright text-[11px] font-mono font-semibold truncate max-w-[100px]">
                            {agent.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold" style={{ color }}>
                            {formatEarnings(bets)} ALPHA
                          </span>
                          {totalPool > 0 && (
                            <span className="text-arena-muted/70 text-[9px] font-mono w-8 text-right">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                          {odds > 0 && (
                            <span className="text-arena-muted/50 text-[9px] font-mono w-10 text-right">
                              {odds.toFixed(2)}x
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Mini bar */}
                      <div className="h-1 rounded-full overflow-hidden bg-black/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: totalPool > 0 ? `${pct}%` : "0%", backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom row: countdown + stake + actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-arena-border-light/30">
          {/* Countdown */}
          <CountdownTimer countdown={countdown} />

          {/* Stake */}
          <div className="flex items-center gap-1.5">
            <span className="text-arena-accent text-xs">&#9672;</span>
            <span className="text-arena-muted text-xs font-mono font-medium">
              {(match.stakeAmount ?? 0).toLocaleString()} ALPHA
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Bet button — show when matchId exists and betting is open */}
            {match.matchId && bettingOpen && (
              <button
                onClick={() => setShowBetting(!showBetting)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  showBetting
                    ? "bg-arena-accent/20 text-arena-accent border border-arena-accent/30"
                    : "bg-arena-accent/10 hover:bg-arena-accent/20 text-arena-accent/80 hover:text-arena-accent"
                }`}
              >
                {t.betting.betNow}
              </button>
            )}

            {/* Viewers count */}
            {viewers != null && viewers > 0 && (
              <span className="flex items-center gap-1 text-xs text-arena-text font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {viewers}
              </span>
            )}

            {/* Watch button — links to match when matchId exists */}
            {match.matchId ? (
              <Link
                href={`/matches/${match.matchId}`}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-arena-primary/5 hover:bg-arena-primary/10 text-arena-text-bright/70 hover:text-arena-text-bright text-sm font-medium transition-all group/btn"
              >
                {isLive ? t.betting.watchLive : "Watch"}
                <IconArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <span className="px-4 py-1.5 rounded-lg bg-black/[0.03] text-arena-muted text-sm font-medium cursor-default">
                {t.betting.upcoming}
              </span>
            )}
          </div>
        </div>

        {/* ── Inline betting form (expanded) ── */}
        {showBetting && match.matchId && bettingOpen && (
          <div className="mt-4 pt-4 border-t border-arena-border-light/30 animate-fade-up" style={{ animationDuration: "0.2s" }}>
            {!isLoggedIn ? (
              <p className="text-sm text-arena-muted text-center py-2">{t.betting.loginToBet}</p>
            ) : (
              <div className="space-y-3">
                {/* Agent selector */}
                <div className={`grid gap-2 ${agents.length <= 2 ? "grid-cols-2" : agents.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {agents.map((agent, i) => {
                    const isSelected = selectedAgentIdx === i;
                    const color = agent.color || PLAYER_COLORS[i % PLAYER_COLORS.length];
                    const ap = agentPoolMap.get(agent.agentId);
                    const odds = ap?.odds ?? 0;
                    return (
                      <button
                        key={agent.agentId}
                        onClick={() => setSelectedAgentIdx(i)}
                        className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                          isSelected
                            ? "border-opacity-30 bg-opacity-10"
                            : "bg-black/[0.03] border-arena-border-light/40 text-arena-muted hover:border-opacity-30"
                        }`}
                        style={isSelected ? {
                          backgroundColor: `${color}15`,
                          borderColor: `${color}50`,
                          color,
                        } : undefined}
                      >
                        <div className="truncate">{agent.name}</div>
                        {odds > 0 && <div className="text-[10px] font-mono opacity-70">{odds.toFixed(2)}x</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Amount + Place button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white/60 border border-arena-border-light/50 rounded-lg text-arena-text-bright text-sm font-mono placeholder:text-arena-muted/40 focus:outline-none focus:border-arena-accent/50 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-arena-muted font-mono">ALPHA</span>
                  </div>
                  <button
                    onClick={handlePlaceBet}
                    disabled={placing || !betAmount || parseFloat(betAmount) < 0.01}
                    className="px-4 py-2 rounded-lg bg-arena-accent hover:bg-arena-accent/90 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {placing ? t.betting.placing : t.betting.placeBet}
                  </button>
                </div>
                {/* Potential winnings estimate */}
                {(() => {
                  const amt = parseFloat(betAmount) || 0;
                  if (amt < 0.01) return null;
                  const selectedAgent = agents[selectedAgentIdx];
                  const ap = selectedAgent ? agentPoolMap.get(selectedAgent.agentId) : undefined;
                  const agentBets = ap?.totalBets ?? 0;
                  const newAgentBets = agentBets + amt;
                  const newTotalPool = totalPool + amt;
                  const potentialWin = (amt / newAgentBets) * newTotalPool * 0.95;
                  return (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-arena-muted/60 font-mono">{t.betting.minBet}</span>
                      <span className="text-[11px] font-mono font-semibold text-arena-success">
                        {t.betting.potentialWin}: ~{formatEarnings(potentialWin)} ALPHA
                      </span>
                    </div>
                  );
                })()}
                {!(parseFloat(betAmount) >= 0.01) && (
                  <p className="text-[10px] text-arena-muted/60 font-mono">{t.betting.minBet}</p>
                )}

                {/* Feedback */}
                {msg && (
                  <div className={`p-2 rounded-lg text-xs font-medium ${
                    msg.type === "success" ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-600"
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
