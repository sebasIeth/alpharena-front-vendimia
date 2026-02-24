"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatElo, formatWinRate, formatDate, formatRelativeTime, normalizeMatchAgents } from "@/lib/utils";
import type { Agent, Match } from "@/lib/types";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

function AgentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
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
          setError(t.agentDetail.agentNotFound);
        }

        if (statsRes.status === "fulfilled") {
          setRecentMatches((statsRes.value.recentMatches || []).map((m) => ({
            ...m,
            id: m.id || (m as any)._id,
          })));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.agentDetail.loadFailed);
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
        err instanceof Error ? err.message : t.agentDetail.updateFailed
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
      setError(err instanceof Error ? err.message : t.agentDetail.deleteFailed);
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
              <Button variant="secondary">{t.agentDetail.backToAgents}</Button>
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
        {t.agentDetail.backToAgents}
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
            {editing ? t.common.cancelEdit : t.common.edit}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            {t.common.delete}
          </Button>
          {agent.status === "idle" && (
            <Link href={`/matchmaking?agentId=${agent.id}`}>
              <Button size="sm">{t.agentDetail.joinQueue}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="mb-8">
          <form onSubmit={handleEdit} className="space-y-4">
            <CardTitle>{t.agentDetail.editAgent}</CardTitle>
            {editError && (
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm">
                {editError}
              </div>
            )}
            <Input
              label={t.common.name}
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
            {agent.type === "openclaw" ? (
              <>
                <Input
                  label={t.agentDetail.openclawUrlLabel}
                  placeholder="http://your-vps.com:64936"
                  value={editForm.openclawUrl}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawUrl: e.target.value })
                  }
                  helperText={t.agentDetail.openclawUrlHelper}
                />
                <Input
                  label={t.agentDetail.gatewayTokenLabel}
                  type="password"
                  placeholder="Token from ~/.openclaw/openclaw.json"
                  value={editForm.openclawToken}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawToken: e.target.value })
                  }
                  helperText={t.agentDetail.gatewayTokenHelper}
                />
                <Input
                  label={t.agentDetail.agentIdLabel}
                  placeholder="main"
                  value={editForm.openclawAgentId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, openclawAgentId: e.target.value })
                  }
                  helperText={t.createAgent.agentIdHelper}
                />
              </>
            ) : (
              <Input
                label={t.createAgent.endpointUrl}
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
              <span className="text-sm text-arena-text">{t.createAgent.marrakech}</span>
            </label>
            <div className="flex gap-3">
              <Button type="submit" isLoading={editLoading}>
                {t.common.save}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.eloRating}</div>
          <div className="text-xl font-bold text-arena-primary">
            {formatElo(agent.elo)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.winRate}</div>
          <div className="text-xl font-bold text-arena-text">
            {formatWinRate(agent.stats?.winRate || 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.wins}</div>
          <div className="text-xl font-bold text-arena-success">
            {agent.stats?.wins || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.losses}</div>
          <div className="text-xl font-bold text-arena-accent">
            {agent.stats?.losses || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.draws}</div>
          <div className="text-xl font-bold text-arena-muted">
            {agent.stats?.draws || 0}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-arena-muted mb-1">{t.common.earnings}</div>
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
            <CardTitle>{t.agentDetail.chatWithAgent}</CardTitle>
            <span className="text-arena-muted text-sm">
              {chatOpen ? t.agentDetail.hide : t.agentDetail.show}
            </span>
          </div>

          {chatOpen && (
            <div className="mt-4">
              {/* Messages */}
              <div className="h-72 overflow-y-auto bg-arena-bg rounded-xl border border-arena-border p-3 mb-3 space-y-2">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-arena-muted text-center mt-8">
                    {t.agentDetail.chatEmpty}
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
                      <span className="animate-pulse">{t.agentDetail.chatThinking}</span>
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
                  placeholder={t.agentDetail.chatPlaceholder}
                  disabled={chatSending}
                  className="flex-1 px-4 py-2.5 bg-arena-bg-card border border-arena-border rounded-xl text-arena-text placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200 text-sm"
                />
                <Button
                  type="submit"
                  size="md"
                  disabled={chatSending || !chatInput.trim()}
                >
                  {t.common.send}
                </Button>
              </form>
            </div>
          )}
        </Card>
      )}

      {/* Recent Matches */}
      <div>
        <CardTitle className="mb-4">{t.agentDetail.recentMatches}</CardTitle>
        {recentMatches.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-arena-muted">
              {t.agentDetail.noMatches}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => {
              const agentsArr = normalizeMatchAgents(match.agents);
              const agentEntry = agentsArr.find(
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
                            {isWinner ? t.common.won : t.common.lost}
                          </span>
                        )}
                        <span className="text-sm text-arena-text">
                          {agentsArr
                            .map((a) => a.agentName)
                            .join(" vs ") || "Unknown"}
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
                              {agentEntry.eloChange} {t.common.elo}
                            </span>
                          )}
                        <span>{t.common.stake}: {match.stakeAmount}</span>
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
        title={t.agentDetail.deleteTitle}
      >
        <div className="space-y-4">
          <p className="text-sm text-arena-muted">
            {t.agentDetail.deleteConfirm} <strong className="text-arena-text">{agent.name}</strong>?
            {" "}{t.agentDetail.deleteWarning}
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteLoading}
            >
              {t.agentDetail.deleteAgent}
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
