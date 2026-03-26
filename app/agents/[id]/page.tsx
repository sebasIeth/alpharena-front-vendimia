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
  formatUsdEquivalent,
  formatEarnings,
  copyToClipboard,
} from "@/lib/utils";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import type { Agent, AgentBalance, Match, Chain } from "@/lib/types";
import { getExplorerTxUrl } from "@/lib/api";

/* ── Chain Badge ── */
function ChainBadge({ chain, size = "sm" }: { chain?: Chain; size?: "sm" | "md" }) {
  if (!chain) return null;
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-medium rounded-full ${sizeClasses} bg-purple-50 text-purple-700 border border-purple-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      Solana
    </span>
  );
}

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

/* ═══════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════ */
function IconChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconEdit({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconBolt({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconChat({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconChevronDown({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function IconSend({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
function IconCoin({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconTrophy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a18.991 18.991 0 01-4.27.492 18.99 18.99 0 01-4.27-.493" />
    </svg>
  );
}
function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function IconWallet({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}
function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}
function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function truncateAddress(addr: string, chars = 6): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ── Avatar ── (shared component) */
import AgentAvatar, { SPRITE_KEYS, getAgentSprite } from "@/components/ui/AgentAvatar";

/* ── Win Rate Ring ── */
function WinRateRing({ rate, size = 120 }: { rate: number; size?: number }) {
  const pct = Math.round(rate * 100);
  const inner = size - 14;
  const color = pct >= 60 ? "#059669" : pct >= 40 ? "#5B4FCF" : "#DC2626";
  return (
    <div className="stat-ring shrink-0" style={{ width: size, height: size, background: `conic-gradient(${color} ${pct * 3.6}deg, #E8E4DF ${pct * 3.6}deg)` }}>
      <div className="stat-ring-inner" style={{ width: inner, height: inner }}>
        <div className="text-center">
          <span className="text-3xl font-extrabold font-mono text-arena-text-bright tabular-nums">{pct}</span>
          <span className="text-xs text-arena-muted ml-0.5">%</span>
        </div>
      </div>
    </div>
  );
}

/* ── W/L/D Bar ── */
function WLDBar({ wins, losses, draws, height = "h-2.5" }: { wins: number; losses: number; draws: number; height?: string }) {
  const total = wins + losses + draws;
  if (total === 0) return <div className={`w-full ${height} rounded-full bg-arena-border-light/50`} />;
  const wPct = (wins / total) * 100;
  const lPct = (losses / total) * 100;
  const dPct = (draws / total) * 100;
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden flex bg-arena-border-light/30`}>
      {wPct > 0 && <div className="h-full bg-arena-success transition-all duration-700" style={{ width: `${wPct}%` }} />}
      {dPct > 0 && <div className="h-full bg-arena-muted-light/60 transition-all duration-700" style={{ width: `${dPct}%` }} />}
      {lPct > 0 && <div className="h-full bg-arena-danger/60 transition-all duration-700" style={{ width: `${lPct}%` }} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */
function AgentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { priceUsd } = useAlphaPrice();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    endpointUrl: "",
    openclawUrl: "",
    openclawToken: "",
    openclawAgentId: "",
    avatarKey: "",
    chess: true,
    poker: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Wallet & balance state
  const [balance, setBalance] = useState<AgentBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawToken, setWithdrawToken] = useState<"ALPHA" | "USDC" | "SOL">("ALPHA");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [copied, setCopied] = useState(false);

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
          const savedAvatar = localStorage.getItem(`agent_avatar_${a.id || agentId}`);
          setEditForm({
            name: a.name,
            endpointUrl: a.endpointUrl || "",
            openclawUrl: a.openclawUrl || "",
            openclawToken: "",
            openclawAgentId: a.openclawAgentId || "",
            avatarKey: savedAvatar || "",
            chess: a.gameTypes.includes("chess"),
            poker: a.gameTypes.includes("poker"),
          });
        } else {
          setError(t.agentDetail.agentNotFound);
        }
        if (statsRes.status === "fulfilled") {
          setRecentMatches(
            (statsRes.value.recentMatches || []).map((m: any) => {
              // Backend format: { matchId, gameType, opponent, outcome, eloChange, finalScore, stakeAmount, endedAt }
              // Frontend expects: Match { id, gameType, status, agents[], winnerId, stakeAmount, createdAt, ... }
              const matchId = m.id || m.matchId || m._id || "";
              const opponent = m.opponent || {};
              const outcome = m.outcome as string | undefined; // "win" | "loss" | "draw"

              // Build agents array from opponent data
              const agents: any[] = [];
              agents.push({
                agentId: agentId,
                agentName: agent?.name || "You",
                userId: "",
                username: "",
                eloAtStart: 0,
                eloChange: m.eloChange ?? undefined,
              });
              if (opponent.agentId) {
                agents.push({
                  agentId: opponent.agentId,
                  agentName: opponent.name || "Opponent",
                  userId: "",
                  username: "",
                  eloAtStart: 0,
                });
              }

              // Determine winnerId from outcome
              let winnerId: string | undefined;
              if (outcome === "win") winnerId = agentId;
              else if (outcome === "loss" && opponent.agentId) winnerId = opponent.agentId;

              return {
                ...m,
                id: matchId,
                gameType: m.gameType || "",
                status: "completed" as const,
                agents,
                winnerId,
                stakeAmount: m.stakeAmount ?? 0,
                pot: m.pot ?? 0,
                moveCount: m.moveCount ?? 0,
                createdAt: m.endedAt || m.createdAt || "",
                updatedAt: m.endedAt || m.updatedAt || "",
              };
            })
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.agentDetail.loadFailed);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [agentId]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const data = await api.getAgentBalance(agentId);
      setBalance(data);
    } catch {
      // silently handle — balance may not be available
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (agent) {
      fetchBalance();
    }
  }, [agent?.id]);

  const walletAddress = balance?.walletAddress || agent?.walletAddress;

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await copyToClipboard(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  const handleWithdraw = async () => {
    if (withdrawLoading) return;
    setWithdrawError("");
    setWithdrawSuccess("");
    const addr = withdrawAddress.trim();
    if (!addr || addr.length < 32) {
      setWithdrawError("Enter a valid Solana address.");
      return;
    }
    const value = Number(withdrawAmount);
    if (isNaN(value) || value <= 0) {
      setWithdrawError("Amount must be greater than 0.");
      return;
    }
    if (withdrawToken === "USDC" && value < 10) {
      setWithdrawError("Minimum USDC withdrawal is 10 USDC.");
      return;
    }
    const balanceMap: Record<string, string> = {
      ALPHA: balance?.alpha || "0",
      USDC: balance?.usdc || "0",
      SOL: (balance as any)?.sol || (balance as any)?.eth || "0",
    };
    const available = parseFloat(balanceMap[withdrawToken]);
    if (value > available) {
      setWithdrawError(`Exceeds available balance (${available} ${withdrawToken}).`);
      return;
    }
    setWithdrawLoading(true);
    try {
      const data = await api.withdrawAgent(agentId, value, addr, withdrawToken);
      const explorerUrl = getExplorerTxUrl(data.txHash, data.chain || agent?.chain || "solana");
      setWithdrawSuccess(`Withdrawn ${value} ${withdrawToken}! Tx: ${data.txHash.slice(0, 10)}...${data.txHash.slice(-6)}|${explorerUrl}`);
      setWithdrawAmount("");
      fetchBalance();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Withdraw failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    const gameTypes: string[] = ["chess"];
    try {
      const updatePayload: Record<string, unknown> = { name: editForm.name.trim(), gameTypes };
      if (agent?.type === "openclaw") {
        if (editForm.openclawUrl.trim()) updatePayload.openclawUrl = editForm.openclawUrl.trim();
        if (editForm.openclawToken.trim()) updatePayload.openclawToken = editForm.openclawToken.trim();
        if (editForm.openclawAgentId.trim()) updatePayload.openclawAgentId = editForm.openclawAgentId.trim();
      } else {
        if (editForm.endpointUrl.trim()) updatePayload.endpointUrl = editForm.endpointUrl.trim();
      }
      if (editForm.avatarKey) {
        localStorage.setItem(`agent_avatar_${agentId}`, editForm.avatarKey);
      } else {
        localStorage.removeItem(`agent_avatar_${agentId}`);
      }
      const data = await api.updateAgent(agentId, updatePayload as any);
      setAgent(data.agent);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t.agentDetail.updateFailed);
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
    setChatMessages((prev) => [...prev, { role: "user", text: msg, timestamp: Date.now() }]);
    setChatInput("");
    setChatSending(true);
    try {
      const data = await api.chatWithAgent(agentId, msg);
      setChatMessages((prev) => [...prev, { role: "agent", text: data.reply, timestamp: Date.now() }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", text: `Error: ${err instanceof Error ? err.message : "Failed"}`, timestamp: Date.now() },
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

  const wins = agent.stats?.wins || 0;
  const losses = agent.stats?.losses || 0;
  const draws = agent.stats?.draws || 0;
  const totalMatches = wins + losses + draws;
  const isLive = agent.status === "in_match";

  return (
    <div className="page-container">

      {/* ═══════ BACK LINK ═══════ */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-arena-muted hover:text-arena-primary transition-colors mb-6 opacity-0 animate-fade-in group"
        style={{ animationFillMode: "both" }}
      >
        <IconChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        {t.agentDetail.backToAgents}
      </Link>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down" style={{ animationFillMode: "both" }}>
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        {/* Orbs */}
        <div className="dash-hero-orb w-56 h-56 bg-arena-primary/10 -top-24 -right-14 animate-pulse-soft" />
        <div className="dash-hero-orb w-36 h-36 bg-arena-accent/8 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />
        <div className="dash-hero-orb w-20 h-20 bg-arena-success/6 top-2 left-1/3 animate-pulse-soft" style={{ animationDelay: "3.5s" }} />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: avatar + info */}
            <div className="flex items-start gap-5">
              <div className="relative">
                <AgentAvatar name={agent.name} agentId={agent.id || agentId} size="w-20 h-20" rounded="rounded-2xl" />
                {isLive && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-arena-success border-2 border-white">
                    <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-60" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright">
                    {agent.name}
                  </h1>
                  <Badge status={agent.status} />
                  <ChainBadge chain={agent.chain} />
                  {walletAddress && (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-arena-bg text-arena-muted border border-arena-border-light rounded truncate max-w-[120px]" title={walletAddress}>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  )}
                  {agent.isHuman && (
                    <span className="px-2 py-0.5 text-xs font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded font-medium">
                      Human
                    </span>
                  )}
                  {isLive && (
                    <span className="flex items-center gap-1.5">
                      <span className="relative w-2 h-2 live-dot">
                        <span className="absolute inset-0 rounded-full bg-arena-success" />
                      </span>
                      <span className="text-[10px] text-arena-success font-mono uppercase tracking-wider">{t.common.live}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {agent.type === "openclaw" && (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 rounded">OpenClaw</span>
                  )}
                  {agent.isHuman && (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Human</span>
                  )}
                  {agent.gameTypes.map((gt) => (
                    <span key={gt} className="px-2 py-0.5 text-[10px] bg-arena-primary/8 text-arena-primary rounded capitalize font-mono">{gt}</span>
                  ))}
                  <span className="text-[11px] text-arena-muted">{formatRelativeTime(agent.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditing(!editing)}
                className="w-10 h-10 rounded-xl bg-white border border-arena-border-light flex items-center justify-center text-arena-muted hover:text-arena-primary hover:border-arena-primary/40 transition-all shadow-arena-sm hover:shadow-arena"
                title={editing ? t.common.cancelEdit : t.common.edit}
              >
                <IconEdit />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-10 h-10 rounded-xl bg-white border border-arena-border-light flex items-center justify-center text-arena-muted hover:text-arena-danger hover:border-arena-danger/40 transition-all shadow-arena-sm hover:shadow-arena"
                title={t.common.delete}
              >
                <IconTrash />
              </button>
              {agent.status === "idle" && (
                <Link href={`/matchmaking?agentId=${agent.id}`}>
                  <Button size="sm">
                    <span className="flex items-center gap-1.5">
                      <IconBolt />
                      {t.agentDetail.joinQueue}
                    </span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ EDIT FORM ═══════ */}
      {editing && (
        <div className="bg-white border border-arena-border-light rounded-2xl p-6 shadow-arena-sm mb-8 animate-fade-down" style={{ animationFillMode: "both" }}>
          <form onSubmit={handleEdit} className="space-y-4">
            <CardTitle>{t.agentDetail.editAgent}</CardTitle>
            {editError && (
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm">{editError}</div>
            )}
            <Input label={t.common.name} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            {agent.type === "openclaw" && (
              <>
                <Input label={t.agentDetail.openclawUrlLabel} placeholder="http://your-vps.com:64936" value={editForm.openclawUrl} onChange={(e) => setEditForm({ ...editForm, openclawUrl: e.target.value })} helperText={t.agentDetail.openclawUrlHelper} />
                <Input label={t.agentDetail.gatewayTokenLabel} type="password" placeholder="Token from ~/.openclaw/openclaw.json" value={editForm.openclawToken} onChange={(e) => setEditForm({ ...editForm, openclawToken: e.target.value })} helperText={t.agentDetail.gatewayTokenHelper} />
                <Input label={t.agentDetail.agentIdLabel} placeholder="main" value={editForm.openclawAgentId} onChange={(e) => setEditForm({ ...editForm, openclawAgentId: e.target.value })} helperText={t.createAgent.agentIdHelper} />
              </>
            )}
            {/* Avatar picker */}
            <div>
              <label className="block text-sm font-medium text-arena-text mb-2">Avatar</label>
              <div className="flex items-center gap-2 flex-wrap">
                {SPRITE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, avatarKey: key })}
                    className={`w-11 h-11 rounded-xl overflow-hidden agent-sprite transition-all ${
                      (editForm.avatarKey === key) || (!editForm.avatarKey && getAgentSprite(agent.name) === `/agents/${key}.webp`)
                        ? "ring-2 ring-arena-primary ring-offset-2 scale-110"
                        : "opacity-50 hover:opacity-80 hover:scale-105"
                    }`}
                    style={{ backgroundImage: `url('/agents/${key}.webp')` }}
                    title={key}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked disabled className="w-4 h-4 accent-arena-primary" />
              <span className="text-sm text-arena-text">Chess</span>
              <span className="text-[10px] text-arena-muted">(only available game)</span>
            </label>
            <div className="flex gap-3">
              <Button type="submit" isLoading={editLoading}>{t.common.save}</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>{t.common.cancel}</Button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">

        {/* Performance overview — 3 cols wide */}
        <div
          className="lg:col-span-3 bg-white border border-arena-border-light rounded-2xl p-6 shadow-arena-sm opacity-0 animate-fade-up"
          style={{ animationDelay: "0.1s", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs text-arena-muted uppercase tracking-widest font-mono flex items-center gap-2">
              <IconTrophy className="w-3.5 h-3.5 text-arena-primary" />
              Performance
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-arena-muted">
              <div className="w-2 h-2 rounded-full bg-arena-success" />
              {wins}W
              <div className="w-2 h-2 rounded-full bg-arena-muted-light/60 ml-1" />
              {draws}D
              <div className="w-2 h-2 rounded-full bg-arena-danger/60 ml-1" />
              {losses}L
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
            {/* Win Rate Ring */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <WinRateRing rate={agent.stats?.winRate || 0} />
              <span className="text-[10px] text-arena-muted font-mono uppercase tracking-wider">{t.common.winRate}</span>
            </div>

            {/* ELO + W/L/D bar */}
            <div className="flex-1 w-full space-y-4">
              {/* ELO */}
              <div>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-4xl font-extrabold font-mono text-arena-primary tabular-nums leading-none">
                    {formatElo(agent.elo)}
                  </span>
                  <span className="text-[10px] text-arena-muted font-mono uppercase tracking-widest mb-1">ELO</span>
                </div>
              </div>

              {/* WLD Bar */}
              <div>
                <WLDBar wins={wins} losses={losses} draws={draws} height="h-3" />
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-success" />
                      <span className="font-mono font-semibold text-arena-text-bright">{wins}</span>
                      <span className="text-arena-muted">{t.common.wins}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-muted-light/60" />
                      <span className="font-mono font-semibold text-arena-text-bright">{draws}</span>
                      <span className="text-arena-muted">{t.common.draws}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-arena-danger/60" />
                      <span className="font-mono font-semibold text-arena-text-bright">{losses}</span>
                      <span className="text-arena-muted">{t.common.losses}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-arena-muted font-mono tabular-nums">
                    {totalMatches} {t.common.matches.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Earnings + WLD breakdown */}
        <div className="lg:col-span-2 space-y-5">
          {/* Earnings */}
          <div
            className="bg-white border border-arena-border-light rounded-2xl p-6 shadow-arena-sm opacity-0 animate-fade-up"
            style={{ animationDelay: "0.15s", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">{t.common.earnings}</h3>
              <div className="w-8 h-8 rounded-xl bg-arena-accent/10 flex items-center justify-center">
                <IconCoin className="w-4 h-4 text-arena-accent" />
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              {(agent.stats?.earningsAlpha || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/tokens/alpha.jpg" alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-arena-accent leading-none">{formatEarnings(agent.stats.earningsAlpha || 0)}</span>
                  <span className="text-[10px] text-arena-muted font-mono">ALPHA</span>
                </div>
              )}
              {(agent.stats?.earningsUsdc || 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <img src="/tokens/usdc.jpg" alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-600 leading-none">{formatEarnings(agent.stats.earningsUsdc || 0)}</span>
                  <span className="text-[10px] text-arena-muted font-mono">USDC</span>
                </div>
              )}
              {!(agent.stats?.earningsAlpha || agent.stats?.earningsUsdc) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-arena-muted leading-none">0</span>
                  <span className="text-[10px] text-arena-muted font-mono">Earnings</span>
                </div>
              )}
            </div>
          </div>

          {/* W/L/D breakdown */}
          <div
            className="bg-white border border-arena-border-light rounded-2xl p-6 shadow-arena-sm opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wide">{t.common.matches}</h3>
              <span className="bg-arena-primary/10 text-arena-primary text-base font-extrabold font-mono tabular-nums px-3 py-1 rounded-full">{totalMatches}</span>
            </div>

            {/* Win rate bar */}
            <div className="w-full h-2 rounded-full bg-arena-bg-darker/60 overflow-hidden mb-4 flex">
              {totalMatches > 0 && (
                <>
                  {wins > 0 && <div className="h-full bg-arena-success transition-all" style={{ width: `${(wins / totalMatches) * 100}%` }} />}
                  {draws > 0 && <div className="h-full bg-arena-muted-light/40 transition-all" style={{ width: `${(draws / totalMatches) * 100}%` }} />}
                  {losses > 0 && <div className="h-full bg-arena-danger/60 transition-all" style={{ width: `${(losses / totalMatches) * 100}%` }} />}
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 bg-arena-success/5 rounded-lg px-3 py-2.5">
                <div className="w-2 h-2 rounded-full bg-arena-success flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg font-extrabold font-mono tabular-nums text-arena-success leading-none">{wins}</div>
                  <div className="text-[9px] text-arena-muted uppercase tracking-widest font-mono mt-1">{t.common.wins}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-arena-muted-light/5 rounded-lg px-3 py-2.5">
                <div className="w-2 h-2 rounded-full bg-arena-muted-light/50 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg font-extrabold font-mono tabular-nums text-arena-muted leading-none">{draws}</div>
                  <div className="text-[9px] text-arena-muted uppercase tracking-widest font-mono mt-1">{t.common.draws}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-arena-danger/5 rounded-lg px-3 py-2.5">
                <div className="w-2 h-2 rounded-full bg-arena-danger/60 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg font-extrabold font-mono tabular-nums text-arena-danger/70 leading-none">{losses}</div>
                  <div className="text-[9px] text-arena-muted uppercase tracking-widest font-mono mt-1">{t.common.losses}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          WALLET & BALANCE
          ═══════════════════════════════════════════════════ */}
      <div
        className="dash-glass-card rounded-2xl p-6 mb-8 opacity-0 animate-fade-up"
        style={{ animationDelay: "0.25s", animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
              <IconWallet className="w-5 h-5 text-arena-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">
                Wallet & Balance
              </h3>
              <ChainBadge chain={balance?.chain || agent?.chain} size="md" />
            </div>
          </div>
          <button
            onClick={fetchBalance}
            disabled={balanceLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold rounded-lg bg-arena-bg border border-arena-border-light text-arena-muted hover:text-arena-text hover:border-arena-primary/30 transition-all"
          >
            <svg className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {balanceLoading ? "..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Balance + Address */}
          <div className="space-y-4">
            {/* Balances */}
            <div className="space-y-2.5">
              {/* ALPHA */}
              <div className="flex items-center gap-3 bg-arena-primary/5 border border-arena-primary/10 rounded-xl px-3.5 py-2.5">
                <img src="/tokens/alpha.jpg" alt="ALPHA" className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">ALPHA</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold font-mono tabular-nums text-arena-primary">
                      {balanceLoading ? "..." : Number(balance?.alpha || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                    {!balanceLoading && balance?.alpha && (() => { const usd = formatUsdEquivalent(parseFloat(balance.alpha) || 0, priceUsd); return usd ? <span className="text-xs text-arena-muted">({usd})</span> : null; })()}
                  </div>
                </div>
              </div>
              {/* USDC */}
              <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
                <img src="/tokens/usdc.jpg" alt="USDC" className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">USDC</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-600">
                      {balanceLoading ? "..." : Number(balance?.usdc || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {!balanceLoading && <span className="text-xs text-arena-muted">(~${Number(balance?.usdc || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</span>}
                  </div>
                </div>
              </div>
              {/* SOL */}
              <div className="flex items-center gap-3 bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-2.5">
                <img src="/tokens/solana.jpg" alt="SOL" className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">SOL</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold font-mono tabular-nums text-purple-600">
                      {balanceLoading ? "..." : Number(balance?.sol || 0).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deposit address + copy */}
            {walletAddress ? (
              <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">Deposit Address</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-arena-text break-all">{truncateAddress(walletAddress, 10)}</span>
                  <button
                    onClick={handleCopyAddress}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-md bg-arena-primary/10 text-arena-primary hover:bg-arena-primary/20 transition-colors"
                  >
                    {copied ? (
                      <><IconCheck className="w-3 h-3" /> Copied</>
                    ) : (
                      <><IconCopy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2.5">
                <span className="text-xs text-arena-muted font-mono">
                  {balanceLoading ? "Loading wallet..." : "Wallet address unavailable"}
                </span>
              </div>
            )}
          </div>

          {/* Right: Withdraw */}
          <div className="space-y-3">
            <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">Withdraw</div>

            {/* Token selector */}
            <div className="flex gap-1.5">
              {(["ALPHA", "USDC", "SOL"] as const).map((token) => {
                const isActive = withdrawToken === token;
                const icons: Record<string, string> = { ALPHA: "/tokens/alpha.jpg", USDC: "/tokens/usdc.jpg", SOL: "/tokens/solana.jpg" };
                return (
                  <button
                    key={token}
                    onClick={() => { setWithdrawToken(token); setWithdrawError(""); setWithdrawSuccess(""); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      isActive
                        ? "bg-arena-primary/10 text-arena-primary border-arena-primary/30 ring-1 ring-arena-primary/20"
                        : "bg-white text-arena-muted border-arena-border-light hover:border-arena-primary/20"
                    }`}
                  >
                    <img src={icons[token]} alt={token} className="w-4 h-4 rounded-full" />
                    {token}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => { setWithdrawAddress(e.target.value); setWithdrawError(""); setWithdrawSuccess(""); }}
              placeholder="Destination Solana address"
              className="w-full px-3 py-2 bg-white border border-arena-border-light rounded-lg text-arena-text text-sm font-mono placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all"
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(""); setWithdrawSuccess(""); }}
                  placeholder="Amount"
                  className="w-full px-3 py-2 pr-16 bg-white border border-arena-border-light rounded-lg text-arena-text text-sm font-mono placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-arena-muted font-mono">{withdrawToken}</span>
              </div>
              <Button
                size="sm"
                onClick={handleWithdraw}
                disabled={withdrawLoading || !withdrawAmount || !withdrawAddress}
                isLoading={withdrawLoading}
              >
                <span className="flex items-center gap-1.5">
                  <IconSend className="w-3.5 h-3.5" />
                  Send
                </span>
              </Button>
            </div>
            {withdrawError && <p className="text-xs text-arena-danger mt-1">{withdrawError}</p>}
            {withdrawSuccess && (
              <p className="text-xs text-arena-success mt-1">
                {withdrawSuccess.includes("|") ? (
                  <>
                    {withdrawSuccess.split("|")[0]}{" "}
                    <a href={withdrawSuccess.split("|")[1]} target="_blank" rel="noopener noreferrer" className="underline hover:text-arena-success/80">
                      {t.common.viewOnExplorer}
                    </a>
                  </>
                ) : withdrawSuccess}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          CHAT (OpenClaw)
          ═══════════════════════════════════════════════════ */}
      {agent.type === "openclaw" && (
        <div
          className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm mb-8 overflow-hidden opacity-0 animate-fade-up"
          style={{ animationDelay: "0.25s", animationFillMode: "both" }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-arena-card-hover transition-colors"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-arena-primary/10 flex items-center justify-center">
                <IconChat className="w-4.5 h-4.5 text-arena-primary" />
              </div>
              <div>
                <CardTitle>{t.agentDetail.chatWithAgent}</CardTitle>
                <p className="text-[10px] text-arena-muted mt-0.5">Send messages to your agent</p>
              </div>
            </div>
            <IconChevronDown className={`w-5 h-5 text-arena-muted transition-transform duration-200 ${chatOpen ? "rotate-180" : ""}`} />
          </div>

          {chatOpen && (
            <div className="px-6 pb-5 border-t border-arena-border-light/60">
              <div className="h-72 overflow-y-auto bg-arena-bg rounded-xl border border-arena-border-light p-4 my-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-arena-muted">
                    <div className="w-12 h-12 rounded-xl bg-arena-primary/10 flex items-center justify-center mb-3 opacity-50">
                      <IconChat className="w-6 h-6 text-arena-primary" />
                    </div>
                    <p className="text-sm">{t.agentDetail.chatEmpty}</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "agent" && (
                      <AgentAvatar name={agent.name} size="w-7 h-7" textSize="text-[10px]" rounded="rounded-lg" />
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-arena-primary text-white rounded-br-md"
                          : "bg-white border border-arena-border-light text-arena-text rounded-bl-md ml-2"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="flex justify-start">
                    <AgentAvatar name={agent.name} size="w-7 h-7" textSize="text-[10px]" rounded="rounded-lg" />
                    <div className="bg-white border border-arena-border-light px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-arena-muted ml-2">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-muted animate-bounce" style={{ animationDelay: "0s" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-muted animate-bounce" style={{ animationDelay: "0.15s" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-arena-muted animate-bounce" style={{ animationDelay: "0.3s" }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t.agentDetail.chatPlaceholder}
                  disabled={chatSending}
                  className="flex-1 px-4 py-2.5 bg-white border border-arena-border-light rounded-xl text-arena-text placeholder-arena-muted/60 focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200 text-sm"
                />
                <button
                  type="submit"
                  disabled={chatSending || !chatInput.trim()}
                  className="w-10 h-10 rounded-xl bg-arena-primary text-white flex items-center justify-center hover:bg-arena-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-arena-sm"
                >
                  <IconSend />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          RECENT MATCHES (Timeline)
          ═══════════════════════════════════════════════════ */}
      <div className="opacity-0 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-arena-text-bright flex items-center gap-2">
            {t.agentDetail.recentMatches}
            {recentMatches.length > 0 && (
              <span className="bg-arena-primary/10 text-arena-primary text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {recentMatches.length}
              </span>
            )}
          </h2>
        </div>

        {recentMatches.length === 0 ? (
          <div className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm">
            <div className="text-center py-14 px-6">
              <div className="w-14 h-14 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                <IconBolt className="w-7 h-7 text-arena-primary" />
              </div>
              <p className="text-arena-text-bright font-semibold mb-1">{t.agentDetail.noMatches}</p>
              <p className="text-sm text-arena-muted mb-5">
                {agent.status === "idle" ? "Join a match to start competing." : ""}
              </p>
              {agent.status === "idle" && (
                <Link href={`/matchmaking?agentId=${agent.id}`}>
                  <Button variant="secondary" size="sm">
                    <span className="flex items-center gap-1.5">
                      <IconBolt className="w-3.5 h-3.5" />
                      {t.agentDetail.joinQueue}
                    </span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {recentMatches.map((match, i) => {
              const agentsArr = normalizeMatchAgents(match.agents);
              const agentEntry = agentsArr.find((a) => a.agentId === agentId);
              const isWinner = match.winnerId === agentId;
              const isLoss = match.status === "completed" && match.winnerId && match.winnerId !== agentId;
              const isLast = i === recentMatches.length - 1;
              const isActive = match.status === "active";

              const dotColor = isActive
                ? "bg-arena-success"
                : isWinner ? "bg-arena-success" : isLoss ? "bg-arena-danger/70" : "bg-arena-border-light";

              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div
                    className="flex gap-4 group opacity-0 animate-fade-up"
                    style={{ animationDelay: `${0.35 + i * 0.06}s`, animationFillMode: "both" }}
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center pt-5 shrink-0">
                      <div className={`timeline-dot ${dotColor}`}>
                        {isActive && (
                          <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-40" />
                        )}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 min-h-[20px] bg-arena-border-light/60" />
                      )}
                    </div>

                    {/* Card */}
                    <div className="bg-white border border-arena-border-light rounded-xl p-4 shadow-arena-sm flex-1 mb-3 transition-all duration-200 group-hover:shadow-arena group-hover:border-arena-primary/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge status={match.status} />
                          {match.status === "completed" && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isWinner
                                ? "bg-arena-success/12 text-arena-success"
                                : isLoss
                                ? "bg-arena-danger/12 text-arena-danger"
                                : "bg-arena-muted-light/15 text-arena-muted"
                            }`}>
                              {isWinner ? t.common.won : isLoss ? t.common.lost : t.common.draws}
                            </span>
                          )}
                          <span className="text-sm font-medium text-arena-text-bright">
                            {agentsArr.map((a) => a.agentName).join(" vs ") || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-arena-muted">
                          <span className="capitalize font-mono">{match.gameType}</span>
                          {agentEntry?.eloChange !== undefined && agentEntry.eloChange !== null && (
                            <span className={`font-mono font-semibold ${
                              agentEntry.eloChange > 0 ? "text-arena-success"
                              : agentEntry.eloChange < 0 ? "text-arena-danger"
                              : "text-arena-muted"
                            }`}>
                              {agentEntry.eloChange > 0 ? "+" : ""}{agentEntry.eloChange} ELO
                            </span>
                          )}
                          <span className="font-mono">{match.stakeAmount} ALPHA</span>
                          <span>{formatRelativeTime(match.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ DELETE MODAL ═══════ */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t.agentDetail.deleteTitle}>
        <div className="space-y-4">
          <p className="text-sm text-arena-muted">
            {t.agentDetail.deleteConfirm} <strong className="text-arena-text-bright">{agent.name}</strong>? {t.agentDetail.deleteWarning}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>{t.common.cancel}</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading}>{t.agentDetail.deleteAgent}</Button>
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
