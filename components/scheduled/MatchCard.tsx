"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCountdown } from "@/hooks/useCountdown";
import { useLanguage } from "@/lib/i18n";
import { api } from "@/lib/api";
import CountdownTimer from "./CountdownTimer";
import type { ScheduledMatchResponse, BettingInfo, BettingPoolResponse } from "@/lib/types";

/* ══════════════════════════════════════════════════════════
   GAME CONFIG — gradients, accents, icons per game type
   ══════════════════════════════════════════════════════════ */
const GAME_CONFIG: Record<
  string,
  {
    icon: string;
    label: string;
    accentColor: string;
    gradient: string;
    liveGradient: string;
  }
> = {
  chess: {
    icon: "\u265F",
    label: "CHESS",
    accentColor: "#8B7FD4",
    gradient: "from-[#1a1a2e] to-[#16213e]",
    liveGradient: "from-[#2a1520] to-[#1a1025]",
  },
  poker: {
    icon: "\u2660",
    label: "POKER",
    accentColor: "#4CAF7D",
    gradient: "from-[#1a2e1a] to-[#162e21]",
    liveGradient: "from-[#2a1520] to-[#1a1025]",
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

/* ── Player avatar (circular, with initial) ── */
function PlayerAvatar({
  name,
  color,
  size = "w-11 h-11",
  textSize = "text-base",
}: {
  name: string;
  color: string;
  size?: string;
  textSize?: string;
}) {
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center ${textSize} font-bold text-white shrink-0 shadow-lg`}
      style={{
        background: color,
        boxShadow: `0 4px 14px ${color}40`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

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
}

export default function MatchCard({ match, delay }: MatchCardProps) {
  const { t } = useLanguage();
  const config = GAME_CONFIG[match.gameType] || GAME_CONFIG.chess;
  const isChess = match.gameType === "chess";
  const scheduledDate = useMemo(() => new Date(match.scheduledAt), [match.scheduledAt]);
  const countdown = useCountdown(scheduledDate);
  const isLive = countdown.isLive || match.status === "starting";

  // Betting state
  const [bettingInfo, setBettingInfo] = useState<BettingInfo | null>(null);
  const [poolResp, setPoolResp] = useState<BettingPoolResponse | null>(null);
  const [showBetting, setShowBetting] = useState(false);
  const [betOnA, setBetOnA] = useState(true);
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
      await api.placeBet(match.matchId, betOnA, amount);
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
  const pctA = Number(pool?.percentA ?? 50);
  const pctB = Number(pool?.percentB ?? 50);
  const bettingOpen = bettingInfo?.betting?.open ?? poolResp?.bettingOpen ?? false;
  const oddsA = bettingInfo?.betting?.odds?.a != null ? Number(bettingInfo.betting.odds.a) : null;
  const oddsB = bettingInfo?.betting?.odds?.b != null ? Number(bettingInfo.betting.odds.b) : null;

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
        bg-gradient-to-br ${isLive ? config.liveGradient : config.gradient}
        border ${isLive ? "border-red-500/20" : "border-white/10"}
        hover:border-white/20 hover:-translate-y-0.5
        hover:shadow-xl hover:shadow-purple-500/5
        transition-all duration-300 ease-out
        opacity-0 animate-fade-up
      `}
      style={{ animationDelay: `${delay}s`, animationFillMode: "both" }}
    >
      {/* ── LIVE top glow bar ── */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
      )}

      {/* ── Left accent bar ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: isLive ? "#E84855" : config.accentColor }}
      />

      <div className="p-5 pl-6">
        {/* ── Top row: game type badge + date ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none" style={{ color: config.accentColor }}>
              {config.icon}
            </span>
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]"
              style={{ color: config.accentColor }}
            >
              {config.label}
            </span>
            {agents.length > 2 && (
              <span className="text-white/20 text-[10px] font-mono">
                {agents.length} players
              </span>
            )}
          </div>
          <span className="text-white/30 text-xs font-mono">
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
                <PlayerAvatar name={nameA} color={colorA} />
                <div className="min-w-0">
                  <div className="text-white font-bold text-base sm:text-lg truncate">
                    {nameA}
                  </div>
                  <div className="text-white/30 text-[11px] font-mono">
                    {eloA} ELO
                  </div>
                </div>
              </div>

              {/* VS badge */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-3">
                <span className="text-white/30 text-xs font-display italic">vs</span>
              </div>

              {/* Player B */}
              <div className="flex items-center gap-3 min-w-0 flex-1 flex-row-reverse text-right">
                <PlayerAvatar name={nameB} color={colorB} />
                <div className="min-w-0">
                  <div className="text-white font-bold text-base sm:text-lg truncate">
                    {nameB}
                  </div>
                  <div className="text-white/30 text-[11px] font-mono">
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
                  <PlayerAvatar
                    name={agent.name}
                    color={agent.color || PLAYER_COLORS[0]}
                    size="w-9 h-9"
                    textSize="text-sm"
                  />
                  <div>
                    <div className="text-white text-sm font-medium whitespace-nowrap">
                      {agent.name}
                    </div>
                    <div className="text-white/25 text-[10px] font-mono">{agent.elo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Betting pool bar (when matchId exists and pool > 0) ── */}
        {match.matchId && totalPool > 0 && (
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/40 text-[10px] font-mono">{nameA}</span>
              <span className="text-white/30 text-[10px] font-mono font-semibold">
                {t.betting.totalPool}: {totalPool.toFixed(2)} ALPHA
              </span>
              <span className="text-white/40 text-[10px] font-mono">{nameB}</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
              <div
                className="transition-all duration-500"
                style={{ width: `${pctA}%`, backgroundColor: PLAYER_COLORS[0] }}
              />
              <div className="w-px bg-white/20 shrink-0" />
              <div
                className="transition-all duration-500"
                style={{ width: `${pctB}%`, backgroundColor: PLAYER_COLORS[1] }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-white/25 text-[9px] font-mono">{pctA.toFixed(0)}%</span>
              {oddsA != null && oddsB != null && (
                <span className="text-white/20 text-[9px] font-mono">
                  {oddsA.toFixed(2)}x · {oddsB.toFixed(2)}x
                </span>
              )}
              <span className="text-white/25 text-[9px] font-mono">{pctB.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* ── Bottom row: countdown + stake + actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          {/* Countdown */}
          <CountdownTimer countdown={countdown} />

          {/* Stake */}
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-500 text-xs">&#9672;</span>
            <span className="text-white/50 text-xs font-mono font-medium">
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

            {/* Watch button — links to match when matchId exists */}
            {match.matchId ? (
              <Link
                href={`/matches/${match.matchId}`}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all group/btn"
              >
                {isLive ? t.betting.watchLive : "Watch"}
                <IconArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <span className="px-4 py-1.5 rounded-lg bg-white/5 text-white/30 text-sm font-medium cursor-default">
                {t.betting.upcoming}
              </span>
            )}
          </div>
        </div>

        {/* ── Inline betting form (expanded) ── */}
        {showBetting && match.matchId && bettingOpen && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-fade-up" style={{ animationDuration: "0.2s" }}>
            {!isLoggedIn ? (
              <p className="text-sm text-white/40 text-center py-2">{t.betting.loginToBet}</p>
            ) : (
              <div className="space-y-3">
                {/* Agent selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setBetOnA(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                      betOnA
                        ? "bg-red-500/15 border-red-500/30 text-red-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:border-red-400/30"
                    }`}
                  >
                    <div>{nameA}</div>
                    {oddsA != null && <div className="text-[10px] font-mono opacity-70">{oddsA.toFixed(2)}x</div>}
                  </button>
                  <button
                    onClick={() => setBetOnA(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                      !betOnA
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:border-blue-400/30"
                    }`}
                  >
                    <div>{nameB}</div>
                    {oddsB != null && <div className="text-[10px] font-mono opacity-70">{oddsB.toFixed(2)}x</div>}
                  </button>
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
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-arena-accent/50 pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-mono">ALPHA</span>
                  </div>
                  <button
                    onClick={handlePlaceBet}
                    disabled={placing || !betAmount || parseFloat(betAmount) < 0.01}
                    className="px-4 py-2 rounded-lg bg-arena-accent hover:bg-arena-accent/90 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {placing ? t.betting.placing : t.betting.placeBet}
                  </button>
                </div>
                <p className="text-[10px] text-white/20 font-mono">{t.betting.minBet}</p>

                {/* Feedback */}
                {msg && (
                  <div className={`p-2 rounded-lg text-xs font-medium ${
                    msg.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
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
