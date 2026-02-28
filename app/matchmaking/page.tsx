"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatElo } from "@/lib/utils";
import type { Agent, AgentBalance, QueueStatus, QueueListEntry } from "@/lib/types";
import type { Socket } from "socket.io-client";

interface QueuedAgent {
  agentId: string;
  status: QueueStatus | null;
  cancelling: boolean;
}

interface CountdownAgent {
  agentId: string;
  name?: string;
  eloAtStart?: number;
}

/* ── Pulsing ring used while waiting in queue ── */
function PulseRing() {
  return (
    <div className="relative w-16 h-16 mx-auto">
      <div className="absolute inset-0 rounded-full bg-arena-primary/10 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-arena-primary/20 animate-pulse" />
      <div className="absolute inset-4 rounded-full bg-arena-primary/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-arena-primary animate-pulse" />
      </div>
    </div>
  );
}

/* ── Countdown ring (conic gradient) ── */
function CountdownRing({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const pct = Math.round((seconds / total) * 100);
  const circumference = 2 * Math.PI * 45;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg
        className="w-28 h-28 transform -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#D4D0C8"
          strokeWidth="5"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#5B4FCF"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono text-arena-primary tabular-nums">
          {seconds}
        </span>
        <span className="text-[10px] text-arena-muted uppercase tracking-widest">
          sec
        </span>
      </div>
    </div>
  );
}

