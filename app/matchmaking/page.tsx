"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatElo, formatUsdEquivalent } from "@/lib/utils";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import type { Agent, AgentBalance, QueueStatus, QueueListEntry } from "@/lib/types";
import type { Socket } from "socket.io-client";

interface QueuedAgent {
  agentId: string;
  status: QueueStatus | null;
  cancelling: boolean;
  joinedAt: number;
}

interface CountdownAgent {
  agentId: string;
  name?: string;
  eloAtStart?: number;
}

/* ── Radar scan animation for queue search ── */
function RadarScan() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute inset-0 rounded-full border-2 border-arena-primary/20" />
      <div className="absolute inset-3 rounded-full border border-arena-primary/15" />
      <div className="absolute inset-6 rounded-full border border-arena-primary/10" />
      <div className="absolute inset-0 rounded-full radar-scan" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-arena-primary animate-pulse" />
      </div>
    </div>
  );
}

/* ── Elapsed time display ── */
function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono tabular-nums text-arena-muted">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

/* ── Countdown ring (SVG) ── */
function CountdownRing({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const pct = Math.round((seconds / total) * 100);
  const circumference = 2 * Math.PI * 45;
  const isUrgent = seconds <= 5;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg
        className="w-32 h-32 transform -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50" cy="50" r="45"
          fill="none" stroke="#D4D0C8" strokeWidth="4"
        />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={isUrgent ? "#059669" : "#5B4FCF"}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold font-mono tabular-nums ${isUrgent ? "text-arena-success" : "text-arena-primary"}`}>
          {seconds}
        </span>
        <span className="text-[10px] text-arena-muted uppercase tracking-widest">
          sec
        </span>
      </div>
    </div>
  );
}

/* ── Agent selection card ── */
function AgentCard({
  agent,
  selected,
  onSelect,
  balance,
  balanceLoading,
  priceUsd,
  disabled,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
  balance: AgentBalance | null;
  balanceLoading: boolean;
  priceUsd: number | null;
  disabled?: boolean;
}) {
  const wins = agent.stats?.wins || 0;
  const losses = agent.stats?.losses || 0;
  const draws = agent.stats?.draws || 0;
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
        disabled
          ? "border-arena-border-light bg-arena-bg/50 opacity-60 cursor-not-allowed"
          : selected
            ? "border-arena-primary bg-arena-primary/[0.04] shadow-arena"
            : "border-arena-border-light bg-white hover:border-arena-primary/30 hover:shadow-arena-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            selected ? "bg-arena-primary text-white" : "bg-arena-bg text-arena-primary"
          }`}>
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-arena-text text-sm leading-tight">{agent.name}</div>
            <div className="text-[10px] text-arena-muted font-mono">{formatElo(agent.elo)} ELO</div>
          </div>
        </div>
        {disabled ? (
          <span className="px-2 py-0.5 rounded-md bg-arena-accent/10 text-arena-accent text-[10px] font-mono uppercase tracking-wider">
            In Queue
          </span>
        ) : (
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            selected ? "border-arena-primary bg-arena-primary" : "border-arena-border-light"
          }`}>
            {selected && (
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-arena-success font-semibold">{wins}W</span>
          <span className="text-arena-muted">/</span>
          <span className="text-arena-danger font-semibold">{losses}L</span>
          <span className="text-arena-muted">/</span>
          <span className="text-arena-muted">{draws}D</span>
        </div>
        {total > 0 && (
          <span className={`text-xs font-mono font-medium ${
            winRate >= 60 ? "text-arena-success" : winRate >= 40 ? "text-arena-primary" : "text-arena-danger"
          }`}>
            {winRate}%
          </span>
        )}
      </div>

      {/* Win rate bar */}
      {total > 0 && (
        <div className="w-full h-1 rounded-full bg-arena-bg overflow-hidden mb-3">
          <div className="h-full flex">
            <div className="bg-arena-success h-full" style={{ width: `${(wins / total) * 100}%` }} />
            <div className="bg-arena-danger/60 h-full" style={{ width: `${(losses / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Balance */}
      {selected && (
        <div className="pt-2 border-t border-arena-border-light/60 mt-1">
          {balanceLoading ? (
            <div className="text-xs text-arena-muted font-mono animate-pulse">Loading balance...</div>
          ) : balance ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-sm font-bold font-mono tabular-nums text-arena-primary truncate min-w-0">{Number(balance.alpha).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-arena-muted">ALPHA</span>
              </div>
              {(() => { const usd = formatUsdEquivalent(parseFloat(balance.alpha) || 0, priceUsd); return usd ? <span className="text-[10px] text-arena-muted">{usd}</span> : null; })()}
              <div className="flex items-baseline gap-1 pt-0.5">
                <span className="text-xs font-mono tabular-nums text-arena-muted">{Number(balance.eth).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                <span className="text-[10px] text-arena-muted">ETH</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-arena-muted font-mono">Balance unavailable</div>
          )}
        </div>
      )}
    </button>
  );
}

const FIXED_STAKE = 1_000_000;

function MatchmakingContent() {
  const { t } = useLanguage();
  const { priceUsd } = useAlphaPrice();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedAgentId = searchParams.get("agentId") || "";

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState(preselectedAgentId);
  const [gameType] = useState("chess");
  const [joining, setJoining] = useState(false);

  // Agent balance state
  const [agentBalance, setAgentBalance] = useState<AgentBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Queue state
  const [queuedAgents, setQueuedAgents] = useState<QueuedAgent[]>([]);
  const [queueSize, setQueueSize] = useState<number | null>(null);
  const [playingCount, setPlayingCount] = useState<number | null>(null);
  const [autoPlayCount, setAutoPlayCount] = useState<number | null>(null);
  const [queueList, setQueueList] = useState<QueueListEntry[]>([]);

  // Backend countdown state (broadcast via WebSocket)
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const [countdownAgents, setCountdownAgents] = useState<CountdownAgent[]>([]);
  const COUNTDOWN_TOTAL = 30;

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const queuedAgentIdsRef = useRef<Set<string>>(new Set());

  // Fetch agents
  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await api.getAgents();
        setAgents(data.agents || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.matchmaking.joinFailed
        );
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, [t.matchmaking.joinFailed]);

  // Fetch agent balance when selection changes
  useEffect(() => {
    if (!selectedAgentId) {
      setAgentBalance(null);
      return;
    }
    let cancelled = false;
    async function fetchBalance() {
      setBalanceLoading(true);
      try {
        const data = await api.getAgentBalance(selectedAgentId);
        if (!cancelled) setAgentBalance(data);
      } catch {
        if (!cancelled) setAgentBalance(null);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    }
    fetchBalance();
    return () => { cancelled = true; };
  }, [selectedAgentId]);

  // Fetch queue size, playing count, auto-play count, queue list
  useEffect(() => {
    async function fetchQueueStats() {
      try {
        const [sizeRes, playingRes, autoPlayRes, queueListRes] = await Promise.allSettled([
          api.getQueueSize(gameType),
          api.getPlayingCount(),
          api.getAutoPlayCount(),
          api.getQueueList(gameType),
        ]);
        if (playingRes.status === "fulfilled") setPlayingCount(playingRes.value.playingCount);
        if (autoPlayRes.status === "fulfilled") setAutoPlayCount(autoPlayRes.value.autoPlayCount);
        if (queueListRes.status === "fulfilled") {
          const list = queueListRes.value.queue || [];
          setQueueList(list);
          setQueueSize(queueListRes.value.total ?? list.length);
        } else if (sizeRes.status === "fulfilled") {
          setQueueSize(sizeRes.value.size);
        }
      } catch {
        // silently handle
      }
    }
    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 5000);
    return () => clearInterval(interval);
  }, [gameType]);

  // WebSocket: listen for countdown ticks and match creation
  useEffect(() => {
    const socket = api.connectSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.onAny((eventName: string, raw: any) => {
      if (eventName !== "message") return;
      const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      const type = msg?.type;
      const data = msg?.data;
      if (!type || !data) return;

      if (type === "matchmaking:countdown") {
        const remainingMs = data.remainingMs ?? data.remaining ?? 0;
        const agentsList: CountdownAgent[] = Array.isArray(data.agents)
          ? data.agents
          : [];
        const seconds = Math.ceil(remainingMs / 1000);

        if (seconds > 0) {
          setCountdownActive(true);
          setCountdownSeconds(seconds);
          setCountdownAgents(agentsList);
        } else {
          setCountdownActive(false);
          setCountdownSeconds(0);
        }
      }

      if (type === "matchmaking:matched") {
        const matchId = data.matchId;
        const matchedAgentIds: string[] = Array.isArray(data.agents)
          ? data.agents
          : [];

        if (!matchId) return;

        // Check if any of MY queued agents are in this match
        const myIds = queuedAgentIdsRef.current;
        const myAgentMatched = matchedAgentIds.some((id) => myIds.has(id));

        if (myAgentMatched) {
          router.push(`/matches/${matchId}`);
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // Poll queue status for queued agents
  const queuedAgentsRef = useRef<QueuedAgent[]>([]);
  queuedAgentsRef.current = queuedAgents;

  useEffect(() => {
    if (queuedAgents.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      const current = queuedAgentsRef.current;
      if (current.length === 0) return;

      const agentIds = current.map((qa) => qa.agentId);
      const updates = await Promise.allSettled(
        agentIds.map((id) => api.getQueueStatus(id))
      );

      const statusMap = new Map<string, QueueStatus>();
      const failedIds = new Set<string>();

      agentIds.forEach((id, i) => {
        if (updates[i].status === "fulfilled") {
          const value = updates[i].value;
          statusMap.set(id, value);
          if (value.matchId) {
            router.push(`/matches/${value.matchId}`);
          }
        } else {
          failedIds.add(id);
        }
      });

      setQueuedAgents((prev) =>
        prev
          .map((qa) => {
            const newStatus = statusMap.get(qa.agentId);
            return newStatus ? { ...qa, status: newStatus } : qa;
          })
          .filter((qa) => {
            if (failedIds.has(qa.agentId)) return false;
            const s = qa.status?.status;
            return s !== "matched" && s !== "cancelled";
          })
      );
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [queuedAgents.length, router]);

  const handleJoinQueue = async () => {
    setError("");
    setJoining(true);

    if (!selectedAgentId) {
      setError(t.matchmaking.selectAgentError);
      setJoining(false);
      return;
    }

    try {
      await api.joinQueue(selectedAgentId, FIXED_STAKE, gameType);
      queuedAgentIdsRef.current.add(selectedAgentId);
      setQueuedAgents((prev) => [
        ...prev,
        {
          agentId: selectedAgentId,
          status: { status: "queued" },
          cancelling: false,
          joinedAt: Date.now(),
        },
      ]);
      setSelectedAgentId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.matchmaking.joinFailed
      );
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async (agentId: string) => {
    setQueuedAgents((prev) =>
      prev.map((qa) =>
        qa.agentId === agentId ? { ...qa, cancelling: true } : qa
      )
    );
    try {
      await api.cancelQueue(agentId);
      queuedAgentIdsRef.current.delete(agentId);
      setQueuedAgents((prev) =>
        prev.filter((qa) => qa.agentId !== agentId)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.matchmaking.cancelFailed
      );
      setQueuedAgents((prev) =>
        prev.map((qa) =>
          qa.agentId === agentId ? { ...qa, cancelling: false } : qa
        )
      );
    }
  };

  const localQueuedIds = queuedAgents.map((qa) => qa.agentId);
  const backendQueuedIds = queueList.map((ql) => ql.agentId);
  const allQueuedIds = new Set(localQueuedIds.concat(backendQueuedIds));
  const idleAgents = agents.filter((a) => a.status === "idle");

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto">
        {/* ── Page Header with inline stats ── */}
        <div className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-arena-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text">
                    {t.matchmaking.title}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-arena-success/10 text-arena-success text-[10px] font-mono uppercase tracking-wider">
                    Chess
                  </span>
                </div>
                <p className="text-arena-muted text-sm leading-relaxed">
                  {t.matchmaking.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-arena-primary">
                    {queueSize !== null ? queueSize : "-"}
                  </div>
                  <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono">
                    {t.matchmaking.agentsWaiting}
                  </div>
                </div>
                <div className="text-center pl-4 border-l border-arena-border-light">
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-arena-success">
                    {playingCount !== null ? playingCount : "-"}
                  </div>
                  <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono">
                    {t.matchmaking.playingNow}
                  </div>
                </div>
                <div className="text-center pl-4 border-l border-arena-border-light">
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-500">
                    {autoPlayCount !== null ? autoPlayCount : "-"}
                  </div>
                  <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono">
                    {t.matchmaking.autoPlayActive}
                  </div>
                </div>
                {queuedAgents.length > 0 && (
                  <div className="text-center pl-4 border-l border-arena-border-light">
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-arena-accent">
                      {queuedAgents.length}
                    </div>
                    <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono">
                      {t.matchmaking.yourAgentsInQueue}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ── Queue List ── */}
        {queueList.length > 0 && (
          <div
            className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm overflow-hidden mb-8 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.18s", animationFillMode: "both" }}
          >
            <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
              <h2 className="text-lg font-display font-semibold text-arena-text">
                {t.matchmaking.queueList}
              </h2>
            </div>
            <div className="divide-y divide-arena-border-light/60">
              {queueList.map((entry) => (
                <div
                  key={entry.agentId}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-arena-primary/60 shrink-0" />
                    <span className="text-sm font-mono text-arena-text truncate">
                      {entry.agentId.slice(0, 12)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-arena-muted shrink-0">
                    <span className="font-mono">
                      {t.matchmaking.eloRating}: {Math.round(entry.eloRating)}
                    </span>
                    <span className="font-mono">
                      {t.matchmaking.stake}: {entry.stakeAmount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Backend Countdown ── */}
        {countdownActive && (
          <div className="bg-white border-2 border-arena-primary/40 rounded-2xl p-6 sm:p-8 mb-8 shadow-arena-lg opacity-0 animate-scale-in relative overflow-hidden glow-border-active">
            <div className="absolute inset-0 bg-gradient-to-br from-arena-primary/[0.04] via-transparent to-arena-success/[0.03] pointer-events-none" />

            <div className="relative text-center">
              <div className="mb-5">
                <CountdownRing seconds={countdownSeconds} total={COUNTDOWN_TOTAL} />
              </div>

              <h2 className={`text-xl font-display font-bold mb-1 ${countdownSeconds <= 5 ? "text-arena-success" : "text-arena-text"}`}>
                {countdownSeconds <= 5 ? t.matchmaking.matchFound : t.matchmaking.searching}
              </h2>
              <p className="text-sm text-arena-muted mb-1">
                {t.matchmaking.matchWillStart}
              </p>

              {countdownAgents.length > 0 && (
                <div className="pt-5 border-t border-arena-border-light/60 mt-5">
                  <p className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-3">
                    {t.matchmaking.agentsReady} ({countdownAgents.length})
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {countdownAgents.map((ca) => (
                      <div
                        key={ca.agentId}
                        className="bg-arena-bg border border-arena-border-light rounded-xl px-4 py-2 flex items-center gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-arena-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-arena-primary">
                            {(ca.name || ca.agentId).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-sm text-arena-text font-medium block leading-tight">
                            {ca.name || ca.agentId.slice(0, 8)}
                          </span>
                          {ca.eloAtStart !== undefined && (
                            <span className="text-[10px] text-arena-muted font-mono">
                              {formatElo(ca.eloAtStart)} ELO
                            </span>
                          )}
                        </div>
                        <div className="w-2 h-2 rounded-full bg-arena-success animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Queued Agents ── */}
        {queuedAgents.length > 0 && (
          <div className="mb-8 space-y-3">
            {queuedAgents.map((qa, i) => {
              const agentInfo = agents.find((a) => a.id === qa.agentId);
              return (
                <div
                  key={qa.agentId}
                  className="bg-white border border-arena-primary/20 rounded-xl p-4 sm:p-5 shadow-arena-sm opacity-0 animate-fade-up relative overflow-hidden"
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-primary via-arena-primary-light to-arena-primary rounded-l-xl" />

                  <div className="flex items-center gap-4 pl-2">
                    {/* Radar */}
                    <div className="shrink-0 hidden sm:block">
                      <RadarScan />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-arena-text truncate">
                          {agentInfo?.name || qa.agentId}
                        </span>
                        {agentInfo && (
                          <span className="text-xs text-arena-primary font-mono">
                            {formatElo(agentInfo.elo)}
                          </span>
                        )}
                        <Badge
                          status={
                            qa.status?.status ||
                            qa.status?.agentStatus ||
                            "queued"
                          }
                        />
                        {qa.status?.position !== undefined && (
                          <span className="text-[10px] text-arena-muted font-mono bg-arena-bg px-1.5 py-0.5 rounded">
                            #{qa.status.position}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-arena-muted">
                        <span className="dot-pulse flex gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-arena-primary inline-block" />
                          <span className="w-1 h-1 rounded-full bg-arena-primary inline-block" />
                          <span className="w-1 h-1 rounded-full bg-arena-primary inline-block" />
                        </span>
                        <span>{t.matchmaking.searching}</span>
                        <span className="text-arena-border-light">|</span>
                        <ElapsedTimer startTime={qa.joinedAt} />
                        <span>{t.matchmaking.elapsed}</span>
                      </div>
                    </div>

                    {/* Cancel */}
                    <div className="shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(qa.agentId)}
                        isLoading={qa.cancelling}
                      >
                        {t.matchmaking.cancelQueue}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Join Form ── */}
        <div
          className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm overflow-hidden opacity-0 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Form header */}
          <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
            <h2 className="text-lg font-display font-semibold text-arena-text">
              {t.matchmaking.joinQueue}
            </h2>
          </div>

          <div className="p-6">
            {idleAgents.length === 0 && queuedAgents.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-arena-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p className="text-arena-muted mb-6 max-w-sm mx-auto leading-relaxed text-sm">
                  {t.matchmaking.noIdleAgents}
                </p>
                <a href="/agents/new">
                  <Button size="lg">
                    {t.matchmaking.createAgent}
                  </Button>
                </a>
              </div>
            ) : idleAgents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-arena-muted text-sm">
                  {t.matchmaking.noIdleAgents}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ── Agent selection cards ── */}
                <div>
                  <label className="block text-sm font-medium text-arena-text mb-3">
                    {t.matchmaking.selectAgent}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {idleAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        selected={selectedAgentId === agent.id}
                        onSelect={() => setSelectedAgentId(agent.id)}
                        balance={selectedAgentId === agent.id ? agentBalance : null}
                        balanceLoading={selectedAgentId === agent.id ? balanceLoading : false}
                        priceUsd={priceUsd}
                        disabled={allQueuedIds.has(agent.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Insufficient balance warning */}
                {agentBalance && parseFloat(agentBalance.alpha) < FIXED_STAKE && (
                  <div className="bg-arena-accent/10 border border-arena-accent/30 rounded-xl px-4 py-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-arena-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <div>
                        <p className="text-sm text-arena-accent font-medium">
                          {t.matchmaking.insufficientBalance}: {agentBalance.alpha} ALPHA {t.matchmaking.available}, {t.matchmaking.need} {FIXED_STAKE.toLocaleString()} ALPHA
                        </p>
                        {agentBalance.walletAddress && (
                          <p className="text-xs text-arena-muted mt-1">
                            {t.matchmaking.depositTo}: <span className="font-mono text-arena-text">{agentBalance.walletAddress}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Join button ── */}
                <Button
                  onClick={handleJoinQueue}
                  isLoading={joining}
                  disabled={!selectedAgentId || joining}
                  className="w-full"
                  size="lg"
                >
                  {t.matchmaking.joinQueue}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchmakingPage() {
  return (
    <AuthGuard>
      <MatchmakingContent />
    </AuthGuard>
  );
}
