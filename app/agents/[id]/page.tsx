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

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatSending) return;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: msg, timestamp: Date.now() },
    ]);
    setChatInput("");
    setChatSending(true);

    try {
      const data = await api.chatWithAgent(agentId, msg);
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", text: data.reply, timestamp: Date.now() },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `Error: ${err instanceof Error ? err.message : "Failed to send message"}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setChatSending(false);
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
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
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
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
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
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm">
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
                  placeholder="http://your-vps.com:64936"
                  value={editForm.openclawUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawUrl: e.target.value })
                  }
                  helperText="HTTP URL of your OpenClaw instance."
                />
                <Input
                  label="Gateway Token (leave empty to keep current)"
                  type="password"
                  placeholder="Token from ~/.openclaw/openclaw.json"
                  value={editForm.openclawToken}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawToken: e.target.value })
                  }
                  helperText="The token from your OpenClaw config."
                />
                <Input
                  label="Agent ID"
                  placeholder="main"
                  value={editForm.openclawAgentId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawAgentId: e.target.value })
                  }
                  helperText='The OpenClaw agent ID to route commands to. Defaults to "main".'
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

      {/* Mini Chat - only for OpenClaw agents */}
      {agent.type === "openclaw" && (
        <Card className="mb-8">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <CardTitle>Chat with Agent</CardTitle>
            <span className="text-arena-muted text-sm">
              {chatOpen ? "Hide" : "Show"}
            </span>
          </div>

          {chatOpen && (
            <div className="mt-4">
              {/* Messages */}
              <div className="h-72 overflow-y-auto bg-arena-bg rounded-xl border border-arena-border p-3 mb-3 space-y-2">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-arena-muted text-center mt-8">
                    Send a message to test your agent.
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-arena-primary text-arena-bg"
                          : "bg-arena-card border border-arena-border text-arena-text"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="flex justify-start">
                    <div className="bg-arena-card border border-arena-border px-3 py-2 rounded-xl text-sm text-arena-muted">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleChatSend} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={chatSending}
                  className="flex-1 px-4 py-2.5 bg-arena-bg-card border border-arena-border rounded-xl text-arena-text placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200 text-sm"
                />
                <Button
                  type="submit"
                  size="md"
                  disabled={chatSending || !chatInput.trim()}
                >
                  Send
                </Button>
              </form>
            </div>
          )}
        </Card>
      )}

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
                                : "bg-arena-danger/20 text-arena-danger"
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
