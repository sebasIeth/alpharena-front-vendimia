"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AgentAvatar from "@/components/ui/AgentAvatar";
import { formatRelativeTime, normalizeMatchAgents, formatUsdEquivalent } from "@/lib/utils";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import type { Match, MatchAgent, PokerPlayer, Chain } from "@/lib/types";

type Tab = "all" | "active" | "completed";
type SortKey = "newest" | "oldest" | "highestStake";
type ChainFilter = "all" | Chain;

const PLAYER_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#F97316"];
const PLAYER_GRADIENTS = [
  "from-red-500 to-red-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-pink-500 to-pink-600",
  "from-cyan-500 to-cyan-600",
  "from-orange-500 to-orange-600",
];

/* ── SVG Icons ── */
function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconTrophy({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a18.991 18.991 0 01-4.27.492 18.99 18.99 0 01-4.27-.493" />
    </svg>
  );
}
function IconArrowRight({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function IconCrown({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
      <path d="M5 19a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" />
    </svg>
  );
}
function IconRefresh({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}
function IconSort({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h6m-6 4h10m-10 4h14" />
    </svg>
  );
}

/* ── Skeleton Card ── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="match-card-enhanced p-5 h-full opacity-0 animate-fade-up"
      style={{ animationDelay: `${0.05 + index * 0.04}s`, animationFillMode: "both" }}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="skeleton w-16 h-5" />
        </div>
        <div className="skeleton w-20 h-5" />
      </div>

      {/* VS section skeleton */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {/* Agent A */}
        <div className="flex-1 flex flex-col items-center">
          <div className="skeleton w-11 h-11 !rounded-xl mb-1.5" />
          <div className="skeleton w-20 h-4 mb-1" />
          <div className="skeleton w-12 h-3" />
        </div>
        {/* VS */}
        <div className="shrink-0 pt-3">
          <div className="skeleton w-9 h-9 !rounded-full" />
        </div>
        {/* Agent B */}
        <div className="flex-1 flex flex-col items-center">
          <div className="skeleton w-11 h-11 !rounded-xl mb-1.5" />
          <div className="skeleton w-20 h-4 mb-1" />
          <div className="skeleton w-12 h-3" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="pt-3 border-t border-arena-border-light/60 flex items-center justify-between">
        <div className="skeleton w-32 h-3" />
        <div className="skeleton w-16 h-3" />
      </div>
    </div>
  );
}

/* ── Agent Column in VS Card ── */
function AgentColumn({
  agent,
  color,
  gradient,
  isWinner,
  isDraw,
  chessPiece,
}: {
  agent: MatchAgent;
  color: string;
  gradient: string;
  isWinner: boolean;
  isDraw: boolean;
  chessPiece?: "white" | "black";
}) {
  return (
    <div className="flex-1 flex flex-col items-center min-w-0">
      {/* Avatar with optional crown and chess piece indicator */}
      <div className="relative mb-1.5">
        <AgentAvatar
          name={agent.agentName}
          size="w-11 h-11"
          textSize="text-sm"
          gradient={gradient}
          shadow={`0 3px 10px ${color}35, inset 0 1px 0 rgba(255,255,255,0.25)`}
        />
        {isWinner && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-arena-accent flex items-center justify-center shadow-sm">
            <IconCrown className="w-3 h-3 text-white" />
          </div>
        )}
        {chessPiece && (
          <span
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
              chessPiece === "black"
                ? "bg-gray-800 border-white text-white"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            title={chessPiece === "black" ? "Black" : "White"}
          >
            {chessPiece === "black" ? "\u265F" : "\u2659"}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-sm font-semibold text-arena-text-bright truncate max-w-full leading-tight">
        {agent.agentName}
      </span>

      {/* Username */}
      {agent.username && (
        <span className="text-[10px] text-arena-muted truncate max-w-full leading-tight">
          by {agent.username}
        </span>
      )}

      {/* ELO + change */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px] text-arena-muted font-mono">{agent.eloAtStart}</span>
        {agent.eloChange !== undefined && agent.eloChange !== null && agent.eloChange !== 0 && (
          <span className={`text-[11px] font-semibold font-mono ${
            agent.eloChange > 0 ? "text-arena-success" : "text-arena-danger"
          }`}>
            {agent.eloChange > 0 ? "+" : ""}{agent.eloChange}
          </span>
        )}
        {isDraw && agent.eloChange === 0 && (
          <span className="text-[11px] font-mono text-arena-muted">±0</span>
        )}
      </div>
    </div>
  );
}

/* ── Game Type Icons ── */
function IconPoker({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.24 2 7 4.24 7 7c0 2.85 2.92 7.21 5 9.88 2.11-2.69 5-7 5-9.88 0-2.76-2.24-5-5-5zm0 7.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" opacity=".3"/>
      <path d="M12 2L9 9l3 4 3-4-3-7zM4.5 12.5l5 3-2 5.5-5-3 2-5.5zM19.5 12.5l-5 3 2 5.5 5-3-2-5.5z"/>
    </svg>
  );
}
function IconChess({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 22H5v-2h14v2M17.16 8.26A8.94 8.94 0 0018 5h-3V3h-2v2h-2V3H9v2H6a8.94 8.94 0 00.84 3.26L4.5 12.5l2.09 2.09C7.47 16.05 9.56 17 12 17c2.44 0 4.53-.95 5.41-2.41l2.09-2.09-2.34-4.24z"/>
    </svg>
  );
}
function IconGamepad({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  );
}
function IconStack({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}
function IconUsers({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

const GAME_TYPE_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string; color: string; bg: string }> = {
  poker: { icon: IconPoker, label: "Poker", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  chess: { icon: IconChess, label: "Chess", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
};

/* ── Poker Player Row ── */
function PokerPlayerRow({
  agent,
  idx,
  stack,
  isWinner,
  isEliminated,
  startingStack,
}: {
  agent: MatchAgent;
  idx: number;
  stack?: number;
  isWinner: boolean;
  isEliminated: boolean;
  startingStack: number;
}) {
  const stackPct = stack !== undefined && startingStack > 0 ? Math.min((stack / (startingStack * 2)) * 100, 100) : 0;
  const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
  const gradient = PLAYER_GRADIENTS[idx % PLAYER_GRADIENTS.length];

  return (
    <div
      className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all ${
        isWinner
          ? "bg-arena-accent/8 ring-1 ring-arena-accent/25"
          : isEliminated
          ? "opacity-40"
          : ""
      }`}
    >
      {/* Position + Avatar */}
      <div className="relative shrink-0">
        <AgentAvatar
          name={agent.agentName}
          size="w-7 h-7"
          textSize="text-[10px]"
          gradient={gradient}
          rounded="rounded-lg"
          shadow={`0 2px 6px ${color}20`}
        />
        {isWinner && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-arena-accent flex items-center justify-center">
            <IconCrown className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Name + stack bar */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[11px] font-semibold truncate ${
              isEliminated ? "text-arena-muted line-through" : "text-arena-text-bright"
            }`}>
              {agent.agentName}
            </span>
            {agent.eloAtStart && (
              <span className="text-[9px] font-mono text-arena-muted shrink-0">{agent.eloAtStart}</span>
            )}
          </span>
          {stack !== undefined && (
            <span className={`text-[10px] font-mono font-bold shrink-0 ${
              isEliminated ? "text-arena-danger" : "text-arena-text-bright"
            }`}>
              {isEliminated ? "OUT" : stack.toLocaleString()}
            </span>
          )}
        </div>
        {/* Stack bar */}
        {stack !== undefined && !isEliminated && (
          <div className="w-full h-1 rounded-full bg-arena-border-light/30 mt-0.5 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all`}
              style={{ width: `${stackPct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Match Card ── */
function MatchCard({ match, index, priceUsd, viewers }: { match: Match; index: number; priceUsd: number | null; viewers?: number }) {
  const { t } = useLanguage();
  const raw = match as any;
  const chain: Chain = match.chain || "solana";
  const isPoker = match.gameType === "poker";
  const agents = normalizeMatchAgents(match.agents, isPoker ? raw.pokerPlayers || match.pokerPlayers : undefined);
  const isActive = match.status === "active";
  const isCompleted = match.status === "completed";
  const sideMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  const isDraw = isCompleted && !match.winnerId;
  const winnerAgent = isCompleted && match.winnerId
    ? agents.find((a) => a.agentId === match.winnerId)
      ?? (match.winnerId in sideMap ? agents[sideMap[match.winnerId]] : null)
    : null;
  const pot = match.pot ?? (match as any).potAmount ?? 0;
  const pokerScores: Record<string, number> | undefined = raw.pokerScores || match.pokerScores;
  const pokerState = raw.pokerState;
  const startingStack = pokerState?.startingStack ?? 2000;
  const handNumber = pokerState?.handNumber;
  const playersAlive = isPoker ? agents.filter((a) => {
    const s = pokerScores?.[a.agentId];
    return s === undefined || s > 0;
  }).length : 0;

  const gameConfig = GAME_TYPE_CONFIG[match.gameType] || {
    icon: IconGamepad,
    label: match.gameType,
    color: "text-arena-primary",
    bg: "bg-arena-primary/5 border-arena-border-light",
  };
  const GameIcon = gameConfig.icon;

  return (
    <Link href={`/matches/${match.id}`}>
      <div
        className={`group match-card-enhanced match-card-enhanced--${match.status} p-5 h-full opacity-0 animate-fade-up ${
          isActive ? "live-card-border" : ""
        }`}
        style={{ animationDelay: `${0.05 + index * 0.04}s`, animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border ${gameConfig.bg} ${gameConfig.color}`}>
              <GameIcon className="w-3.5 h-3.5" />
              {gameConfig.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold font-mono px-2 py-1 rounded-md border bg-purple-50 text-purple-700 border-purple-300">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Solana
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1.5 text-[10px] text-arena-success font-semibold uppercase tracking-wider">
                <span className="relative w-2 h-2">
                  <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                  <span className="relative block w-2 h-2 bg-arena-success rounded-full" />
                </span>
                {t.common.live}
              </span>
            )}
            <Badge status={match.status} />
          </div>
        </div>

        {/* Poker info bar */}
        {isPoker && (
          <div className="flex items-center gap-3 mb-3 text-[10px] text-arena-muted font-mono">
            <span className="flex items-center gap-1">
              <IconUsers className="w-3 h-3" />
              {playersAlive}/{agents.length}
            </span>
            {handNumber && (
              <span className="flex items-center gap-1">
                Hand #{handNumber}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <IconStack className="w-3 h-3" />
              {t.common.pot} {Number(pot).toLocaleString()}
              {priceUsd && (
                <span className="text-arena-muted/70">({formatUsdEquivalent(Number(pot), priceUsd)})</span>
              )}
            </span>
          </div>
        )}

        {/* Players Section */}
        {isPoker ? (
          /* Poker: vertical list with stack bars */
          <div className="space-y-1 mb-3">
            {agents
              .slice()
              .sort((a, b) => {
                const sa = pokerScores?.[a.agentId] ?? 0;
                const sb = pokerScores?.[b.agentId] ?? 0;
                return sb - sa;
              })
              .map((agent, idx) => {
                const stack = pokerScores?.[agent.agentId];
                const isEliminated = stack !== undefined && stack <= 0;
                const isWinner = isCompleted && match.winnerId === agent.agentId;
                return (
                  <PokerPlayerRow
                    key={agent.agentId}
                    agent={agent}
                    idx={agents.indexOf(agent)}
                    stack={stack}
                    isWinner={isWinner}
                    isEliminated={isEliminated}
                    startingStack={startingStack}
                  />
                );
              })}
          </div>
        ) : agents.length >= 2 ? (
          /* Chess / Marrakech: VS layout */
          <div className="flex items-start justify-between gap-2 mb-4">
            <AgentColumn
              agent={agents[0]}
              color={PLAYER_COLORS[0]}
              gradient={PLAYER_GRADIENTS[0]}
              isWinner={winnerAgent?.agentId === agents[0].agentId}
              isDraw={isDraw}
              chessPiece={match.gameType === "chess" ? "black" : undefined}
            />

            {/* VS Divider */}
            <div className="shrink-0 flex flex-col items-center pt-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                isActive
                  ? "bg-arena-success/10 border-arena-success/30"
                  : "bg-arena-bg border-arena-border-light"
              }`}>
                <span className={`text-[10px] font-extrabold tracking-wider ${
                  isActive ? "text-arena-success" : "text-arena-muted"
                }`}>
                  VS
                </span>
              </div>
            </div>

            <AgentColumn
              agent={agents[1]}
              color={PLAYER_COLORS[1]}
              gradient={PLAYER_GRADIENTS[1]}
              isWinner={winnerAgent?.agentId === agents[1].agentId}
              isDraw={isDraw}
              chessPiece={match.gameType === "chess" ? "white" : undefined}
            />
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {agents.map((agent, idx) => (
              <div key={agent.agentId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[idx] }} />
                  <span className="text-sm text-arena-text truncate max-w-[140px]">{agent.agentName}</span>
                </div>
                <span className="text-xs text-arena-muted font-mono">{agent.eloAtStart}</span>
              </div>
            ))}
          </div>
        )}

        {/* Winner / Draw Banner */}
        {isCompleted && (
          winnerAgent ? (
            <div className="bg-arena-accent/8 border border-arena-accent/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <IconCrown className="w-3.5 h-3.5 text-arena-accent shrink-0" />
              <span className="text-xs text-arena-accent font-semibold truncate">
                {winnerAgent.agentName}
              </span>
              <span className="text-[10px] text-arena-accent/70 font-medium uppercase tracking-wider ml-auto">
                {t.common.winner}
              </span>
            </div>
          ) : (
            <div className="bg-arena-muted/8 border border-arena-muted/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <span className="text-xs text-arena-muted font-semibold">
                {t.matchesList.draw}
              </span>
            </div>
          )
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-arena-border-light/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-arena-muted font-mono">
            <span className="font-semibold text-arena-text">{Number(match.stakeAmount).toLocaleString()}</span>
            <span>{(match as any).token || "ALPHA"}</span>
            <>
              <span className="text-arena-border-light/80">·</span>
              <span>{t.common.pot} {Number(pot).toLocaleString()}</span>
              {priceUsd && (
                <span className="text-arena-muted/70">({formatUsdEquivalent(Number(pot), priceUsd)})</span>
              )}
            </>
            {match.moveCount > 0 && (
              <>
                <span className="text-arena-border-light/80">·</span>
                <span>{match.moveCount} {(isPoker ? t.common.hands : t.common.moves).toLowerCase()}</span>
              </>
            )}
          </div>

          {isActive ? (
            <div className="flex items-center gap-3">
              {(viewers != null && viewers > 0) && (
                <span className="flex items-center gap-1 text-xs text-arena-text font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {viewers}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-medium text-arena-primary group-hover:gap-1.5 transition-all">
                {t.matchesList.watchMatch}
                <IconArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-arena-muted">
              {formatRelativeTime(match.createdAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Sort Helper ── */
function sortMatches(matches: Match[], sortKey: SortKey): Match[] {
  const sorted = [...matches];
  switch (sortKey) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case "highestStake":
      return sorted.sort((a, b) => (b.stakeAmount || 0) - (a.stakeAmount || 0));
    default:
      return sorted;
  }
}

export default function MatchesPage() {
  const { t } = useLanguage();
  const { priceUsd } = useAlphaPrice();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [chainFilter, setChainFilter] = useState<ChainFilter>("all");
  const sortRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = 12;

  const tabLabels: Record<Tab, string> = {
    all: t.matchesList.all,
    active: t.matchesList.active,
    completed: t.matchesList.completed,
  };

  const sortLabels: Record<SortKey, string> = {
    newest: t.matchesList.newest,
    oldest: t.matchesList.oldest,
    highestStake: t.matchesList.highestStake,
  };

  const fetchMatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError("");
    try {
      const statusParam = tab === "all" ? undefined : tab;
      const data = await api.getMatches({
        status: statusParam,
        page,
        limit,
      });
      setMatches((data.matches || []).map((m) => {
        const raw = m as any;
        return {
          ...m,
          id: m.id || raw._id,
          winnerId: m.winnerId || raw.winner || raw.result?.winnerId || raw.result?.winner || undefined,
          pot: m.pot || raw.potAmount || 0,
          pokerPlayers: raw.pokerPlayers,
          pokerScores: raw.pokerScores,
          pokerState: raw.pokerState,
        };
      }));
      const pagination = (data as any).pagination;
      const total = data.total || pagination?.total || 0;
      const pages = data.pages || (pagination ? Math.ceil(pagination.total / (pagination.limit || limit)) : 1);
      setTotalPages(pages);
      setTotalCount(total);
      // Fetch viewer counts for active matches
      api.getMatchViewers().then(setViewerCounts).catch(() => {});
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : t.matchesList.loadFailed);
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [tab, page, t.matchesList.loadFailed]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Auto-refresh every 15s when not on completed tab
  useEffect(() => {
    if (tab === "completed") {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      return;
    }
    refreshTimerRef.current = setInterval(() => {
      fetchMatches(true);
    }, 15000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [tab, fetchMatches]);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  const chainFiltered = chainFilter === "all"
    ? matches
    : matches.filter((m) => (m.chain || "solana") === chainFilter);

  const activeMatches = chainFiltered.filter((m) => m.status === "active");
  const otherMatches = tab === "all"
    ? chainFiltered.filter((m) => m.status !== "active")
    : chainFiltered;

  const sortedActiveMatches = sortMatches(activeMatches, sortKey);
  const sortedOtherMatches = sortMatches(otherMatches, sortKey);

  // Pagination info
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div className="page-container">

      {/* ── Hero Banner ── */}
      <div className="dash-hero p-6 sm:p-8 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: "both" }}>
        {/* Gradient orbs */}
        <div className="dash-hero-orb w-56 h-56 bg-arena-primary/10 -top-24 -right-14 animate-pulse-soft" />
        <div className="dash-hero-orb w-40 h-40 bg-arena-accent/8 -bottom-14 left-6 animate-pulse-soft" style={{ animationDelay: "2s" }} />
        <div className="dash-hero-orb w-24 h-24 bg-arena-success/6 top-4 left-1/3 animate-pulse-soft" style={{ animationDelay: "3.5s" }} />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-arena-text-bright leading-tight">
                {t.matchesList.title}
              </h1>
              <p className="text-sm text-arena-muted mt-1">
                {t.matchesList.subtitle}
              </p>
            </div>
            <Link href="/matchmaking">
              <Button>
                <span className="flex items-center gap-2">
                  <IconBolt className="w-4 h-4" />
                  {t.matchmaking.joinQueue}
                </span>
              </Button>
            </Link>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
                <IconTrophy className="w-3.5 h-3.5 text-arena-primary" />
              </div>
              <div>
                <span className="text-lg font-extrabold font-mono tabular-nums text-arena-text-bright leading-none">{totalCount}</span>
                <span className="text-[10px] text-arena-muted uppercase tracking-wider font-semibold ml-1.5">{t.common.matches}</span>
              </div>
            </div>
            {activeMatches.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-arena-success/5 border border-arena-success/20 rounded-xl">
                <span className="relative w-2.5 h-2.5">
                  <span className="absolute inset-0 rounded-full bg-arena-success" />
                  <span className="absolute inset-0 rounded-full bg-arena-success animate-ping opacity-50" />
                </span>
                <span className="text-sm font-semibold text-arena-success font-mono">
                  {activeMatches.length} {t.common.live}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs + Sort + Auto-refresh indicator ── */}
      <div
        className="flex items-center gap-3 mb-6 flex-wrap opacity-0 animate-fade-up relative z-30"
        style={{ animationDelay: "0.06s", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-1 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
          {(["all", "active", "completed"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => handleTabChange(tabKey)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === tabKey
                  ? "bg-arena-primary text-white shadow-arena-sm"
                  : "text-arena-muted hover:text-arena-text"
              }`}
            >
              {tabLabels[tabKey]}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-arena-muted hover:text-arena-text bg-white border border-arena-border-light rounded-lg transition-all hover:border-arena-primary/30 shadow-arena-sm"
          >
            <IconSort className="w-3.5 h-3.5" />
            <span>{sortLabels[sortKey]}</span>
            <svg className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-arena-border-light rounded-lg shadow-arena-lg z-20 min-w-[150px] overflow-hidden">
              {(["newest", "oldest", "highestStake"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setSortKey(key); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    sortKey === key
                      ? "bg-arena-primary/5 text-arena-primary"
                      : "text-arena-muted hover:bg-arena-bg hover:text-arena-text"
                  }`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chain badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-300">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          Solana
        </div>

        {/* Auto-refresh indicator */}
        {tab !== "completed" && (
          <div className={`flex items-center gap-1.5 text-[10px] text-arena-muted font-mono transition-opacity ${
            isRefreshing ? "opacity-100" : "opacity-50"
          }`}>
            <IconRefresh className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{t.matchesList.autoUpdating}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        /* ── Skeleton Loading ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        /* ── Empty State ── */
        <div className="dash-glass-card rounded-2xl">
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-arena-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
              <IconBolt className="w-8 h-8 text-arena-primary" />
            </div>
            <p className="text-arena-text-bright font-semibold mb-1 font-display">{t.matchesList.noMatchesFound}</p>
            <p className="text-sm text-arena-muted mb-6 max-w-xs mx-auto">
              {tab === "active"
                ? t.matchesList.noActive
                : tab === "completed"
                ? t.matchesList.noCompleted
                : t.matchesList.noMatches}
            </p>
            <Link href="/matchmaking">
              <Button variant="secondary" size="sm">
                <span className="flex items-center gap-2">
                  <IconBolt className="w-4 h-4" />
                  {t.matchmaking.joinQueue}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Live Now Section ── */}
          {tab === "all" && sortedActiveMatches.length > 0 && (
            <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="relative w-3 h-3">
                  <span className="absolute inset-0 bg-arena-success rounded-full animate-ping opacity-75" />
                  <span className="relative block w-3 h-3 bg-arena-success rounded-full" />
                </span>
                <h2 className="text-lg font-display font-bold text-arena-text-bright">
                  {t.matchesList.liveNow}
                </h2>
                <span className="text-xs text-arena-success font-mono font-semibold bg-arena-success/10 px-2 py-0.5 rounded-full">
                  {sortedActiveMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedActiveMatches.map((match, i) => (
                  <MatchCard key={match.id} match={match} index={i} priceUsd={priceUsd} viewers={viewerCounts[match.id]} />
                ))}
              </div>
            </div>
          )}

          {/* ── Pagination Info ── */}
          {totalCount > 0 && (
            <div
              className="flex items-center justify-between mb-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.12s", animationFillMode: "both" }}
            >
              <p className="text-xs text-arena-muted font-mono">
                {t.matchesList.showing} {startItem}–{endItem} {t.matchesList.ofTotal} {totalCount} {t.matchesList.results}
              </p>
            </div>
          )}

          {/* ── Match Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {(tab === "all" ? sortedOtherMatches : sortMatches(matches, sortKey)).map((match, i) => (
              <MatchCard key={match.id} match={match} index={i + (tab === "all" ? sortedActiveMatches.length : 0)} priceUsd={priceUsd} viewers={viewerCounts[match.id]} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-center gap-2 opacity-0 animate-fade-up"
              style={{ animationDelay: "0.3s", animationFillMode: "both" }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t.common.previous}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map(
                  (_, idx) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = idx + 1;
                    } else if (page <= 4) {
                      pageNum = idx + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + idx;
                    } else {
                      pageNum = page - 3 + idx;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition-all ${
                          page === pageNum
                            ? "bg-arena-primary text-white font-medium shadow-arena-sm"
                            : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t.common.next}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
