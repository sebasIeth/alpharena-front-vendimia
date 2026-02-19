"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatElo, formatWinRate, formatDate, formatRelativeTime } from "@/lib/utils";
import type { Agent, Match } from "@/lib/types";

function AgentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    endpointUrl: "",
    openclawUrl: "",
    openclawToken: "",
    openclawAgentId: "",
    marrakech: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentRes, statsRes] = await Promise.allSettled([
          api.getAgent(agentId),
          api.getAgentStats(agentId),
        ]);

        if (agentRes.status === "fulfilled") {
          const a = agentRes.value.agent;
          setAgent(a);
          setEditForm({
            name: a.name,
            endpointUrl: a.endpointUrl || "",
            openclawUrl: a.openclawUrl || "",
            openclawToken: "",
            openclawAgentId: a.openclawAgentId || "",
            marrakech: a.gameTypes.includes("marrakech"),
          });
        } else {
          setError("Agent not found.");
        }

        if (statsRes.status === "fulfilled") {
          setRecentMatches(statsRes.value.recentMatches || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [agentId]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);

    const gameTypes: string[] = [];
    if (editForm.marrakech) gameTypes.push("marrakech");

    try {
      const updatePayload: Record<string, unknown> = {
        name: editForm.name.trim(),
        gameTypes,
      };
      if (agent?.type === "openclaw") {
        if (editForm.openclawUrl.trim()) updatePayload.openclawUrl = editForm.openclawUrl.trim();
        if (editForm.openclawToken.trim()) updatePayload.openclawToken = editForm.openclawToken.trim();
        if (editForm.openclawAgentId.trim()) updatePayload.openclawAgentId = editForm.openclawAgentId.trim();
      } else {
        if (editForm.endpointUrl.trim()) updatePayload.endpointUrl = editForm.endpointUrl.trim();
      }
      const data = await api.updateAgent(agentId, updatePayload as any);
      setAgent(data.agent);
      setEditing(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update agent."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteAgent(agentId);
      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent.");
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <PageSpinner />;

  if (error && !agent) {
    return (
      <div className="page-container">
        <Card>
          <div className="text-center py-8">
            <p className="text-arena-accent mb-4">{error}</p>
            <Link href="/agents">
              <Button variant="secondary">Back to Agents</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!agent) return null;

  const totalMatches =
    (agent.stats?.wins || 0) +
    (agent.stats?.losses || 0) +
    (agent.stats?.draws || 0);

  return (
    <div className="page-container">
      {/* Back Link */}
      <Link
        href="/agents"
        className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-6 inline-block"
      >
        &larr; Back to Agents
      </Link>

      {error && (
        <div className="bg-arena-accent/10 border border-arena-accent/30 text-arena-accent rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Agent Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-arena-text">{agent.name}</h1>
            <Badge status={agent.status} />
          </div>
          <p className="text-sm text-arena-muted font-mono">
            {agent.type === "openclaw"
              ? agent.openclawUrl
              : agent.endpointUrl}
          </p>
          {agent.type === "openclaw" && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded">
              OpenClaw
            </span>
          )}
          <div className="flex items-center gap-2 mt-2">
            {agent.gameTypes.map((gt) => (
              <span
                key={gt}
                className="px-2 py-0.5 text-xs bg-arena-primary/10 text-arena-primary rounded capitalize"
              >
                {gt}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel Edit" : "Edit"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
          {agent.status === "idle" && (
            <Link href={`/matchmaking?agentId=${agent.id}`}>
              <Button size="sm">Join Queue</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="mb-8">
          <form onSubmit={handleEdit} className="space-y-4">
            <CardTitle>Edit Agent</CardTitle>
            {editError && (
              <div className="bg-arena-accent/10 border border-arena-accent/30 text-arena-accent rounded-lg px-4 py-3 text-sm">
                {editError}
              </div>
            )}
            <Input
              label="Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
            {agent.type === "openclaw" ? (
              <>
                <Input
                  label="OpenClaw URL"
                  value={editForm.openclawUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawUrl: e.target.value })
                  }
                />
                <Input
                  label="Gateway Token (leave empty to keep current)"
                  type="password"
                  value={editForm.openclawToken}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawToken: e.target.value })
                  }
                />
                <Input
                  label="Agent ID"
                  value={editForm.openclawAgentId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawAgentId: e.target.value })
                  }
                />
              </>
            ) : (
              <Input
                label="Endpoint URL"
                value={editForm.endpointUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, endpointUrl: e.target.value })
                }
              />
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.marrakech}
                onChange={(e) =>
                  setEditForm({ ...editForm, marrakech: e.target.checked })
                }
                className="w-4 h-4 accent-arena-primary"
              />
              <span className="text-sm text-arena-text">Marrakech</span>
            </label>
            <div className="flex gap-3">
              <Button type="submit" isLoading={editLoading}>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <div className="text-xs text-arena-muted mb-1">ELO Rating</div>
          <div className="text-xl font-bold text-arena-primary">
            {formatElo(agent.elo)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">Win Rate</div>
          <div className="text-xl font-bold text-arena-text">
            {formatWinRate(agent.stats?.winRate || 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">Wins</div>
          <div className="text-xl font-bold text-arena-success">
            {agent.stats?.wins || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">Losses</div>
          <div className="text-xl font-bold text-arena-accent">
            {agent.stats?.losses || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">Draws</div>
          <div className="text-xl font-bold text-arena-muted">
            {agent.stats?.draws || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">Earnings</div>
          <div className="text-xl font-bold text-arena-primary">
            {(agent.stats?.totalEarnings || 0).toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Recent Matches */}
      <div>
        <CardTitle className="mb-4">Recent Matches</CardTitle>
        {recentMatches.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-arena-muted">
              No matches found for this agent.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => {
              const agentEntry = match.agents.find(
                (a) => a.agentId === agentId
              );
              const isWinner = match.winnerId === agentId;
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <Card hover className="mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Badge status={match.status} />
                        {match.status === "completed" && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              isWinner
                                ? "bg-arena-success/20 text-arena-success"
                                : "bg-arena-accent/20 text-arena-accent"
                            }`}
                          >
                            {isWinner ? "WON" : "LOST"}
                          </span>
                        )}
                        <span className="text-sm text-arena-text">
                          {match.agents
                            .map((a) => a.agentName)
                            .join(" vs ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-arena-muted">
                        {agentEntry?.eloChange !== undefined &&
                          agentEntry.eloChange !== null && (
                            <span
                              className={
                                agentEntry.eloChange > 0
                                  ? "text-arena-success"
                                  : agentEntry.eloChange < 0
                                  ? "text-arena-accent"
                                  : "text-arena-muted"
                              }
                            >
                              {agentEntry.eloChange > 0 ? "+" : ""}
                              {agentEntry.eloChange} ELO
                            </span>
                          )}
                        <span>Stake: {match.stakeAmount}</span>
                        <span>{formatRelativeTime(match.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Agent"
      >
        <div className="space-y-4">
          <p className="text-sm text-arena-muted">
            Are you sure you want to delete <strong className="text-arena-text">{agent.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteLoading}
            >
              Delete Agent
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <AuthGuard>
      <AgentDetailContent />
    </AuthGuard>
  );
}
