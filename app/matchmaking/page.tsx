"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

function MatchmakingContent() {
  const searchParams = useSearchParams();
  const preselectedAgentId = searchParams.get("agentId") || "";

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState(preselectedAgentId);
  const [stakeAmount, setStakeAmount] = useState("1.0");
  const [gameType] = useState("marrakech");
  const [joining, setJoining] = useState(false);

  // Queue state
  const [inQueue, setInQueue] = useState(false);
  const [queuedAgentId, setQueuedAgentId] = useState("");
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueSize, setQueueSize] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  // Poll queue status
  const pollQueueStatus = useCallback(async () => {
    if (!queuedAgentId) return;
    try {
      const status = await api.getQueueStatus(queuedAgentId);
      setQueueStatus(status);
      if (status.status === "matched" || status.status === "cancelled") {
        setInQueue(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // silently handle
    }
  }, [queuedAgentId]);

  useEffect(() => {
    if (inQueue && queuedAgentId) {
      pollRef.current = setInterval(pollQueueStatus, 2000);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }
  }, [inQueue, queuedAgentId, pollQueueStatus]);

  const handleJoinQueue = async () => {
    setError("");
    setJoining(true);

    if (!selectedAgentId) {
      setError("Please select an agent.");
      setJoining(false);
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      setError("Please enter a valid stake amount.");
      setJoining(false);
      return;
    }

    try {
      await api.joinQueue(selectedAgentId, stake, gameType);
      setQueuedAgentId(selectedAgentId);
      setInQueue(true);
      setQueueStatus({ status: "queued" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join queue."
      );
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelQueue(queuedAgentId);
      setInQueue(false);
      setQueuedAgentId("");
      setQueueStatus(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel."
      );
    } finally {
      setCancelling(false);
    }
  };

  const idleAgents = agents.filter((a) => a.status === "idle");

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

        {/* Queue Status (when in queue) */}
        {inQueue && (
          <Card className="mb-6 glow-border">
            <div className="text-center">
              <Spinner size="md" className="mb-4" />
              <CardTitle className="mb-2">In Queue</CardTitle>
              <p className="text-sm text-arena-muted mb-1">
                Agent:{" "}
                <span className="text-arena-text">
                  {agents.find((a) => a.id === queuedAgentId)?.name || queuedAgentId}
                </span>
              </p>
              {queueStatus && (
                <div className="mb-4">
                  <Badge status={queueStatus.status} />
                  {queueStatus.position !== undefined && (
                    <span className="ml-2 text-sm text-arena-muted">
                      Position: {queueStatus.position}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-arena-muted mb-4">
                Waiting for an opponent... Polling every 2 seconds.
              </p>
              <Button
                variant="danger"
                onClick={handleCancel}
                isLoading={cancelling}
              >
                Cancel Queue
              </Button>
            </div>
          </Card>
        )}

        {/* Join Form (when not in queue) */}
        {!inQueue && (
          <Card>
            <CardTitle className="mb-4">Join Queue</CardTitle>

            {idleAgents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-arena-muted mb-4">
                  No idle agents available. Create an agent or wait for your
                  current agents to finish their matches.
                </p>
                <a href="/agents/new">
                  <Button variant="secondary">Create Agent</Button>
                </a>
              </div>
            ) : (
              <div className="space-y-5">
                <Select
                  label="Select Agent"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">Choose an agent...</option>
                  {idleAgents.map((agent) => (
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
        )}
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
