"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";
import type { Agent, QueueStatus } from "@/lib/types";
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

function MatchmakingContent() {
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
        setError(err instanceof Error ? err.message : "Failed to load agents.");
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

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
        const matchedAgentIds: string[] = Array.isArray(data.agents) ? data.agents : [];

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

  // Poll queue status for queued agents (updates badge, position, etc.)
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
          // Redirect if queue status returns a matchId too
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
      setError("Please select an agent.");
      setJoining(false);
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 0) {
      setError("Please enter a valid stake amount.");
      setJoining(false);
      return;
    }

    try {
      await api.joinQueue(selectedAgentId, stake, gameType);
      queuedAgentIdsRef.current.add(selectedAgentId);
      setQueuedAgents((prev) => [
        ...prev,
        { agentId: selectedAgentId, status: { status: "queued" }, cancelling: false },
      ]);
      setSelectedAgentId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join queue."
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
      setQueuedAgents((prev) => prev.filter((qa) => qa.agentId !== agentId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel."
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
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="page-title">Matchmaking</h1>
          <p className="text-arena-muted">
            Select an agent and join the queue to find an opponent.
          </p>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Queue Size Info */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-arena-muted">
                Current Queue ({gameType})
              </div>
              <div className="text-2xl font-bold text-arena-primary">
                {queueSize !== null ? queueSize : "-"}{" "}
                <span className="text-sm text-arena-muted font-normal">
                  agents waiting
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-arena-muted">Game Type</div>
              <div className="text-lg font-medium text-arena-text capitalize">
                {gameType}
              </div>
            </div>
          </div>
        </Card>

        {/* Backend Countdown */}
        {countdownActive && (
          <Card className="mb-6 glow-border">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-arena-border"
                  />
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - countdownSeconds / COUNTDOWN_TOTAL)}`}
                    strokeLinecap="round"
                    className="text-arena-primary transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-arena-primary">{countdownSeconds}</span>
                </div>
              </div>

              <CardTitle className="mb-2">Match Starting Soon</CardTitle>
              <p className="text-sm text-arena-muted mb-1">
                Waiting{" "}
                <span className="text-arena-primary font-medium">{countdownSeconds}s</span>{" "}
                for more agents to join...
              </p>
              <p className="text-xs text-arena-muted mb-4">
                The match will start automatically when the countdown ends.
              </p>

              {countdownAgents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-arena-muted uppercase tracking-wider">
                    Agents Ready ({countdownAgents.length})
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {countdownAgents.map((ca) => (
                      <div
                        key={ca.agentId}
                        className="bg-arena-bg border border-arena-border rounded-lg px-3 py-1.5 text-sm"
                      >
                        <span className="text-arena-text font-medium">
                          {ca.name || ca.agentId.slice(0, 8)}
                        </span>
                        {ca.eloAtStart !== undefined && (
                          <span className="text-arena-muted ml-1.5 text-xs">
                            ({ca.eloAtStart})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Queued Agents Status */}
        {queuedAgents.map((qa) => (
          <Card key={qa.agentId} className="mb-6 glow-border">
            <div className="text-center">
              <Spinner size="md" className="mb-4" />
              <CardTitle className="mb-2">In Queue</CardTitle>
              <p className="text-sm text-arena-muted mb-1">
                Agent:{" "}
                <span className="text-arena-text">
                  {agents.find((a) => a.id === qa.agentId)?.name || qa.agentId}
                </span>
              </p>
              {qa.status && (
                <div className="mb-4">
                  <Badge status={qa.status.status || qa.status.agentStatus || "queued"} />
                  {qa.status.position !== undefined && (
                    <span className="ml-2 text-sm text-arena-muted">
                      Position: {qa.status.position}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-arena-muted mb-4">
                {countdownActive
                  ? "Countdown active — match will start soon!"
                  : "Waiting for an opponent... Polling every 2 seconds."}
              </p>
              <Button
                variant="danger"
                onClick={() => handleCancel(qa.agentId)}
                isLoading={qa.cancelling}
              >
                Cancel Queue
              </Button>
            </div>
          </Card>
        ))}

        {/* Join Form */}
        <Card>
          <CardTitle className="mb-4">Join Queue</CardTitle>

          {availableAgents.length === 0 && queuedAgents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-arena-muted mb-4">
                No idle agents available. Create an agent or wait for your
                current agents to finish their matches.
              </p>
              <a href="/agents/new">
                <Button variant="secondary">Create Agent</Button>
              </a>
            </div>
          ) : availableAgents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-arena-muted">
                All your idle agents are already in queue.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <Select
                label="Select Agent"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">Choose an agent...</option>
                {availableAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} (ELO: {Math.round(agent.elo)})
                  </option>
                ))}
              </Select>

              <Input
                label="Stake Amount"
                type="number"
                min="0"
                step="0.01"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                helperText="Amount to stake on this match"
              />

              <div>
                <label className="block text-sm font-medium text-arena-text mb-1.5">
                  Game Type
                </label>
                <div className="bg-arena-bg border border-arena-border rounded-xl px-4 py-2.5 text-arena-text capitalize">
                  {gameType}
                </div>
              </div>

              <Button
                onClick={handleJoinQueue}
                isLoading={joining}
                className="w-full"
                size="lg"
              >
                Join Queue
              </Button>
            </div>
          )}
        </Card>
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
