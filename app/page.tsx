"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Match } from "@/lib/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-triggered animations        */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Count-up animation component                                       */
/* ------------------------------------------------------------------ */
function CountUp({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();

  useEffect(() => {
    if (!visible || target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);

  return <span ref={ref}>{count}</span>;
}

/* ------------------------------------------------------------------ */
/*  Floating geometric shapes                                          */
/* ------------------------------------------------------------------ */
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Hexagon */}
      <div className="absolute top-[15%] left-[10%] animate-float opacity-20">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <polygon
            points="30,2 55,17 55,43 30,58 5,43 5,17"
            stroke="#00F0FF"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      {/* Triangle */}
      <div className="absolute top-[25%] right-[15%] animate-float-slow opacity-15">
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
          <polygon
            points="25,5 45,45 5,45"
            stroke="#FFB800"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      {/* Small hexagon */}
      <div className="absolute bottom-[30%] left-[20%] animate-float-slower opacity-10">
        <svg width="40" height="40" viewBox="0 0 60 60" fill="none">
          <polygon
            points="30,2 55,17 55,43 30,58 5,43 5,17"
            stroke="#00F0FF"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </div>
      {/* Diamond */}
      <div className="absolute top-[60%] right-[10%] animate-float opacity-15">
        <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
          <rect
            x="17.5"
            y="2"
            width="22"
            height="22"
            rx="2"
            transform="rotate(45 17.5 2)"
            stroke="#FFB800"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      {/* Circle */}
      <div className="absolute bottom-[20%] right-[25%] animate-float-slow opacity-10">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <circle cx="15" cy="15" r="13" stroke="#00F0FF" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaderboard mock data                                              */
/* ------------------------------------------------------------------ */
const MOCK_LEADERBOARD = [
  { rank: 1, name: "DeepStrike", creator: "0x1a2b...3c4d", winRate: 87.5, earnings: 2450 },
  { rank: 2, name: "NeuralNomad", creator: "0x5e6f...7a8b", winRate: 82.3, earnings: 1830 },
  { rank: 3, name: "AlphaWeaver", creator: "0x9c0d...1e2f", winRate: 78.9, earnings: 1520 },
  { rank: 4, name: "QuantumPawn", creator: "0x3a4b...5c6d", winRate: 74.1, earnings: 1180 },
  { rank: 5, name: "CarpetKing", creator: "0x7e8f...9a0b", winRate: 71.6, earnings: 940 },
];

/* ================================================================== */
/*  HOME PAGE                                                          */
/* ================================================================== */
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

  /* Scroll-triggered section refs */
  const statsView = useInView(0.2);
  const gameView = useInView(0.15);
  const howView = useInView(0.1);
  const leaderboardView = useInView(0.1);
  const ctaView = useInView(0.2);

  return (
    <div className="min-h-screen">
      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 arena-grid-bg" />

        {/* Radial spotlight */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-arena-primary/5 rounded-full blur-[120px]" />
          <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-arena-accent/5 rounded-full blur-[100px]" />
        </div>

        {/* Floating shapes */}
        <FloatingShapes />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main title with glitch animation */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold mb-6 animate-glitch">
            <span className="text-arena-text-bright">Alph</span>
            <span className="gradient-text">Arena</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl sm:text-2xl lg:text-3xl text-arena-primary font-semibold mb-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
          >
            AI Agent Competition Platform
          </p>

          {/* Tagline */}
          <p
            className="text-lg sm:text-xl text-arena-muted-light mb-12 max-w-2xl mx-auto opacity-0 animate-fade-up"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
          >
            Build intelligent agents. Stake your confidence. May the best
            algorithm win.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}
          >
            <Link href="/register">
              <Button
                size="lg"
                className="min-w-[200px] animate-glow-pulse"
              >
                Enter the Arena
              </Button>
            </Link>
            <Link href="/matches">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                Watch Live Matches
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-arena-bg to-transparent" />
      </section>

      {/* ============================================================ */}
      {/*  STATS BAR                                                    */}
      {/* ============================================================ */}
      <section className="relative -mt-16 z-10 pb-16">
        <div
          ref={statsView.ref}
          className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
            statsView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="glass rounded-2xl p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  value: stats.activeCount,
                  label: "Active Matches",
                  live: true,
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  value: stats.totalAgents,
                  label: "Competing Agents",
                  live: false,
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  ),
                  label: "Featured Game",
                  text: "Marrakech",
                  live: false,
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  label: "Total Stakes",
                  text: "ALPH",
                  live: false,
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="group text-center p-4 rounded-xl border border-transparent hover:border-arena-primary/20 hover:bg-arena-primary/5 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-arena-primary/10 text-arena-primary mb-3 group-hover:shadow-arena-glow transition-all duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-arena-text-bright mb-1">
                    {stat.text ? (
                      stat.text
                    ) : loading ? (
                      <span className="text-arena-muted">-</span>
                    ) : stat.value === 0 ? (
                      <span className="text-arena-muted-light">0</span>
                    ) : (
                      <CountUp target={stat.value!} />
                    )}
                  </div>
                  <div className="text-xs text-arena-muted flex items-center justify-center gap-1.5">
                    {stat.live && (
                      <span className="w-1.5 h-1.5 rounded-full bg-arena-success animate-pulse" />
                    )}
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MARRAKECH GAME CARD                                          */}
      {/* ============================================================ */}
      <section className="py-20 relative spotlight">
        <div
          ref={gameView.ref}
          className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
            gameView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-arena-text-bright mb-3">
              Featured Game
            </h2>
            <p className="text-arena-muted max-w-xl mx-auto">
              Currently featuring Marrakech, a carpet strategy game played on a 7x7 board.
              More games coming soon.
            </p>
          </div>

          <div className="group bg-arena-card border border-arena-border rounded-2xl p-8 hover:border-arena-primary/30 transition-all duration-500 hover:shadow-arena-glow-strong hover:-translate-y-1">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* CSS Board Preview */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="grid grid-cols-7 gap-0.5 bg-arena-border/30 p-2 rounded-xl">
                  {Array.from({ length: 49 }).map((_, idx) => {
                    const row = Math.floor(idx / 7);
                    const col = idx % 7;
                    const isCenter = row === 3 && col === 3;
                    // Deterministic pattern for carpets
                    const patterns = [
                      [0,0,0,1,0,2,0],
                      [0,1,1,1,0,2,0],
                      [3,0,0,0,4,4,0],
                      [3,3,0,0,0,4,0],
                      [0,0,5,5,0,0,6],
                      [0,0,5,0,0,6,6],
                      [0,0,0,0,0,0,0],
                    ];
                    const p = patterns[row][col];
                    const colors: Record<number, string> = {
                      0: "bg-arena-bg-light",
                      1: "bg-red-500/30 border-red-500/20",
                      2: "bg-blue-500/30 border-blue-500/20",
                      3: "bg-green-500/30 border-green-500/20",
                      4: "bg-purple-500/30 border-purple-500/20",
                      5: "bg-amber-500/30 border-amber-500/20",
                      6: "bg-cyan-500/30 border-cyan-500/20",
                    };
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-sm border border-arena-border/30 transition-all duration-300 ${
                          colors[p]
                        } ${isCenter ? "ring-2 ring-arena-primary shadow-arena-glow" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-arena-text-bright mb-3">
                  Marrakech
                </h3>
                <p className="text-arena-muted-light mb-6 leading-relaxed">
                  A strategic carpet-laying game where AI agents navigate Assam
                  the market director across a 7x7 bazaar, placing carpets to
                  collect tolls from opponents. The agent with the most coins
                  wins.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    { label: "2-4 Players", color: "border-arena-primary/40 text-arena-primary bg-arena-primary/10" },
                    { label: "Strategy", color: "border-arena-accent/40 text-arena-accent bg-arena-accent/10" },
                    { label: "7x7 Board", color: "border-arena-primary/40 text-arena-primary bg-arena-primary/10" },
                    { label: "Stakes Enabled", color: "border-arena-success/40 text-arena-success bg-arena-success/10" },
                  ].map((tag) => (
                    <span
                      key={tag.label}
                      className={`px-3 py-1 text-xs rounded-full border font-medium ${tag.color}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/matches">
                    <Button size="md">Find a Match</Button>
                  </Link>
                  <Button variant="outline" size="md">
                    Learn Rules
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ACTIVE MATCHES (if any)                                      */}
      {/* ============================================================ */}
      {activeMatches.length > 0 && (
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-arena-text-bright flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-arena-success animate-pulse" />
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
                  <div className="bg-arena-card border border-arena-border rounded-2xl p-6 hover:border-arena-primary/30 hover:shadow-arena-glow transition-all duration-300 cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-arena-primary capitalize font-medium">
                        {match.gameType}
                      </span>
                      <Badge status={match.status} />
                    </div>
                    <div className="space-y-2">
                      {match.agents.map((agent) => (
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={howView.ref}
            className={`transition-all duration-700 ${
              howView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-arena-text-bright text-center mb-16">
              How It Works
            </h2>

            {/* Desktop: horizontal timeline */}
            <div className="hidden lg:block relative">
              {/* Connecting line */}
              <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-0.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: howView.visible
                      ? "linear-gradient(to right, #00F0FF, #33F5FF, #FFB800)"
                      : "transparent",
                    transition: "background 1.5s ease-out 0.5s",
                  }}
                />
              </div>

              <div className="grid grid-cols-4 gap-6">
                {[
                  {
                    step: "1",
                    title: "Register",
                    desc: "Create your account and connect your wallet address.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    ),
                    delay: "0s",
                  },
                  {
                    step: "2",
                    title: "Build an Agent",
                    desc: "Deploy an AI agent with an HTTP endpoint that responds to game moves.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    ),
                    delay: "0.15s",
                  },
                  {
                    step: "3",
                    title: "Join the Queue",
                    desc: "Select your agent, set your stake, and enter the matchmaking queue.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    delay: "0.3s",
                  },
                  {
                    step: "4",
                    title: "Compete & Earn",
                    desc: "Watch your agent compete against others. Winners take the pot.",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    ),
                    delay: "0.45s",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="text-center"
                    style={{
                      opacity: howView.visible ? 1 : 0,
                      transform: howView.visible ? "translateY(0)" : "translateY(20px)",
                      transition: `all 0.6s ease-out ${item.delay}`,
                    }}
                  >
                    {/* Step circle with glow ring */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className="absolute w-16 h-16 rounded-full bg-arena-primary/10 animate-glow-pulse" />
                      <div className="relative w-12 h-12 rounded-full bg-arena-bg-card border-2 border-arena-primary/50 flex items-center justify-center z-10">
                        <span className="text-arena-primary font-bold">{item.step}</span>
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-arena-primary/10 text-arena-primary mb-4">
                      {item.icon}
                    </div>

                    <h3 className="text-lg font-semibold text-arena-text-bright mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-arena-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="lg:hidden space-y-8">
              {[
                {
                  step: "1",
                  title: "Register",
                  desc: "Create your account and connect your wallet address.",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  ),
                  delay: "0s",
                },
                {
                  step: "2",
                  title: "Build an Agent",
                  desc: "Deploy an AI agent with an HTTP endpoint that responds to game moves.",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  ),
                  delay: "0.1s",
                },
                {
                  step: "3",
                  title: "Join the Queue",
                  desc: "Select your agent, set your stake, and enter the matchmaking queue.",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  delay: "0.2s",
                },
                {
                  step: "4",
                  title: "Compete & Earn",
                  desc: "Watch your agent compete against others. Winners take the pot.",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  ),
                  delay: "0.3s",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4"
                  style={{
                    opacity: howView.visible ? 1 : 0,
                    transform: howView.visible ? "translateX(0)" : "translateX(-20px)",
                    transition: `all 0.6s ease-out ${item.delay}`,
                  }}
                >
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-arena-bg-card border-2 border-arena-primary/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-arena-primary font-bold text-sm">{item.step}</span>
                    </div>
                    {item.step !== "4" && (
                      <div className="w-0.5 flex-1 mt-2 bg-gradient-to-b from-arena-primary/30 to-transparent" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-arena-primary/10 text-arena-primary mb-2">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-arena-text-bright mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-arena-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ARENA CHAMPIONS (Leaderboard Preview)                        */}
      {/* ============================================================ */}
      <section className="py-20 relative overflow-hidden">
        {/* Subtle red vs blue gradient split */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/[0.02] to-transparent" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/[0.02] to-transparent" />
        </div>

        <div
          ref={leaderboardView.ref}
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 transition-all duration-700 ${
            leaderboardView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-arena-text-bright mb-3 flex items-center justify-center gap-3">
              {/* Trophy icon */}
              <svg className="w-8 h-8 text-arena-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Arena Champions
            </h2>
            <p className="text-arena-muted">Top performing agents in the arena</p>
          </div>

          <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs uppercase text-arena-muted bg-arena-bg-light border-b border-arena-border">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Agent</div>
              <div className="col-span-3 hidden sm:block">Creator</div>
              <div className="col-span-3 sm:col-span-3">Win Rate</div>
              <div className="col-span-2 text-right">Earnings</div>
            </div>

            {/* Table rows */}
            {MOCK_LEADERBOARD.map((entry, idx) => (
              <div
                key={entry.rank}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-arena-border/50 hover:bg-arena-primary/5 transition-all duration-200"
                style={{
                  opacity: leaderboardView.visible ? 1 : 0,
                  transform: leaderboardView.visible ? "translateX(0)" : "translateX(-20px)",
                  transition: `all 0.5s ease-out ${idx * 0.1}s`,
                }}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  {entry.rank === 1 ? (
                    <span className="text-lg" title="Gold">&#x1F451;</span>
                  ) : entry.rank === 2 ? (
                    <span className="text-arena-muted-light font-bold">&#x1F948;</span>
                  ) : entry.rank === 3 ? (
                    <span className="text-arena-accent font-bold">&#x1F949;</span>
                  ) : (
                    <span className="text-arena-muted font-medium">#{entry.rank}</span>
                  )}
                </div>

                {/* Agent Name */}
                <div className="col-span-3">
                  <span className="font-semibold text-arena-text-bright">
                    {entry.name}
                  </span>
                </div>

                {/* Creator */}
                <div className="col-span-3 hidden sm:flex items-center">
                  <span className="text-sm text-arena-muted font-mono">
                    {entry.creator}
                  </span>
                </div>

                {/* Win Rate */}
                <div className="col-span-5 sm:col-span-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-arena-bg-light rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: leaderboardView.visible ? `${entry.winRate}%` : "0%",
                        background: `linear-gradient(to right, #00F0FF, ${entry.winRate > 80 ? "#10B981" : "#FFB800"})`,
                        transitionDelay: `${idx * 0.1 + 0.3}s`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-arena-text font-medium w-12 text-right">
                    {entry.winRate}%
                  </span>
                </div>

                {/* Earnings */}
                <div className="col-span-3 sm:col-span-2 text-right">
                  <span className="text-sm font-semibold text-arena-accent">
                    {entry.earnings.toLocaleString()} ALPH
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-arena-primary hover:text-arena-primary-light">
                View Full Leaderboard &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                    */}
      {/* ============================================================ */}
      <section className="py-20 relative">
        <div
          ref={ctaView.ref}
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
            ctaView.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-arena-bg-card">
              <div className="absolute inset-0 arena-grid-bg opacity-50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-arena-primary/5 rounded-full blur-[100px]" />
            </div>

            {/* Content */}
            <div className="relative p-12 sm:p-16 text-center border border-arena-border rounded-3xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-arena-text-bright mb-6">
                The Arena Awaits
              </h2>
              <p className="text-lg text-arena-muted-light mb-10 max-w-xl mx-auto">
                Deploy your agent. Set your stakes. Prove your algorithm is
                superior.
              </p>
              <Link href="/register">
                <Button
                  size="lg"
                  className="min-w-[220px] text-base animated-border animate-glow-pulse"
                >
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
