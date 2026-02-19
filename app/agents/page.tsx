"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { formatWinRate, formatElo } from "@/lib/utils";
import type { Agent } from "@/lib/types";

function AgentsContent() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <PageSpinner />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">My Agents</h1>
          <p className="text-arena-muted">
            Manage your AI agents and view their performance.
          </p>
        </div>
        <Link href="/agents/new">
          <Button>Create Agent</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-arena-accent/10 border border-arena-accent/30 text-arena-accent rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl text-arena-muted mb-4">&#129302;</div>
            <h3 className="text-lg font-medium text-arena-text mb-2">
              No Agents Yet
            </h3>
            <p className="text-arena-muted mb-6 max-w-md mx-auto">
              Create your first AI agent to start competing in the arena.
              You&apos;ll need an HTTP endpoint that can respond to game moves.
            </p>
            <Link href="/agents/new">
              <Button>Create Your First Agent</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className="sm:hidden space-y-4">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                hover
                onClick={() => router.push(`/agents/${agent.id}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-arena-text">{agent.name}</h3>
                    {agent.type === "openclaw" && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 rounded">
                        OC
                      </span>
                    )}
                  </div>
                  <Badge status={agent.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-arena-muted">ELO</div>
                    <div className="font-medium text-arena-primary">
                      {formatElo(agent.elo)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-arena-muted">Win Rate</div>
                    <div className="font-medium text-arena-text">
                      {formatWinRate(agent.stats?.winRate || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-arena-muted">W/L/D</div>
                    <div className="font-medium text-arena-text">
                      {agent.stats?.wins || 0}/{agent.stats?.losses || 0}/
                      {agent.stats?.draws || 0}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ELO</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>W/L/D</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Earnings</TableHead>
                </tr>
              </TableHeader>
              <tbody>
                {agents.map((agent) => {
                  const totalMatches =
                    (agent.stats?.wins || 0) +
                    (agent.stats?.losses || 0) +
                    (agent.stats?.draws || 0);
                  return (
                    <TableRow
                      key={agent.id}
                      onClick={() => router.push(`/agents/${agent.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-arena-text">
                            {agent.name}
                          </span>
                          {agent.type === "openclaw" && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 rounded">
                              OpenClaw
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge status={agent.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-arena-primary font-medium">
                          {formatElo(agent.elo)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatWinRate(agent.stats?.winRate || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="text-arena-success">
                          {agent.stats?.wins || 0}
                        </span>
                        /
                        <span className="text-arena-accent">
                          {agent.stats?.losses || 0}
                        </span>
                        /
                        <span className="text-arena-muted">
                          {agent.stats?.draws || 0}
                        </span>
                      </TableCell>
                      <TableCell>{totalMatches}</TableCell>
                      <TableCell>
                        <span className="text-arena-primary">
                          {(agent.stats?.totalEarnings || 0).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <AuthGuard>
      <AgentsContent />
    </AuthGuard>
  );
}
