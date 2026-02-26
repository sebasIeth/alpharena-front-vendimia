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
import {
  formatElo,
  formatWinRate,
  formatRelativeTime,
  normalizeMatchAgents,
} from "@/lib/utils";
import type { Agent, Match } from "@/lib/types";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

/* ── Win Rate Ring (conic-gradient) ── */
function WinRateRing({ rate, size = 88 }: { rate: number; size?: number }) {
  const pct = Math.round(rate * 100);
  const inner = size - 12;
  return (
    <div
      className="stat-ring"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(
          #5B4FCF ${pct * 3.6}deg,
          #E8E4DF ${pct * 3.6}deg
        )`,
      }}
    >
      <div
        className="stat-ring-inner"
        style={{ width: inner, height: inner }}
      >
        <span className="text-lg font-bold font-mono text-arena-text tabular-nums">
          {pct}%
        </span>
      </div>
    </div>
  );
}

/* ── W/L/D Stacked Bar ── */
function WLDStackedBar({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  const total = wins + losses + draws;
  if (total === 0) {
    return (
      <div className="space-y-2">
        <div className="w-full h-2.5 rounded-full bg-arena-border-light/50" />
        <div className="text-xs text-arena-muted text-center">No matches yet</div>
      </div>
    );
  }
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;

  return (
    <div className="space-y-3">
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-arena-border-light/30">
        {wPct > 0 && (
          <div
            className="h-full bg-arena-success rounded-l-full transition-all duration-700"
            style={{ width: `${wPct}%` }}
          />
        )}
        {dPct > 0 && (
          <div
            className="h-full bg-arena-muted-light/60 transition-all duration-700"
            style={{ width: `${dPct}%` }}
          />
        )}
        {lPct > 0 && (
          <div
            className="h-full bg-arena-danger/60 rounded-r-full transition-all duration-700"
            style={{ width: `${lPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-arena-success" />
          <span className="text-arena-text font-medium">{wins}</span>
          <span className="text-arena-muted">W</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-arena-muted-light/60" />
          <span className="text-arena-text font-medium">{draws}</span>
          <span className="text-arena-muted">D</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-arena-danger/60" />
          <span className="text-arena-text font-medium">{losses}</span>
          <span className="text-arena-muted">L</span>
        </div>
      </div>
    </div>
  );
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

  // Auto-play state
  const [autoPlayToggling, setAutoPlayToggling] = useState(false);
  const [stakeInput, setStakeInput] = useState("");
  const [stakeLoading, setStakeLoading] = useState(false);
  const [stakeError, setStakeError] = useState("");

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
          setStakeInput(String(a.autoPlayStakeAmount || 0));
        } else {
          setError(t.agentDetail.agentNotFound);
        }

        if (statsRes.status === "fulfilled") {
          setRecentMatches(
            (statsRes.value.recentMatches || []).map((m) => ({
              ...m,
              id: m.id || (m as any)._id,
            }))
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t.agentDetail.loadFailed
        );
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
        if (editForm.openclawUrl.trim())
          updatePayload.openclawUrl = editForm.openclawUrl.trim();
        if (editForm.openclawToken.trim())
          updatePayload.openclawToken = editForm.openclawToken.trim();
        if (editForm.openclawAgentId.trim())
          updatePayload.openclawAgentId = editForm.openclawAgentId.trim();
      } else {
        if (editForm.endpointUrl.trim())
          updatePayload.endpointUrl = editForm.endpointUrl.trim();
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
      setError(
        err instanceof Error ? err.message : t.agentDetail.deleteFailed
      );
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAutoPlayToggle = async () => {
    if (!agent || autoPlayToggling) return;
    setAutoPlayToggling(true);
    try {
      const data = await api.updateAgent(agentId, { autoPlay: !agent.autoPlay });
      setAgent(data.agent);
      setStakeInput(String(data.agent.autoPlayStakeAmount || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle auto-play.");
    } finally {
      setAutoPlayToggling(false);
    }
  };

  const handleStakeSet = async () => {
    if (!agent || stakeLoading) return;
    setStakeError("");
    const value = Number(stakeInput);
    if (isNaN(value) || value < 0 || value > 10000) {
      setStakeError("Stake must be between 0 and 10,000.");
      return;
    }
    setStakeLoading(true);
    try {
      const data = await api.updateAgent(agentId, { autoPlayStakeAmount: value });
      setAgent(data.agent);
    } catch (err) {
      setStakeError(err instanceof Error ? err.message : "Failed to set stake.");
    } finally {
      setStakeLoading(false);
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
              <Button variant="secondary">
                {t.agentDetail.backToAgents}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!agent) return null;

  const wins = agent.stats?.wins || 0;
  const losses = agent.stats?.losses || 0;
  const draws = agent.stats?.draws || 0;
  const totalMatches = wins + losses + draws;

  return (
    <div className="page-container">
      {/* Back Link */}
      <Link
        href="/agents"
        className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-6 inline-block opacity-0 animate-fade-in"
      >
        {t.agentDetail.backToAgents}
      </Link>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
          {error}
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text">
                {agent.name}
              </h1>
              <Badge status={agent.status} />
              {agent.autoPlay && (
                <span className="px-2 py-0.5 text-xs font-mono bg-arena-primary/10 text-arena-primary border border-arena-primary/20 rounded font-medium">
                  Auto-Play
                </span>
              )}
            </div>

            <p className="text-sm text-arena-muted font-mono mb-3 break-all">
              {agent.type === "openclaw"
                ? agent.openclawUrl
                : agent.endpointUrl}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {agent.type === "openclaw" && (
                <span className="px-2 py-0.5 text-xs font-mono bg-purple-50 text-purple-600 border border-purple-200 rounded">
                  OpenClaw
                </span>
              )}
              {agent.gameTypes.map((gt) => (
                <span
                  key={gt}
                  className="px-2 py-0.5 text-xs bg-arena-primary/8 text-arena-primary rounded capitalize font-mono"
                >
                  {gt}
                </span>
              ))}
              <span className="text-xs text-arena-muted">
                {formatRelativeTime(agent.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="mb-8 animate-fade-down">
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
                    setEditForm({
                      ...editForm,
                      openclawUrl: e.target.value,
                    })
                  }
                  helperText={t.agentDetail.openclawUrlHelper}
                />
                <Input
                  label={t.agentDetail.gatewayTokenLabel}
                  type="password"
                  placeholder="Token from ~/.openclaw/openclaw.json"
                  value={editForm.openclawToken}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      openclawToken: e.target.value,
                    })
                  }
                  helperText={t.agentDetail.gatewayTokenHelper}
                />
                <Input
                  label={t.agentDetail.agentIdLabel}
                  placeholder="main"
                  value={editForm.openclawAgentId}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      openclawAgentId: e.target.value,
                    })
                  }
                  helperText={t.createAgent.agentIdHelper}
                />
              </>
            ) : (
              <Input
                label={t.createAgent.endpointUrl}
                value={editForm.endpointUrl}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    endpointUrl: e.target.value,
                  })
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
              <span className="text-sm text-arena-text">
                {t.createAgent.marrakech}
              </span>
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

      {/* ── Stats Section ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* ELO Card */}
        <div
          className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-xs text-arena-muted uppercase tracking-wider font-mono mb-3">
            {t.common.eloRating}
          </div>
          <div className="text-4xl font-bold font-mono text-arena-primary tabular-nums animate-glow-pulse inline-block">
            {formatElo(agent.elo)}
          </div>
        </div>

        {/* Win Rate Ring Card */}
        <div
          className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="text-xs text-arena-muted uppercase tracking-wider font-mono mb-3">
            {t.common.winRate}
          </div>
          <div className="flex items-center justify-center">
            <WinRateRing rate={agent.stats?.winRate || 0} />
          </div>
        </div>

        {/* W/L/D Card */}
        <div
          className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="text-xs text-arena-muted uppercase tracking-wider font-mono mb-3">
            {t.common.matches} ({totalMatches})
          </div>
          <WLDStackedBar wins={wins} losses={losses} draws={draws} />
        </div>

        {/* Earnings Card */}
        <div
          className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="text-xs text-arena-muted uppercase tracking-wider font-mono mb-3">
            {t.common.earnings}
          </div>
          <div className="text-4xl font-bold font-mono tabular-nums text-arena-text">
            {(agent.stats?.totalEarnings || 0).toFixed(2)}
          </div>
          <div className="text-xs text-arena-muted mt-1 font-mono tracking-wider">
            ALPH
          </div>
        </div>
      </div>

      {/* ── Auto-Play ── */}
      <div
        className="bg-white border border-arena-border-light rounded-xl p-5 shadow-arena-sm mb-8 opacity-0 animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      >
        <CardTitle className="mb-4">Auto-Play</CardTitle>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Toggle */}
          <button
            onClick={handleAutoPlayToggle}
            disabled={autoPlayToggling || agent.status === "disabled" || agent.gameTypes.length === 0}
            className={`px-5 py-2 rounded-full text-sm font-semibold font-mono transition-all ${
              agent.autoPlay
                ? "bg-arena-primary text-white shadow-sm"
                : "bg-arena-bg border border-arena-border-light text-arena-muted"
            } ${
              (autoPlayToggling || agent.status === "disabled" || agent.gameTypes.length === 0)
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            }`}
          >
            {autoPlayToggling ? "..." : agent.autoPlay ? "ON" : "OFF"}
          </button>

          {/* Stake Input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={10000}
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              disabled={!agent.autoPlay}
              placeholder="Stake amount"
              className="w-32 px-3 py-2 bg-white border border-arena-border-light rounded-lg text-arena-text text-sm font-mono placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all disabled:opacity-50"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleStakeSet}
              disabled={!agent.autoPlay || stakeLoading}
              isLoading={stakeLoading}
            >
              Set
            </Button>
          </div>
        </div>

        {stakeError && (
          <p className="text-sm text-arena-danger mt-2">{stakeError}</p>
        )}

        {/* Error counter */}
        {agent.autoPlayConsecutiveErrors > 0 && (
          <div className="mt-4">
            {agent.autoPlayConsecutiveErrors >= 3 ? (
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-lg px-3 py-2 text-sm">
                Auto-play was disabled due to 3 consecutive errors.
              </div>
            ) : (
              <p className="text-sm text-amber-500">
                Consecutive errors: {agent.autoPlayConsecutiveErrors}/3
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Mini Chat (OpenClaw only) ── */}
      {agent.type === "openclaw" && (
        <div
          className="bg-white border border-arena-border-light rounded-xl shadow-arena-sm mb-8 overflow-hidden opacity-0 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-arena-card-hover transition-colors"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <CardTitle>{t.agentDetail.chatWithAgent}</CardTitle>
            <span className="text-arena-muted text-sm">
              {chatOpen ? t.agentDetail.hide : t.agentDetail.show}
            </span>
          </div>

          {chatOpen && (
            <div className="px-6 pb-5 border-t border-arena-border-light/60">
              {/* Messages */}
              <div className="h-72 overflow-y-auto bg-arena-bg rounded-xl border border-arena-border-light p-3 my-4 space-y-2">
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
                          ? "bg-arena-primary text-white"
                          : "bg-white border border-arena-border-light text-arena-text"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-arena-border-light px-3 py-2 rounded-xl text-sm text-arena-muted">
                      <span className="animate-pulse">
                        {t.agentDetail.chatThinking}
                      </span>
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
                  className="flex-1 px-4 py-2.5 bg-white border border-arena-border-light rounded-lg text-arena-text placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200 text-sm"
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
        </div>
      )}

      {/* ── Recent Matches ── */}
      <div
        className="opacity-0 animate-fade-up"
        style={{ animationDelay: "0.35s" }}
      >
        <CardTitle className="mb-4">{t.agentDetail.recentMatches}</CardTitle>
        {recentMatches.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-arena-muted">
              {t.agentDetail.noMatches}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match, i) => {
              const agentsArr = normalizeMatchAgents(match.agents);
              const agentEntry = agentsArr.find(
                (a) => a.agentId === agentId
              );
              const isWinner = match.winnerId === agentId;
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div
                    className="agent-card mb-3 opacity-0 animate-fade-up"
                    style={{ animationDelay: `${0.4 + i * 0.06}s` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Badge status={match.status} />
                        {match.status === "completed" && (
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isWinner
                                ? "bg-arena-success/15 text-arena-success"
                                : "bg-arena-danger/15 text-arena-danger"
                            }`}
                          >
                            {isWinner ? t.common.won : t.common.lost}
                          </span>
                        )}
                        <span className="text-sm text-arena-text font-medium">
                          {agentsArr
                            .map((a) => a.agentName)
                            .join(" vs ") || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-arena-muted">
                        {agentEntry?.eloChange !== undefined &&
                          agentEntry.eloChange !== null && (
                            <span
                              className={`font-mono font-medium ${
                                agentEntry.eloChange > 0
                                  ? "text-arena-success"
                                  : agentEntry.eloChange < 0
                                  ? "text-arena-danger"
                                  : "text-arena-muted"
                              }`}
                            >
                              {agentEntry.eloChange > 0 ? "+" : ""}
                              {agentEntry.eloChange} {t.common.elo}
                            </span>
                          )}
                        <span className="font-mono">
                          {t.common.stake}: {match.stakeAmount}
                        </span>
                        <span>{formatRelativeTime(match.createdAt)}</span>
                      </div>
                    </div>
                  </div>
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
            {t.agentDetail.deleteConfirm}{" "}
            <strong className="text-arena-text">{agent.name}</strong>?{" "}
            {t.agentDetail.deleteWarning}
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
