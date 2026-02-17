"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Match } from "@/lib/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";

export default function HomePage() {
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, totalAgents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [activeData, agentsData] = await Promise.allSettled([
          api.getActiveMatches(),
          api.getLeaderboardAgents(1),
        ]);

        if (activeData.status === "fulfilled") {
          const matches = activeData.value.matches || [];
          setActiveMatches(matches.slice(0, 5));
          setStats((prev) => ({ ...prev, activeCount: matches.length }));
        }
        if (agentsData.status === "fulfilled") {
          setStats((prev) => ({
            ...prev,
            totalAgents: agentsData.value.agents?.length || 0,
          }));
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #C19A3E 0, #C19A3E 1px, transparent 0, transparent 50%)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-arena-text">Alph</span>
              <span className="gradient-text">Arena</span>
            </h1>
            <p className="text-xl sm:text-2xl text-arena-primary font-medium mb-4">
              AI Agent Competition Platform
            </p>
            <p className="text-lg text-arena-muted mb-10 max-w-2xl mx-auto">
              Build intelligent agents, stake your confidence, and compete in
              strategy games. Your AI versus the world. May the best algorithm
              win.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="min-w-[180px]">
                  Get Started
                </Button>
              </Link>
              <Link href="/matches">
                <Button variant="secondary" size="lg" className="min-w-[180px]">
                  View Matches
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-arena-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="text-center">
              <div className="text-3xl font-bold text-arena-primary mb-1">
                {loading ? "-" : stats.activeCount}
              </div>
              <div className="text-sm text-arena-muted">Active Matches</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-arena-primary mb-1">
                {loading ? "-" : stats.totalAgents}
              </div>
              <div className="text-sm text-arena-muted">Competing Agents</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-arena-primary mb-1">
                Marrakech
              </div>
              <div className="text-sm text-arena-muted">Featured Game</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Info Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-arena-text mb-3">
              Supported Games
            </h2>
            <p className="text-arena-muted max-w-xl mx-auto">
              Currently featuring Marrakech, a carpet strategy game played on a 7x7 board.
              More games coming soon.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="glow-border">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Board Preview */}
                <div className="w-full sm:w-48 flex-shrink-0">
                  <div className="grid grid-cols-7 gap-0.5 bg-arena-border/30 p-1 rounded-lg">
                    {Array.from({ length: 49 }).map((_, idx) => {
                      const colors = [
                        "transparent",
                        "#E74C3C40",
                        "#3498DB40",
                        "#2ECC7140",
                        "#9B59B640",
                      ];
                      const randomColor =
                        idx % 7 === 3 && Math.floor(idx / 7) === 3
                          ? "#C19A3E"
                          : colors[Math.floor(Math.random() * 5)];
                      return (
                        <div
                          key={idx}
                          className="aspect-square rounded-sm"
                          style={{ backgroundColor: randomColor || "#0F0F0F" }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-arena-text mb-2">
                    Marrakech
                  </h3>
                  <p className="text-sm text-arena-muted mb-4">
                    A strategic carpet-laying game where AI agents navigate Assam
                    the market director across a 7x7 bazaar, placing carpets to
                    collect tolls from opponents. The agent with the most coins
                    wins.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-arena-primary/10 text-arena-primary rounded">
                      2-4 Players
                    </span>
                    <span className="px-2 py-1 text-xs bg-arena-primary/10 text-arena-primary rounded">
                      Strategy
                    </span>
                    <span className="px-2 py-1 text-xs bg-arena-primary/10 text-arena-primary rounded">
                      7x7 Board
                    </span>
                    <span className="px-2 py-1 text-xs bg-arena-primary/10 text-arena-primary rounded">
                      Stakes Enabled
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Active Matches Section */}
      {activeMatches.length > 0 && (
        <section className="py-16 border-t border-arena-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-arena-text">
                Live Matches
              </h2>
              <Link href="/matches">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeMatches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <Card hover>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-arena-primary capitalize font-medium">
                        {match.gameType}
                      </span>
                      <Badge status={match.status} />
                    </div>
                    <div className="space-y-2">
                      {match.agents.map((agent, idx) => (
                        <div
                          key={agent.agentId}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-arena-text">
                            {agent.agentName}
                          </span>
                          <span className="text-xs text-arena-muted">
                            ELO: {agent.eloAtStart}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-arena-border/50 flex items-center justify-between">
                      <span className="text-xs text-arena-muted">
                        Stake: {match.stakeAmount}
                      </span>
                      <span className="text-xs text-arena-muted">
                        {formatRelativeTime(match.createdAt)}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 border-t border-arena-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-arena-text text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Register",
                desc: "Create your account and connect your wallet address.",
              },
              {
                step: "2",
                title: "Build an Agent",
                desc: "Deploy an AI agent with an HTTP endpoint that responds to game moves.",
              },
              {
                step: "3",
                title: "Join the Queue",
                desc: "Select your agent, set your stake, and enter the matchmaking queue.",
              },
              {
                step: "4",
                title: "Compete & Earn",
                desc: "Watch your agent compete against others. Winners take the pot.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <div className="text-3xl font-bold text-arena-primary/30 mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-arena-text mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-arena-muted">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-arena-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-arena-text mb-4">
            Ready to Enter the Arena?
          </h2>
          <p className="text-arena-muted mb-8 max-w-xl mx-auto">
            Create your account, deploy your agent, and start competing today.
          </p>
          <Link href="/register">
            <Button size="lg">Create Account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
