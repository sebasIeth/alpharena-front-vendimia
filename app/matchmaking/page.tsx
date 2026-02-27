"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatElo } from "@/lib/utils";
import type { Agent, QueueStatus } from "@/lib/types";
import type { Socket } from "socket.io-client";

/* ── Types ── */
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

/* ═══════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════ */
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconSwords({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function Avatar({ name, size = "w-10 h-10", textSize = "text-base" }: { name: string; size?: string; textSize?: string }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-arena-primary to-arena-accent flex items-center justify-center shrink-0 shadow-arena-sm`}>
      <span className={`${textSize} font-extrabold text-white`}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/* ── Countdown ring (SVG arc) ── */
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.round((seconds / total) * 100);
  const circumference = 2 * Math.PI * 45;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E8E4DF" strokeWidth="5" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke="#4A2D8A"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold font-mono text-arena-accent tabular-nums">{seconds}</span>
        <span className="text-[10px] text-arena-muted uppercase tracking-widest">sec</span>
      </div>
    </div>
  );
}

/* ── Agent card for selection ── */
function AgentSelectCard({ agent, selected, onSelect }: { agent: Agent; selected: boolean; onSelect: () => void }) {
  const w = agent.stats?.wins || 0;
  const l = agent.stats?.losses || 0;
  const d = agent.stats?.draws || 0;
  const total = w + l + d;
  const wr = total > 0 ? Math.round((w / total) * 100) : 0;

  return (
    <div
      onClick={onSelect}
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-arena-accent bg-arena-accent/[0.04] shadow-arena ring-1 ring-arena-accent/20"
          : "border-arena-border-light bg-white hover:border-arena-accent/30 hover:shadow-arena-sm"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-arena-accent flex items-center justify-center">
          <IconCheck className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar name={agent.name} size="w-11 h-11" textSize="text-sm" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-arena-text-bright text-sm truncate leading-tight">{agent.name}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-mono font-bold text-arena-accent tabular-nums">{formatElo(agent.elo)}</span>
            <span className="text-[10px] text-arena-muted uppercase">ELO</span>
          </div>
        </div>
      </div>

      {/* W/L/D bar */}
      <div className="mt-3 h-1.5 rounded-full overflow-hidden flex bg-arena-border-light/30">
        {total > 0 ? (
          <>
            {w > 0 && <div className="h-full bg-arena-success" style={{ width: `${(w / total) * 100}%` }} />}
            {d > 0 && <div className="h-full bg-arena-muted-light/60" style={{ width: `${(d / total) * 100}%` }} />}
            {l > 0 && <div className="h-full bg-arena-danger/60" style={{ width: `${(l / total) * 100}%` }} />}
          </>
        ) : (
          <div className="h-full w-full bg-arena-border-light/50" />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-arena-success font-mono font-semibold">{w}W</span>
          <span className="text-arena-danger/70 font-mono font-semibold">{l}L</span>
          <span className="text-arena-muted font-mono">{d}D</span>
        </div>
        <span className="text-[11px] font-mono font-bold text-arena-text tabular-nums">{wr}%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN MATCHMAKING
   ═══════════════════════════════════════════════════════ */
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
  const [gameType] = useState("marrakech");
  const [joining, setJoining] = useState(false);

  // Queue state
  const [queuedAgents, setQueuedAgents] = useState<QueuedAgent[]>([]);
  const [queueSize, setQueueSize] = useState<number | null>(null);

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

  // Fetch queue size
  useEffect(() => {
    async function fetchQueueSize() {
      try {
        const data = await api.getQueueSize(gameType);
        setQueueSize(data.size);
      } catch {
        // silently handle
      }
    }
    fetchQueueSize();
    const interval = setInterval(fetchQueueSize, 5000);
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
      <div className="max-w-3xl mx-auto">

        {/* ═══════════════════════════════════════════════════
            HERO BANNER
            ═══════════════════════════════════════════════════ */}
        <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div className="dash-hero-orb w-56 h-56 bg-arena-accent/8 -top-24 -right-14 animate-pulse-soft" />
          <div className="dash-hero-orb w-40 h-40 bg-arena-primary/6 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-arena-accent to-arena-primary flex items-center justify-center shadow-arena-sm">
                  <IconSwords className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright">
                    {t.matchmaking.title}
                  </h1>
                  <p className="text-sm text-arena-muted mt-0.5">{t.matchmaking.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2.5 mt-5">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-arena-border-light/60 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-arena-accent/10 flex items-center justify-center">
                  <IconUsers className="w-3.5 h-3.5 text-arena-accent" />
                </div>
                <div>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-arena-accent leading-none">
                    {queueSize !== null ? queueSize : "—"}
                  </span>
                  <span className="text-[10px] text-arena-muted uppercase tracking-wider ml-1.5">
                    {t.matchmaking.agentsWaiting}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-arena-border-light/60 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-arena-success" />
                <span className="text-sm font-medium text-arena-text capitalize">{gameType}</span>
              </div>
              {queuedAgents.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-arena-accent/5 border border-arena-accent/20 rounded-xl">
                  <span className="relative w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-arena-accent" />
                    <span className="absolute inset-0 rounded-full bg-arena-accent animate-ping opacity-50" />
                  </span>
                  <span className="text-xs font-semibold text-arena-accent">
                    {queuedAgents.length} in queue
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            COUNTDOWN — match starting soon
            ═══════════════════════════════════════════════════ */}
        {countdownActive && (
          <div
            className="bg-white border-2 border-arena-accent/40 rounded-2xl p-6 sm:p-8 mb-8 shadow-arena-lg opacity-0 animate-scale-in relative overflow-hidden"
            style={{ animationFillMode: "both" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-arena-accent/[0.04] via-transparent to-arena-primary/[0.02] pointer-events-none" />

            <div className="relative text-center">
              <div className="mb-5">
                <CountdownRing seconds={countdownSeconds} total={COUNTDOWN_TOTAL} />
              </div>

              <h2 className="text-lg font-display font-bold text-arena-text mb-1">
                Match Starting Soon
              </h2>
              <p className="text-sm text-arena-muted mb-1">
                Waiting{" "}
                <span className="text-arena-accent font-semibold font-mono">{countdownSeconds}s</span>{" "}
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
                  <div className="flex flex-wrap justify-center items-center gap-3">
                    {countdownAgents.map((ca, i) => (
                      <React.Fragment key={ca.agentId}>
                        {i > 0 && (
                          <span className="text-arena-accent font-extrabold text-sm">VS</span>
                        )}
                        <div className="flex items-center gap-2.5 bg-arena-bg border border-arena-border-light rounded-xl px-4 py-2.5">
                          <Avatar name={ca.name || "?"} size="w-8 h-8" textSize="text-xs" />
                          <div className="text-left">
                            <span className="text-sm text-arena-text font-semibold block leading-tight">
                              {ca.name || ca.agentId.slice(0, 8)}
                            </span>
                            {ca.eloAtStart !== undefined && (
                              <span className="text-[10px] text-arena-muted font-mono">{formatElo(ca.eloAtStart)} ELO</span>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            QUEUED AGENTS — searching with radar animation
            ═══════════════════════════════════════════════════ */}
        {queuedAgents.map((qa, i) => {
          const agentInfo = agents.find((a) => a.id === qa.agentId);
          return (
            <div
              key={qa.agentId}
              className="bg-white border border-arena-accent/25 rounded-2xl p-6 mb-6 shadow-arena opacity-0 animate-fade-up relative overflow-hidden"
              style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: "both" }}
            >
              {/* Accent stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-accent via-arena-accent-light to-arena-accent rounded-l-2xl" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 pl-3">
                {/* Radar animation */}
                <div className="relative w-20 h-20 mx-auto sm:mx-0 shrink-0">
                  <div className="mm-radar-ring" />
                  <div className="mm-radar-ring" />
                  <div className="mm-radar-ring" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar name={agentInfo?.name || "?"} size="w-10 h-10" textSize="text-sm" />
                  </div>
                </div>

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
                      <span className="text-arena-accent font-mono ml-1.5 text-xs">
                        ({formatElo(agentInfo.elo)} ELO)
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
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

        {/* ═══════════════════════════════════════════════════
            JOIN FORM — choose agent + stake + enter
            ═══════════════════════════════════════════════════ */}
        <div
          className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm overflow-hidden opacity-0 animate-fade-up"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          {/* Form header */}
          <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
            <h2 className="text-lg font-display font-semibold text-arena-text">
              {t.matchmaking.joinQueue}
            </h2>
          </div>

          <div className="p-6">
            {availableAgents.length === 0 && queuedAgents.length === 0 ? (
              /* ── Empty state ── */
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-arena-accent/10 flex items-center justify-center mx-auto mb-4 animate-float">
                  <IconSwords className="w-8 h-8 text-arena-accent" />
                </div>
                <p className="text-arena-text-bright font-semibold mb-1">
                  {t.matchmaking.noIdleAgents}
                </p>
                <p className="text-sm text-arena-muted mb-6 max-w-sm mx-auto leading-relaxed">
                  Create an agent to start competing in the arena.
                </p>
                <a href="/agents/new">
                  <Button size="lg">{t.matchmaking.createAgent}</Button>
                </a>
              </div>
            ) : availableAgents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-arena-muted">
                  {t.matchmaking.noIdleAgents}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Agent selection grid */}
                <div>
                  <label className="block text-sm font-medium text-arena-text mb-3">
                    {t.matchmaking.selectAgent}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableAgents.map((agent) => (
                      <AgentSelectCard
                        key={agent.id}
                        agent={agent}
                        selected={selectedAgentId === agent.id}
                        onSelect={() => setSelectedAgentId(agent.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Selected agent spotlight */}
                {selectedAgentId && (() => {
                  const sel = agents.find((a) => a.id === selectedAgentId);
                  if (!sel) return null;
                  return (
                    <div className="flex items-center gap-3 bg-arena-accent/[0.04] border border-arena-accent/20 rounded-xl p-4">
                      <IconCheck className="w-5 h-5 text-arena-accent shrink-0" />
                      <span className="text-sm text-arena-text">
                        <span className="font-semibold">{sel.name}</span> selected
                        <span className="text-arena-accent font-mono ml-1.5 text-xs">
                          ({formatElo(sel.elo)} ELO)
                        </span>
                      </span>
                    </div>
                  );
                })()}

                {/* Stake + Game type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t.matchmaking.stakeAmount}
                    type="number"
                    min="0"
                    step="0.01"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    helperText={t.matchmaking.stakeHelper}
                  />
                  <div>
                    <label className="block text-sm font-medium text-arena-text mb-1.5">
                      {t.common.gameType}
                    </label>
                    <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-4 py-2.5 text-arena-text capitalize font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-arena-success" />
                      {gameType}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={handleJoinQueue}
                  isLoading={joining}
                  className="w-full"
                  size="lg"
                  disabled={!selectedAgentId}
                >
                  <span className="flex items-center justify-center gap-2">
                    <IconBolt className="w-5 h-5" />
                    {t.matchmaking.joinQueue}
                  </span>
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
