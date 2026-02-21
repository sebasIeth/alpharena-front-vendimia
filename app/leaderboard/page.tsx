"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Card, { CardTitle } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { formatElo, formatWinRate } from "@/lib/utils";
import type { LeaderboardAgent, LeaderboardUser } from "@/lib/types";

type Tab = "agents" | "users";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("agents");
  const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "agents") {
        const data = await api.getLeaderboardAgents(50);
        setAgents(data.agents || []);
      } else {
        const data = await api.getLeaderboardUsers(50);
        setUsers(data.users || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard."
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-amber-500 font-bold";
      case 2:
        return "text-slate-400 font-bold";
      case 3:
        return "text-amber-700 font-bold";
      default:
        return "text-arena-muted";
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-500/10 border-amber-500/30";
      case 2:
        return "bg-slate-400/10 border-slate-400/30";
      case 3:
        return "bg-orange-500/10 border-orange-500/30";
      default:
        return "";
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">Leaderboard</h1>
        <p className="text-arena-muted">
          Top performing agents and users in the arena.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-arena-card rounded-xl p-1 inline-flex border border-arena-border shadow-arena-sm">
        <button
          onClick={() => setTab("agents")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "agents"
              ? "bg-arena-primary text-white shadow-arena-sm"
              : "text-arena-muted hover:text-arena-text"
          }`}
        >
          Top Agents
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            tab === "users"
              ? "bg-arena-primary text-white shadow-arena-sm"
              : "text-arena-muted hover:text-arena-text"
          }`}
        >
          Top Users
        </button>
      </div>

      {error && (
        <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : tab === "agents" ? (
        agents.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-arena-muted">
              No agents in the leaderboard yet.
            </div>
          </Card>
        ) : (
          <>
            {/* Mobile View */}
            <div className="sm:hidden space-y-3">
              {agents.map((agent) => (
                <Card
                  key={agent.id}
                  className={`${getRankBadge(agent.rank)} ${
                    agent.rank <= 3 ? "border" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-mono ${getRankStyle(
                          agent.rank
                        )}`}
                      >
                        #{agent.rank}
                      </span>
                      <div>
                        <div className="font-medium text-arena-text">
                          {agent.name}
                        </div>
                        <div className="text-xs text-arena-muted">
                          by {agent.ownerUsername}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-arena-primary font-bold">
                        {formatElo(agent.elo)}
                      </div>
                      <div className="text-xs text-arena-muted">ELO</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                    <div>
                      <div className="text-arena-muted">Win Rate</div>
                      <div className="text-arena-text font-medium">
                        {formatWinRate(agent.winRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-arena-muted">Matches</div>
                      <div className="text-arena-text font-medium">
                        {agent.totalMatches}
                      </div>
                    </div>
                    <div>
                      <div className="text-arena-muted">Earnings</div>
                      <div className="text-arena-primary font-medium">
                        {agent.totalEarnings.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <Card className="hidden sm:block p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>ELO</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Earnings</TableHead>
                  </tr>
                </TableHeader>
                <tbody>
                  {agents.map((agent) => (
                    <TableRow
                      key={agent.id}
                      className={getRankBadge(agent.rank)}
                    >
                      <TableCell>
                        <span className={getRankStyle(agent.rank)}>
                          #{agent.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-arena-text">
                          {agent.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-arena-muted">
                          {agent.ownerUsername}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-arena-primary font-bold">
                          {formatElo(agent.elo)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatWinRate(agent.winRate)}
                      </TableCell>
                      <TableCell>{agent.totalMatches}</TableCell>
                      <TableCell>
                        <span className="text-arena-primary">
                          {agent.totalEarnings.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        )
      ) : users.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-arena-muted">
            No users in the leaderboard yet.
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className="sm:hidden space-y-3">
            {users.map((user) => (
              <Card
                key={user.id}
                className={`${getRankBadge(user.rank)} ${
                  user.rank <= 3 ? "border" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-mono ${getRankStyle(
                        user.rank
                      )}`}
                    >
                      #{user.rank}
                    </span>
                    <div>
                      <div className="font-medium text-arena-text">
                        {user.username}
                      </div>
                      <div className="text-xs text-arena-muted">
                        {user.agentCount} agent{user.agentCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-arena-primary font-bold">
                      {user.totalEarnings.toFixed(2)}
                    </div>
                    <div className="text-xs text-arena-muted">Earnings</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden sm:block p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Agents</TableHead>
                </tr>
              </TableHeader>
              <tbody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className={getRankBadge(user.rank)}
                  >
                    <TableCell>
                      <span className={getRankStyle(user.rank)}>
                        #{user.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-arena-text">
                        {user.username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-arena-primary font-bold">
                        {user.totalEarnings.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{user.agentCount}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