/* ── Stat mini card ── */
function StatBox({
  label,
  value,
  accent,
  delay,
  subtitle,
}: {
  label: string;
  value: string;
  accent?: string;
  delay: number;
  subtitle?: string;
}) {
  return (
    <div
      className="bg-white border border-arena-border-light rounded-xl px-5 py-4 shadow-arena-sm opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-[10px] text-arena-muted uppercase tracking-wider font-mono mb-1">
        {label}
      </div>
      <div
        className={`text-2xl font-bold font-mono tabular-nums ${accent || "text-arena-text"}`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-arena-muted mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

function MatchmakingContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedAgentId = searchParams.get("agentId") || "";

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState(preselectedAgentId);
  const [stakeAmount, setStakeAmount] = useState("0");
  const [gameType, setGameType] = useState("marrakech");
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

  // Fetch queue list, playing count, and auto-play count
  useEffect(() => {
    async function fetchStats() {
      try {
        const [queueData, playingData, autoPlayData] = await Promise.allSettled([
          api.getQueueList(gameType),
          api.getPlayingCount(),
          api.getAutoPlayCount(),
        ]);
        if (queueData.status === "fulfilled") {
          setQueueList(queueData.value.queue);
          setQueueSize(queueData.value.total);
        }
        if (playingData.status === "fulfilled") {
          setPlayingCount(playingData.value.playingCount);
        }
        if (autoPlayData.status === "fulfilled") {
          setAutoPlayCount(autoPlayData.value.autoPlayCount);
        }
      } catch {
        // silently handle
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
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

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 0) {
      setError(t.matchmaking.invalidStake);
      setJoining(false);
      return;
    }

    try {
      await api.joinQueue(selectedAgentId, stake, gameType);
      queuedAgentIdsRef.current.add(selectedAgentId);
      setQueuedAgents((prev) => [
        ...prev,
        {
          agentId: selectedAgentId,
          status: { status: "queued" },
          cancelling: false,
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

  const queuedIds = new Set(queuedAgents.map((qa) => qa.agentId));
  const availableAgents = agents.filter(
    (a) => a.status === "idle" && !queuedIds.has(a.id)
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        {/* ── Page Header ── */}
        <div
          className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text mb-2">
            {t.matchmaking.title}
          </h1>
          <p className="text-arena-muted leading-relaxed">
            {t.matchmaking.subtitle}
          </p>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ── Queue Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatBox
            label={t.matchmaking.currentQueue}
            value={queueSize !== null ? String(queueSize) : "-"}
            accent="text-arena-primary"
            delay={0.1}
            subtitle={t.matchmaking.agentsWaiting}
          />
          <StatBox
            label={t.matchmaking.playingNow}
            value={playingCount !== null ? String(playingCount) : "-"}
            accent="text-arena-success"
            delay={0.12}
            subtitle={t.matchmaking.agentsPlaying}
          />
          <StatBox
            label={t.matchmaking.autoPlayActive}
            value={autoPlayCount !== null ? String(autoPlayCount) : "-"}
            accent="text-amber-500"
            delay={0.14}
            subtitle={t.matchmaking.agentsAutoPlay}
          />
          <StatBox
            label={t.common.gameType}
            value={gameType.charAt(0).toUpperCase() + gameType.slice(1)}
            delay={0.16}
          />
        </div>

        {/* ── Queue List ── */}
        {queueList.length > 0 && (
          <div
            className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm overflow-hidden mb-8 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.18s" }}
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
                    <span>
                      {t.matchmaking.waitingSince}{" "}
                      {new Date(entry.joinedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Backend Countdown ── */}
        {countdownActive && (
          <div
            className="bg-white border-2 border-arena-primary/40 rounded-2xl p-6 sm:p-8 mb-8 shadow-arena-lg opacity-0 animate-scale-in relative overflow-hidden"
          >
            {/* Subtle glow background */}
            <div className="absolute inset-0 bg-gradient-to-br from-arena-primary/[0.03] via-transparent to-arena-accent/[0.02] pointer-events-none" />

            <div className="relative text-center">
              <div className="mb-5">
                <CountdownRing
                  seconds={countdownSeconds}
                  total={COUNTDOWN_TOTAL}
                />
              </div>

              <h2 className="text-lg font-display font-bold text-arena-text mb-1">
                Match Starting Soon
              </h2>
              <p className="text-sm text-arena-muted mb-1">
                Waiting{" "}
                <span className="text-arena-primary font-semibold font-mono">
                  {countdownSeconds}s
                </span>{" "}
                for more agents to join...
              </p>
              <p className="text-xs text-arena-muted/70 mb-5">
                The match will start automatically when the countdown ends.
              </p>

              {countdownAgents.length > 0 && (
                <div className="pt-4 border-t border-arena-border-light/60">
                  <p className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-3">
                    Agents Ready ({countdownAgents.length})
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {countdownAgents.map((ca) => (
                      <div
                        key={ca.agentId}
                        className="bg-arena-bg border border-arena-border-light rounded-lg px-3 py-1.5 flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-arena-success animate-pulse" />
                        <span className="text-sm text-arena-text font-medium">
                          {ca.name || ca.agentId.slice(0, 8)}
                        </span>
                        {ca.eloAtStart !== undefined && (
                          <span className="text-xs text-arena-muted font-mono">
                            {formatElo(ca.eloAtStart)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Queued Agents ── */}
        {queuedAgents.map((qa, i) => {
          const agentInfo = agents.find((a) => a.id === qa.agentId);
          return (
            <div
              key={qa.agentId}
              className="bg-white border border-arena-primary/30 rounded-2xl p-6 mb-6 shadow-arena opacity-0 animate-fade-up relative overflow-hidden"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              {/* Animated side accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-primary via-arena-primary-light to-arena-primary rounded-l-2xl" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <PulseRing />

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-display font-bold text-arena-text mb-1">
                    {t.matchmaking.inQueue}
                  </h3>
                  <p className="text-sm text-arena-muted mb-2">
                    {t.matchmaking.agentLabel}{" "}
                    <span className="text-arena-text font-semibold">
                      {agentInfo?.name || qa.agentId}
                    </span>
                    {agentInfo && (
                      <span className="text-arena-primary font-mono ml-1.5 text-xs">
                        ({formatElo(agentInfo.elo)})
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
                    {qa.status && (
                      <>
                        <Badge
                          status={
                            qa.status.status ||
                            qa.status.agentStatus ||
                            "queued"
                          }
                        />
                        {qa.status.position !== undefined && (
                          <span className="text-xs text-arena-muted font-mono">
                            {t.common.position}: #{qa.status.position}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <p className="text-xs text-arena-muted/70">
                    {t.matchmaking.waitingMsg}
                  </p>
                </div>

                <div className="shrink-0 text-center sm:text-right">
                  <Button
                    variant="danger"
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
            {availableAgents.length === 0 && queuedAgents.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-4 animate-float inline-block">
                  &#129302;
                </div>
                <p className="text-arena-muted mb-6 max-w-sm mx-auto leading-relaxed">
                  {t.matchmaking.noIdleAgents}
                </p>
                <a href="/agents/new">
                  <Button variant="secondary" size="lg">
                    {t.matchmaking.createAgent}
                  </Button>
                </a>
              </div>
            ) : availableAgents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-arena-muted">
                  {t.matchmaking.noIdleAgents}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Agent selector */}
                <Select
                  label={t.matchmaking.selectAgent}
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">{t.matchmaking.chooseAgent}</option>
                  {availableAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({t.common.elo}:{" "}
                      {Math.round(agent.elo || 0)})
                    </option>
                  ))}
                </Select>

                {/* Selected agent preview */}
                {selectedAgentId && (() => {
                  const sel = agents.find((a) => a.id === selectedAgentId);
                  if (!sel) return null;
                  const wins = sel.stats?.wins || 0;
                  const losses = sel.stats?.losses || 0;
                  const draws = sel.stats?.draws || 0;
                  return (
                    <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-arena-text">
                            {sel.name}
                          </span>
                          <Badge status={sel.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-arena-muted">
                          <span className="text-arena-success font-medium">
                            {wins}W
                          </span>
                          <span className="text-arena-danger/80 font-medium">
                            {losses}L
                          </span>
                          <span>{draws}D</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono text-arena-primary tabular-nums">
                          {formatElo(sel.elo)}
                        </div>
                        <div className="text-[10px] text-arena-muted uppercase tracking-widest">
                          {t.common.elo}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Agent Balance Info */}
                {selectedAgentId && (
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4">
                    <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-2">Agent Balance</div>
                    {balanceLoading ? (
                      <div className="text-sm text-arena-muted font-mono">Loading...</div>
                    ) : agentBalance ? (
                      <div className="flex items-end gap-4">
                        <div>
                          <span className="text-xl font-bold font-mono tabular-nums text-arena-primary">{agentBalance.usdc}</span>
                          <span className="text-xs text-arena-muted ml-1">USDC</span>
                        </div>
                        <div>
                          <span className="text-sm font-mono tabular-nums text-arena-muted">{agentBalance.eth}</span>
                          <span className="text-xs text-arena-muted ml-1">ETH</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-arena-muted font-mono">Balance unavailable</div>
                    )}
                    {agentBalance && parseFloat(stakeAmount) > 0 && parseFloat(agentBalance.usdc) < parseFloat(stakeAmount) && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-sm">
                        Insufficient balance: {agentBalance.usdc} USDC available, need {stakeAmount} USDC.
                        {agentBalance.walletAddress && (
                          <span className="block text-xs mt-1 text-amber-600">
                            Deposit to: <span className="font-mono">{agentBalance.walletAddress}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Input
                  label={t.matchmaking.stakeAmount}
                  type="number"
                  min="0"
                  step="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  helperText={t.matchmaking.stakeHelper}
                />

                <Select
                  label={t.common.gameType}
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                >
                  <option value="marrakech">Marrakech</option>
                  <option value="reversi">Reversi</option>
                  <option value="chess">Chess</option>
                </Select>

                <Button
                  onClick={handleJoinQueue}
                  isLoading={joining}
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
