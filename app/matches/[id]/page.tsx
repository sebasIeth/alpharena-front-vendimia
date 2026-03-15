"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, getExplorerTxUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import MatchViewer from "@/components/game/MatchViewer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Match, Chain, BettingInfo, BettingPoolResponse, UserBets } from "@/lib/types";
import { normalizeMatchAgents, formatRelativeTime } from "@/lib/utils";

const PLAYER_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];
const PLAYER_GRADIENTS = [
  "from-red-500 to-red-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
];

/* ── Icons ── */
function IconCrown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
      <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
    </svg>
  );
}
function IconCopy({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}
function IconCheck({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function IconShare({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}
function IconArrowUp({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}
function IconArrowDown({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}

/* ── Skeleton Detail ── */
function DetailSkeleton() {
  return (
    <div className="page-container">
      {/* Breadcrumb skeleton */}
      <div className="skeleton w-36 h-4 mb-6" />

      {/* Hero skeleton */}
      <div className="dash-hero p-6 sm:p-8 mb-6 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        <div className="relative z-10">
          {/* Badges row */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="skeleton w-20 h-6" />
            <div className="skeleton w-16 h-6" />
          </div>
          {/* Title */}
          <div className="skeleton w-64 h-8 mb-1" />
          <div className="skeleton w-40 h-4 mb-5" />
          {/* VS section */}
          <div className="flex items-center justify-center gap-8 mb-5 py-2">
            <div className="flex-1 flex flex-col items-end max-w-[200px]">
              <div className="skeleton w-16 h-16 !rounded-2xl mb-2" />
              <div className="skeleton w-24 h-4 mb-1" />
              <div className="skeleton w-16 h-3" />
            </div>
            <div className="skeleton w-14 h-14 !rounded-full shrink-0" />
            <div className="flex-1 flex flex-col items-start max-w-[200px]">
              <div className="skeleton w-16 h-16 !rounded-2xl mb-2" />
              <div className="skeleton w-24 h-4 mb-1" />
              <div className="skeleton w-16 h-3" />
            </div>
          </div>
          {/* Meta pills */}
          <div className="flex gap-2">
            <div className="skeleton w-28 h-8 !rounded-lg" />
            <div className="skeleton w-28 h-8 !rounded-lg" />
            <div className="skeleton w-28 h-8 !rounded-lg" />
          </div>
        </div>
      </div>

      {/* Viewer skeleton */}
      <div className="skeleton w-full h-[400px] !rounded-2xl" />
    </div>
  );
}

/* ── ELO Comparison Bar ── */
function EloComparisonBar({
  eloA,
  eloB,
  nameA,
  nameB,
  colorA,
  colorB,
}: {
  eloA: number;
  eloB: number;
  nameA: string;
  nameB: string;
  colorA: string;
  colorB: string;
}) {
  const { t } = useLanguage();
  const total = eloA + eloB;
  const pctA = total > 0 ? Math.round((eloA / total) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="mt-5 opacity-0 animate-fade-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-3.5 h-3.5 text-arena-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span className="text-[11px] text-arena-muted font-semibold uppercase tracking-wider font-mono">
          {t.matchDetail.eloComparison}
        </span>
      </div>

      {/* Labels row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorA }} />
          <span className="text-xs font-medium text-arena-text-bright truncate max-w-[120px]">{nameA}</span>
          <span className="text-xs font-extrabold font-mono tabular-nums text-arena-text-bright">{eloA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold font-mono tabular-nums text-arena-text-bright">{eloB}</span>
          <span className="text-xs font-medium text-arena-text-bright truncate max-w-[120px]">{nameB}</span>
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorB }} />
        </div>
      </div>

      {/* Bar */}
      <div className="elo-bar-track flex">
        <div
          className="elo-bar-fill"
          style={{ width: `${pctA}%`, backgroundColor: colorA }}
        />
        <div className="w-px bg-white/80 shrink-0" />
        <div
          className="elo-bar-fill"
          style={{ width: `${pctB}%`, backgroundColor: colorB }}
        />
      </div>

      {/* Percentage labels */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-mono text-arena-muted">{pctA}%</span>
        <span className="text-[10px] font-mono text-arena-muted">{pctB}%</span>
      </div>
    </div>
  );
}

/* ── Betting Panel ── */
function BettingPanel({ match }: { match: Match }) {
  const { t } = useLanguage();
  const matchAgents = normalizeMatchAgents(match.agents);
  const chain = match.chain || "base";

  const [info, setInfo] = useState<BettingInfo | null>(null);
  const [poolResp, setPoolResp] = useState<BettingPoolResponse | null>(null);
  const [myBets, setMyBets] = useState<UserBets | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [betOnA, setBetOnA] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("arena_token");

  const fetchInfo = useCallback(() => {
    api.getBettingInfo(match.id).then(setInfo).catch(() => {});
  }, [match.id]);
  const fetchPool = useCallback(() => {
    api.getBettingPool(match.id).then(setPoolResp).catch(() => {});
  }, [match.id]);
  const fetchMyBets = useCallback(() => {
    if (isLoggedIn) api.getMyBets(match.id).then(setMyBets).catch(() => {});
  }, [match.id, isLoggedIn]);

  // Initial fetch
  useEffect(() => {
    fetchInfo();
    fetchPool();
    fetchMyBets();
  }, [fetchInfo, fetchPool, fetchMyBets]);

  // Derive open state from either /info or /pool response
  const bettingOpen = info?.betting?.open ?? poolResp?.bettingOpen ?? false;
  const onChainState = info?.betting?.onChainState ?? "none";

  // Poll pool every 10s while betting is open
  useEffect(() => {
    if (!bettingOpen) return;
    pollRef.current = setInterval(() => {
      fetchPool();
    }, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [bettingOpen, fetchPool]);

  const handlePlaceBet = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount < 0.01) return;
    setPlacing(true);
    setMsg(null);
    setTxHash(null);
    try {
      const selectedAgentId = betOnA ? matchAgents[0]?.agentId : matchAgents[1]?.agentId;
      const res = await api.placeBet(match.id, selectedAgentId, amount);
      setTxHash(res.txHash);
      setMsg({ type: "success", text: t.betting.betPlaced });
      setBetAmount("");
      fetchPool();
      fetchMyBets();
      fetchInfo();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : t.betting.betFailed });
    } finally {
      setPlacing(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setMsg(null);
    setTxHash(null);
    try {
      const res = await api.claimBet(match.id);
      setTxHash(res.txHash);
      setMsg({ type: "success", text: t.betting.claimSuccess });
      fetchMyBets();
      fetchInfo();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : t.betting.claimFailed });
    } finally {
      setClaiming(false);
    }
  };

  // Don't render if no data or on-chain state is none
  if (!info && !poolResp) return null;
  if (onChainState === "none" && !poolResp) return null;

  // Pool data: prefer lightweight /pool response, fall back to /info
  // Backend may return strings or numbers, so always coerce with Number()
  const pool = poolResp?.pool ?? info?.betting?.pool;
  const totalPool = Number(pool?.totalPool ?? 0);
  const poolA = Number(pool?.totalBetsA ?? 0);
  const poolB = Number(pool?.totalBetsB ?? 0);
  const pctA = Number(pool?.percentA ?? (totalPool > 0 ? Math.round((poolA / totalPool) * 100) : 50));
  const pctB = Number(pool?.percentB ?? (100 - pctA));

  const isSettled = onChainState === "settled";
  const isRefunded = onChainState === "refunded";

  // Odds from /info
  const oddsA = info?.betting?.odds?.a != null ? Number(info.betting.odds.a) : null;
  const oddsB = info?.betting?.odds?.b != null ? Number(info.betting.odds.b) : null;
  const feePercent = info?.betting?.feePercent != null ? Number(info.betting.feePercent) : null;

  // Names from /info agents or from match agents
  const nameA = info?.agents?.a?.name ?? matchAgents[0]?.agentName ?? "Agent A";
  const nameB = info?.agents?.b?.name ?? matchAgents[1]?.agentName ?? "Agent B";

  // User bets
  const userOnA = parseFloat(myBets?.bets?.onA ?? "0");
  const userOnB = parseFloat(myBets?.bets?.onB ?? "0");
  const hasUserBets = userOnA > 0 || userOnB > 0;

  return (
    <div className="mt-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
      <div className="dash-glass-card rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-[11px] text-arena-text font-semibold uppercase tracking-widest font-mono">
              {t.betting.title}
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
            bettingOpen ? "bg-arena-success/10 text-arena-success" :
            isSettled ? "bg-arena-accent/10 text-arena-accent" :
            isRefunded ? "bg-arena-muted/10 text-arena-muted" :
            "bg-arena-muted/10 text-arena-muted"
          }`}>
            {bettingOpen ? t.betting.open : isSettled ? t.betting.settled : isRefunded ? t.betting.refunded : t.betting.bettingClosed}
          </span>
        </div>

        {/* Pool Visualization */}
        {totalPool > 0 ? (
          <div className="mb-5">
            {/* Labels */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLAYER_COLORS[0] }} />
                <span className="text-xs font-medium text-arena-text-bright truncate max-w-[120px]">{nameA}</span>
                <span className="text-xs font-extrabold font-mono tabular-nums text-arena-text-bright">{poolA.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold font-mono tabular-nums text-arena-text-bright">{poolB.toFixed(2)}</span>
                <span className="text-xs font-medium text-arena-text-bright truncate max-w-[120px]">{nameB}</span>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLAYER_COLORS[1] }} />
              </div>
            </div>
            {/* Bar */}
            <div className="elo-bar-track flex">
              <div className="elo-bar-fill" style={{ width: `${pctA}%`, backgroundColor: PLAYER_COLORS[0] }} />
              <div className="w-px bg-white/80 shrink-0" />
              <div className="elo-bar-fill" style={{ width: `${pctB}%`, backgroundColor: PLAYER_COLORS[1] }} />
            </div>
            {/* Pool total + percentages */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-mono text-arena-muted">{pctA.toFixed(1)}%</span>
              <span className="text-[10px] font-mono text-arena-muted font-semibold">{t.betting.totalPool}: {totalPool.toFixed(2)} ALPHA</span>
              <span className="text-[10px] font-mono text-arena-muted">{pctB.toFixed(1)}%</span>
            </div>

            {/* Odds row */}
            {oddsA != null && oddsB != null && (
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] font-mono text-arena-muted">
                  {t.betting.odds}: <span className="text-arena-text-bright font-semibold">{oddsA.toFixed(2)}x</span>
                </span>
                {feePercent != null && (
                  <span className="text-[10px] font-mono text-arena-muted">
                    Fee: {feePercent}%
                  </span>
                )}
                <span className="text-[10px] font-mono text-arena-muted">
                  {t.betting.odds}: <span className="text-arena-text-bright font-semibold">{oddsB.toFixed(2)}x</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-arena-muted text-center py-4 mb-4">{t.betting.poolEmpty}</p>
        )}

        {/* Place Bet Form */}
        {bettingOpen && (
          <div className="border-t border-arena-border-light/40 pt-5">
            {!isLoggedIn ? (
              <p className="text-sm text-arena-muted text-center py-2">{t.betting.loginToBet}</p>
            ) : (
              <div className="space-y-3">
                {/* Agent selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setBetOnA(true)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
                      betOnA
                        ? "bg-red-500/10 border-red-500/30 text-red-600"
                        : "bg-white/50 border-arena-border-light/60 text-arena-muted hover:border-red-300"
                    }`}
                  >
                    <div>{nameA}</div>
                    {oddsA != null && <div className="text-[10px] font-mono opacity-70">{oddsA.toFixed(2)}x</div>}
                  </button>
                  <button
                    onClick={() => setBetOnA(false)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
                      !betOnA
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-600"
                        : "bg-white/50 border-arena-border-light/60 text-arena-muted hover:border-blue-300"
                    }`}
                  >
                    <div>{nameB}</div>
                    {oddsB != null && <div className="text-[10px] font-mono opacity-70">{oddsB.toFixed(2)}x</div>}
                  </button>
                </div>

                {/* Amount input + button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.00"
                      className="input-field w-full pr-16 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-arena-muted font-mono">ALPHA</span>
                  </div>
                  <Button
                    onClick={handlePlaceBet}
                    disabled={placing || !betAmount || parseFloat(betAmount) < 0.01}
                  >
                    {placing ? t.betting.placing : t.betting.placeBet}
                  </Button>
                </div>
                <p className="text-[10px] text-arena-muted font-mono">{t.betting.minBet}</p>
              </div>
            )}
          </div>
        )}

        {/* Claim Button */}
        {myBets?.canClaim && (isSettled || isRefunded) && (
          <div className="border-t border-arena-border-light/40 pt-5 mt-4">
            {Number(myBets.winnings) > 0 && (
              <p className="text-sm text-arena-text-bright font-semibold mb-3 text-center">
                {t.betting.payout}: {(Number(myBets.winnings) * 0.95).toFixed(2)} ALPHA
              </p>
            )}
            <Button onClick={handleClaim} disabled={claiming} className="w-full">
              {claiming ? t.betting.claiming : isRefunded ? t.betting.claimRefund : t.betting.claimWinnings}
            </Button>
          </div>
        )}

        {/* User's Bets */}
        {hasUserBets && (
          <div className="border-t border-arena-border-light/40 pt-5 mt-5">
            <h4 className="text-[11px] text-arena-muted font-semibold uppercase tracking-wider font-mono mb-3">{t.betting.yourBets}</h4>
            <div className="space-y-2">
              {userOnA > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: PLAYER_COLORS[0] }} />
                    <span className="text-xs text-arena-text">{userOnA.toFixed(2)} ALPHA {t.betting.onAgent} {nameA}</span>
                  </div>
                  {myBets?.potential?.winIfA != null && Number(myBets.potential.winIfA) > 0 && (
                    <span className="text-[10px] font-mono text-arena-success">+{(Number(myBets.potential.winIfA) * 0.95).toFixed(2)}</span>
                  )}
                </div>
              )}
              {userOnB > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: PLAYER_COLORS[1] }} />
                    <span className="text-xs text-arena-text">{userOnB.toFixed(2)} ALPHA {t.betting.onAgent} {nameB}</span>
                  </div>
                  {myBets?.potential?.winIfB != null && Number(myBets.potential.winIfB) > 0 && (
                    <span className="text-[10px] font-mono text-arena-success">+{(Number(myBets.potential.winIfB) * 0.95).toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>
            {/* Outcome badge */}
            {myBets?.outcome && myBets.outcome !== "pending" && myBets.outcome !== "no_bet" && (
              <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                myBets.outcome === "won" ? "bg-arena-success/10 text-arena-success" :
                myBets.outcome === "lost" ? "bg-arena-danger/10 text-arena-danger" :
                "bg-arena-muted/10 text-arena-muted"
              }`}>
                {myBets.outcome === "won" ? t.common.won : myBets.outcome === "lost" ? t.common.lost : t.betting.refunded}
                {myBets.outcome === "won" && myBets.winnings > 0 && (
                  <span className="font-mono ml-1">+{(Number(myBets.winnings) * 0.95).toFixed(2)}</span>
                )}
              </div>
            )}
            {myBets?.bets?.claimed && (
              <p className="text-[10px] text-arena-success font-semibold mt-2">{t.betting.claimed}</p>
            )}
          </div>
        )}

        {/* Winner info from /info */}
        {info?.winner && (isSettled) && (
          <div className="border-t border-arena-border-light/40 pt-4 mt-4">
            <div className="flex items-center gap-2 text-xs text-arena-text">
              <IconCrown className="w-4 h-4 text-arena-accent" />
              <span className="font-semibold">{t.common.winner}:</span>
              <span className="text-arena-text-bright font-bold">{info.winner.agentName}</span>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {msg && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            msg.type === "success" ? "bg-arena-success/10 text-arena-success" : "bg-arena-danger/10 text-arena-danger"
          }`}>
            {msg.text}
            {txHash && (
              <a
                href={getExplorerTxUrl(txHash, chain)}
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
    </div>
  );
}

export default function MatchDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchMatch() {
      if (!matchId || matchId === "undefined") {
        setError("Invalid match ID.");
        setLoading(false);
        return;
      }
      try {
        const data = await api.getMatch(matchId);
        const m = data.match;
        const raw = m as any;
        setMatch({
          ...m,
          id: m.id || raw._id || matchId,
          winnerId: m.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || undefined,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.matchDetail.loadFailed
        );
      } finally {
        setLoading(false);
      }
    }
    fetchMatch();
  }, [matchId, t.matchDetail.loadFailed]);

  // Poll match data while status is "starting" so page updates when match goes active
  useEffect(() => {
    if (!match || (match.status !== "starting" && match.status !== "pending")) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getMatch(matchId);
        const m = data.match;
        const raw = m as any;
        setMatch({
          ...m,
          id: m.id || raw._id || matchId,
          winnerId: m.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || undefined,
        });
      } catch {
        // silently fail, next poll will retry
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [match?.status, matchId]);

  const handleMatchUpdate = useCallback((updatedMatch: Match) => {
    const raw = updatedMatch as any;
    setMatch((prev) => {
      const base = prev ?? {} as Match;
      return {
        ...base,
        ...updatedMatch,
        // Preserve fields that partial WS events (match:end) don't include
        gameType: updatedMatch.gameType || base.gameType,
        agents: updatedMatch.agents || base.agents,
        createdAt: updatedMatch.createdAt || base.createdAt,
        updatedAt: updatedMatch.updatedAt || base.updatedAt,
        id: updatedMatch.id || raw._id || base.id || matchId,
        winnerId: updatedMatch.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || base.winnerId,
      };
    });
  }, [matchId]);

  const copyMatchId = () => {
    navigator.clipboard.writeText(match?.id || "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const shareMatch = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) return <DetailSkeleton />;

  if (error || !match) {
    return (
      <div className="page-container">
        <div className="dash-glass-card rounded-2xl">
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-arena-danger/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-arena-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-arena-text-bright font-semibold mb-1">
              {error || t.matchDetail.matchNotFound}
            </p>
            <Link href="/matches" className="inline-block mt-4">
              <Button variant="secondary">{t.matchDetail.backToMatches}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const agents = normalizeMatchAgents(match.agents, match.pokerPlayers);
  const pot = match.pot ?? (match as any).potAmount ?? 0;
  const isActive = match.status === "active" || match.status === "starting";
  const isCompleted = match.status === "completed";
  const sideMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  const isDraw = isCompleted && !match.winnerId;
  const winnerAgent = isCompleted && match.winnerId
    ? agents.find((a) => a.agentId === match.winnerId)
      ?? (match.winnerId in sideMap ? agents[sideMap[match.winnerId]] : null)
    : null;
  const displayId = match.id || matchId;
  const truncatedId = displayId.length > 16
    ? `${displayId.slice(0, 8)}...${displayId.slice(-6)}`
    : displayId;

  return (
    <div className="page-container">
      {/* ── Breadcrumb ── */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-primary transition-colors mb-6 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {t.matchDetail.backToMatches}
      </Link>

      {/* ── Hero Header ── */}
      <div className="dash-hero p-6 sm:p-8 mb-6 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        {/* Gradient orbs */}
        <div className="dash-hero-orb w-44 h-44 bg-arena-primary/10 -top-20 -right-10 animate-pulse-soft" />
        <div className="dash-hero-orb w-32 h-32 bg-arena-accent/8 -bottom-10 left-4 animate-pulse-soft" style={{ animationDelay: "2s" }} />

        <div className="relative z-10">
          {/* Row 1: Badges + Utilities */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-arena-primary capitalize font-medium font-mono bg-arena-primary/5 px-2.5 py-1 rounded">
                {match.gameType}
              </span>
              {match.chain && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  match.chain === "celo"
                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  {match.chain === "celo" ? "Celo" : "Base"}
                </span>
              )}
              <Badge status={match.status} />
              {isActive && (
                <span className="flex items-center gap-1.5 text-[11px] text-arena-success font-semibold uppercase tracking-wider">
                  <span className="relative w-2 h-2">
                    <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                    <span className="relative block w-2 h-2 bg-arena-success rounded-full" />
                  </span>
                  {match.status === "starting" ? "STARTING" : t.common.live}
                </span>
              )}
            </div>

            {/* Utility buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={copyMatchId}
                className="flex items-center gap-1.5 text-[11px] text-arena-muted hover:text-arena-primary font-mono px-2.5 py-1.5 rounded-lg bg-white/50 border border-white/60 hover:border-arena-primary/20 transition-all"
              >
                {copiedId ? <IconCheck className="w-3 h-3 text-arena-success" /> : <IconCopy className="w-3 h-3" />}
                {copiedId ? t.matchDetail.copied : t.matchDetail.copyId}
              </button>
              <button
                onClick={shareMatch}
                className="flex items-center gap-1.5 text-[11px] text-arena-muted hover:text-arena-primary font-mono px-2.5 py-1.5 rounded-lg bg-white/50 border border-white/60 hover:border-arena-primary/20 transition-all"
              >
                {copiedLink ? <IconCheck className="w-3 h-3 text-arena-success" /> : <IconShare className="w-3 h-3" />}
                {copiedLink ? t.matchDetail.linkCopied : t.matchDetail.shareMatch}
              </button>
            </div>
          </div>

          {/* Row 2: Title + ID */}
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright leading-tight mb-1">
            <span className="capitalize">{match.gameType}</span> {t.matchDetail.match}
          </h1>
          <p className="text-xs text-arena-muted font-mono mb-5">{truncatedId}</p>

          {/* Row 3: Players Layout */}
          {agents.length >= 2 && agents.length <= 2 && (
            /* Classic 2-player VS layout */
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-5 py-2">
              {/* Agent A - Right-aligned */}
              <div className="flex-1 flex flex-col items-end max-w-[200px]">
                <div className="relative mb-2">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${PLAYER_GRADIENTS[0]} flex items-center justify-center shrink-0`}
                    style={{ boxShadow: `0 4px 14px ${PLAYER_COLORS[0]}35, inset 0 1px 0 rgba(255,255,255,0.25)` }}
                  >
                    <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-sm">{agents[0].agentName.charAt(0).toUpperCase()}</span>
                  </div>
                  {winnerAgent?.agentId === agents[0].agentId && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-arena-accent flex items-center justify-center shadow-md">
                      <IconCrown className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm sm:text-base font-bold text-arena-text-bright leading-tight">{agents[0].agentName}</div>
                  <div className="text-[10px] text-arena-muted font-mono">{t.common.by} {agents[0].username}</div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-sm font-extrabold text-arena-text-bright font-mono tabular-nums">{agents[0].eloAtStart}</span>
                    <span className="text-[10px] text-arena-muted font-mono">ELO</span>
                    {agents[0].eloChange !== undefined && agents[0].eloChange !== null && agents[0].eloChange !== 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-bold font-mono ${
                        agents[0].eloChange > 0 ? "text-arena-success" : "text-arena-danger"
                      }`}>
                        {agents[0].eloChange > 0 ? <IconArrowUp className="w-3 h-3" /> : <IconArrowDown className="w-3 h-3" />}
                        {Math.abs(agents[0].eloChange)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* VS Center */}
              <div className="shrink-0 flex flex-col items-center">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 ${
                  isActive
                    ? "bg-arena-success/10 border-arena-success/30"
                    : "bg-white/60 border-arena-border-light/60"
                }`}>
                  <span className={`text-xs sm:text-sm font-extrabold tracking-wider ${
                    isActive ? "text-arena-success" : "text-arena-muted"
                  }`}>
                    VS
                  </span>
                </div>
              </div>

              {/* Agent B - Left-aligned */}
              <div className="flex-1 flex flex-col items-start max-w-[200px]">
                <div className="relative mb-2">
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${PLAYER_GRADIENTS[1]} flex items-center justify-center shrink-0`}
                    style={{ boxShadow: `0 4px 14px ${PLAYER_COLORS[1]}35, inset 0 1px 0 rgba(255,255,255,0.25)` }}
                  >
                    <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-sm">{agents[1].agentName.charAt(0).toUpperCase()}</span>
                  </div>
                  {winnerAgent?.agentId === agents[1].agentId && (
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-arena-accent flex items-center justify-center shadow-md">
                      <IconCrown className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm sm:text-base font-bold text-arena-text-bright leading-tight">{agents[1].agentName}</div>
                  <div className="text-[10px] text-arena-muted font-mono">{t.common.by} {agents[1].username}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm font-extrabold text-arena-text-bright font-mono tabular-nums">{agents[1].eloAtStart}</span>
                    <span className="text-[10px] text-arena-muted font-mono">ELO</span>
                    {agents[1].eloChange !== undefined && agents[1].eloChange !== null && agents[1].eloChange !== 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-bold font-mono ${
                        agents[1].eloChange > 0 ? "text-arena-success" : "text-arena-danger"
                      }`}>
                        {agents[1].eloChange > 0 ? <IconArrowUp className="w-3 h-3" /> : <IconArrowDown className="w-3 h-3" />}
                        {Math.abs(agents[1].eloChange)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* N-player layout (3+) */}
          {agents.length > 2 && (
            <div className="mb-5 py-2">
              {/* Inline "vs" names row */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                {agents.map((agent, idx) => (
                  <span key={agent.agentId ?? idx} className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <span className="text-[10px] font-bold text-arena-muted uppercase">vs</span>
                    )}
                    <span className="text-sm sm:text-base font-bold text-arena-text-bright">{agent.agentName}</span>
                  </span>
                ))}
              </div>
              {/* Player cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {agents.map((agent, idx) => (
                  <div
                    key={agent.agentId ?? idx}
                    className="flex items-center gap-2.5 bg-white/50 border border-white/60 rounded-xl px-3 py-2.5"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${PLAYER_GRADIENTS[idx % PLAYER_GRADIENTS.length]} flex items-center justify-center`}
                        style={{ boxShadow: `0 3px 10px ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}35` }}
                      >
                        <span className="text-base font-bold text-white drop-shadow-sm">{agent.agentName.charAt(0).toUpperCase()}</span>
                      </div>
                      {winnerAgent?.agentId === agent.agentId && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-arena-accent flex items-center justify-center shadow-md">
                          <IconCrown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-arena-text-bright leading-tight truncate">{agent.agentName}</div>
                      <div className="text-[10px] text-arena-muted font-mono truncate">{t.common.by} {agent.username}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs font-extrabold text-arena-text-bright font-mono tabular-nums">{agent.eloAtStart}</span>
                        <span className="text-[9px] text-arena-muted font-mono">ELO</span>
                        {agent.eloChange !== undefined && agent.eloChange !== null && agent.eloChange !== 0 && (
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold font-mono ${
                            agent.eloChange > 0 ? "text-arena-success" : "text-arena-danger"
                          }`}>
                            {agent.eloChange > 0 ? <IconArrowUp className="w-2.5 h-2.5" /> : <IconArrowDown className="w-2.5 h-2.5" />}
                            {Math.abs(agent.eloChange)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ELO Comparison Bar (2-player only) */}
          {agents.length === 2 && (
            <EloComparisonBar
              eloA={agents[0].eloAtStart}
              eloB={agents[1].eloAtStart}
              nameA={agents[0].agentName}
              nameB={agents[1].agentName}
              colorA={PLAYER_COLORS[0]}
              colorB={PLAYER_COLORS[1]}
            />
          )}

          {/* Row 4: Meta info pills */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-5">
            <span className="flex items-center gap-1.5 text-[11px] text-arena-muted font-mono bg-white/50 px-3 py-1.5 rounded-lg border border-white/60">
              <svg className="w-3 h-3 text-arena-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.common.stake}: {match.stakeAmount} ALPHA
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-arena-muted font-mono bg-white/50 px-3 py-1.5 rounded-lg border border-white/60">
              <svg className="w-3 h-3 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              {t.common.pot}: {pot} ALPHA
            </span>
            {match.moveCount > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-arena-muted font-mono bg-white/50 px-3 py-1.5 rounded-lg border border-white/60">
                <svg className="w-3 h-3 text-arena-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                {match.moveCount} {(match.gameType === "poker" ? t.common.hands : t.common.moves).toLowerCase()}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-arena-muted font-mono bg-white/50 px-3 py-1.5 rounded-lg border border-white/60">
              <svg className="w-3 h-3 text-arena-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatRelativeTime(match.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Match Viewer ── */}
      <MatchViewer match={match} onMatchUpdate={handleMatchUpdate} />

      {/* ── Betting Panel ── */}
      {agents.length === 2 && <BettingPanel match={match} />}

      {/* ── Result Section (completed) ── */}
      {isCompleted && (
        <div className="mt-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="dash-glass-card rounded-2xl p-6">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-5 h-5 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a18.991 18.991 0 01-4.27.492 18.99 18.99 0 01-4.27-.493" />
              </svg>
              <h3 className="text-[11px] text-arena-text font-semibold uppercase tracking-widest font-mono">
                {t.matchDetail.matchResult}
              </h3>
            </div>

            {/* Winner/Draw Banner */}
            {winnerAgent ? (
              <div className="bg-gradient-to-r from-arena-accent/10 via-arena-accent/5 to-transparent border border-arena-accent/20 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-arena-accent/15 flex items-center justify-center shrink-0">
                  <IconCrown className="w-5 h-5 text-arena-accent" />
                </div>
                <div>
                  <div className="text-sm font-bold text-arena-text-bright">{winnerAgent.agentName}</div>
                  <div className="text-[10px] text-arena-accent font-semibold uppercase tracking-wider">{t.common.winner}</div>
                </div>
              </div>
            ) : isDraw && (
              <div className="bg-arena-muted/5 border border-arena-muted/20 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-arena-muted/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-arena-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-arena-text-bright">{t.matchDetail.draw}</div>
                </div>
              </div>
            )}

            {/* Agent Result Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agents.map((agent, idx) => {
                const sides = ["a", "b", "c", "d"];
                const isWinner = match.winnerId === agent.agentId || match.winnerId === sides[idx];
                const eloAfter = agent.eloChange !== undefined && agent.eloChange !== null
                  ? agent.eloAtStart + agent.eloChange
                  : null;
                return (
                  <div
                    key={agent.agentId}
                    className={`dash-glass-card rounded-xl p-5 transition-all ${
                      isWinner ? "ring-2 ring-arena-accent/25 shadow-[0_0_20px_rgba(232,165,0,0.08)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PLAYER_GRADIENTS[idx] || PLAYER_GRADIENTS[0]} flex items-center justify-center shrink-0`}
                          style={{ boxShadow: `0 3px 10px ${PLAYER_COLORS[idx] || PLAYER_COLORS[0]}35, inset 0 1px 0 rgba(255,255,255,0.25)` }}
                        >
                          <span className="text-lg font-extrabold text-white drop-shadow-sm">
                            {agent.agentName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {isWinner && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-arena-accent flex items-center justify-center shadow-sm">
                            <IconCrown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-arena-text-bright truncate">{agent.agentName}</span>
                          {isWinner && (
                            <span className="flex items-center gap-1 text-[10px] bg-arena-accent/12 text-arena-accent px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                              {t.common.won}
                            </span>
                          )}
                          {!isWinner && match.winnerId && (
                            <span className="flex items-center gap-1 text-[10px] bg-arena-danger/8 text-arena-danger px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                              {t.common.lost}
                            </span>
                          )}
                          {isDraw && (
                            <span className="flex items-center gap-1 text-[10px] bg-arena-muted/10 text-arena-muted px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                              {t.matchDetail.draw}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-arena-muted">{t.common.by} {agent.username}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-arena-border-light/40">
                      {/* ELO Before */}
                      <div>
                        <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono mb-0.5">{t.common.elo}</div>
                        <div className="text-lg font-extrabold text-arena-text-bright font-mono tabular-nums">{agent.eloAtStart}</div>
                      </div>

                      {/* ELO Change */}
                      {agent.eloChange !== undefined && agent.eloChange !== null && (
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono mb-0.5">Change</div>
                          <div className={`flex items-center gap-1 text-lg font-extrabold font-mono tabular-nums ${
                            agent.eloChange > 0 ? "text-arena-success" : agent.eloChange < 0 ? "text-arena-danger" : "text-arena-muted"
                          }`}>
                            {agent.eloChange > 0 && <IconArrowUp className="w-4 h-4" />}
                            {agent.eloChange < 0 && <IconArrowDown className="w-4 h-4" />}
                            {agent.eloChange > 0 ? "+" : ""}{agent.eloChange}
                          </div>
                        </div>
                      )}

                      {/* Final Score or ELO After */}
                      {agent.finalScore !== undefined ? (
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono mb-0.5">{t.common.score}</div>
                          <div className="text-lg font-extrabold text-arena-primary font-mono tabular-nums">{agent.finalScore}</div>
                        </div>
                      ) : eloAfter !== null && (
                        <div>
                          <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono mb-0.5">{t.matchDetail.eloAfter}</div>
                          <div className="text-lg font-extrabold text-arena-text-bright font-mono tabular-nums">{eloAfter}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result reason */}
            {match.result && (
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-arena-border-light/40">
                <span className="text-xs text-arena-muted font-mono">{t.common.result}: </span>
                <span className="text-sm text-arena-text">
                  {typeof match.result === "string"
                    ? match.result
                    : (match.result as any)?.reason || JSON.stringify(match.result)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
