"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatRelativeTime, formatWinRate, normalizeMatchAgents } from "@/lib/utils";
import type { Agent, Match } from "@/lib/types";

function DashboardContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsRes, matchesRes] = await Promise.allSettled([
          api.getAgents(),
          api.getMatches({ limit: 5 }),
        ]);

        if (agentsRes.status === "fulfilled") {
          setAgents(agentsRes.value.agents || []);
        }
        if (matchesRes.status === "fulfilled") {
          setRecentMatches((matchesRes.value.matches || []).map((m) => ({
            ...m,
            id: m.id || (m as any)._id,
          })));
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeAgents = agents.filter((a) => a.status === "in_match").length;
  const queuedAgents = agents.filter((a) => a.status === "queued").length;
  const totalEarnings = agents.reduce(
    (sum, a) => sum + (a.stats?.totalEarnings || 0),
    0
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="page-title">
          {t.dashboard.welcomeBack} <span className="gradient-text">{user?.username}</span>
        </h1>
        <p className="page-subtitle">
          {t.dashboard.overview}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-sm text-arena-muted mb-1">{t.dashboard.yourAgents}</div>
          <div className="text-2xl font-bold text-arena-text">{agents.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-arena-muted mb-1">{t.dashboard.activeMatches}</div>
          <div className="text-2xl font-bold text-arena-success">{activeAgents}</div>
        </Card>
        <Card>
          <div className="text-sm text-arena-muted mb-1">{t.dashboard.inQueue}</div>
          <div className="text-2xl font-bold text-amber-500">{queuedAgents}</div>
        </Card>
        <Card>
          <div className="text-sm text-arena-muted mb-1">{t.dashboard.totalEarnings}</div>
          <div className="text-2xl font-bold text-arena-primary">
            {totalEarnings.toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/agents/new">
          <Card hover className="text-center">
            <div className="text-arena-primary text-2xl mb-2">+</div>
            <div className="text-sm font-medium text-arena-text">{t.dashboard.createAgent}</div>
            <div className="text-xs text-arena-muted mt-1">
              {t.dashboard.deployNew}
            </div>
          </Card>
        </Link>
        <Link href="/matchmaking">
          <Card hover className="text-center">
            <div className="text-arena-primary text-2xl mb-2">&#9876;</div>
            <div className="text-sm font-medium text-arena-text">{t.dashboard.joinQueue}</div>
            <div className="text-xs text-arena-muted mt-1">
              {t.dashboard.enterMatchmaking}
            </div>
          </Card>
        </Link>
        <Link href="/leaderboard">
          <Card hover className="text-center">
            <div className="text-arena-primary text-2xl mb-2">&#9733;</div>
            <div className="text-sm font-medium text-arena-text">
              {t.dashboard.leaderboard}
            </div>
            <div className="text-xs text-arena-muted mt-1">
              {t.dashboard.viewRankings}
            </div>
          </Card>
        </Link>
      </div>

      {/* Agents Overview */}
      {agents.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>{t.dashboard.yourAgents}</CardTitle>
            <Link href="/agents">
              <Button variant="ghost" size="sm">
                {t.common.viewAll}
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 6).map((agent) => (
              <Card
                key={agent.id}
                hover
                onClick={() => router.push(`/agents/${agent.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-arena-text">{agent.name}</h4>
                  <Badge status={agent.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-arena-muted">{t.common.elo}</div>
                    <div className="text-sm font-medium text-arena-primary">
                      {Math.round(agent.elo)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-arena-muted">{t.common.winRate}</div>
                    <div className="text-sm font-medium text-arena-text">
                      {formatWinRate(agent.stats?.winRate || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-arena-muted">{t.common.matches}</div>
                    <div className="text-sm font-medium text-arena-text">
                      {(agent.stats?.wins || 0) +
                        (agent.stats?.losses || 0) +
                        (agent.stats?.draws || 0)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>{t.dashboard.recentMatches}</CardTitle>
          <Link href="/matches">
            <Button variant="ghost" size="sm">
              {t.common.viewAll}
            </Button>
          </Link>
        </div>
        {recentMatches.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-arena-muted">
              <p className="mb-2">{t.dashboard.noMatchesYet}</p>
              <Link href="/matchmaking">
                <Button variant="secondary" size="sm">
                  {t.dashboard.startFirst}
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <Card hover className="mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge status={match.status} />
                      <span className="text-sm capitalize text-arena-muted">
                        {match.gameType}
                      </span>
                      <div className="text-sm text-arena-text">
                        {normalizeMatchAgents(match.agents)
                          .map((a) => a.agentName)
                          .join(" vs ") || "Unknown"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-arena-muted">
                      <span>{t.common.stake}: {match.stakeAmount}</span>
                      <span>{formatRelativeTime(match.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
