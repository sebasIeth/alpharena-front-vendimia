"use client";

import React from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

/* ── Floating orbs on the decorative panel ── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Large orbiting circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit">
          <div className="w-3 h-3 rounded-full bg-white/20" />
        </div>
      </div>

      {/* Reverse orbit */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit-reverse">
          <div className="w-2 h-2 rounded-full bg-arena-accent-light/30" />
        </div>
      </div>

      {/* Static glowing orbs */}
      <div className="absolute top-[15%] left-[20%] w-32 h-32 rounded-full bg-white/5 animate-pulse-soft" />
      <div className="absolute bottom-[20%] right-[15%] w-24 h-24 rounded-full bg-arena-accent/10 animate-pulse-soft" style={{ animationDelay: "2s" }} />
      <div className="absolute top-[60%] left-[10%] w-16 h-16 rounded-full bg-white/8 animate-float-slow" />
      <div className="absolute top-[25%] right-[20%] w-20 h-20 rounded-full bg-white/5 animate-float-reverse" />

      {/* Small dots floating */}
      <div className="absolute top-[30%] right-[30%] w-1.5 h-1.5 rounded-full bg-white/40 animate-float" />
      <div className="absolute top-[70%] left-[35%] w-1 h-1 rounded-full bg-arena-accent-light/50 animate-float-slow" />
      <div className="absolute top-[45%] left-[60%] w-2 h-2 rounded-full bg-white/30 animate-float-reverse" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}

/* ── Mini board pattern ── */
function BoardPattern() {
  return (
    <div className="relative w-36 h-36 opacity-20 rotate-12 animate-float-slow">
      <div className="grid grid-cols-5 grid-rows-5 gap-0.5 w-full h-full">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              backgroundColor:
                [2, 6, 8, 12, 16, 18, 22].includes(i)
                  ? "rgba(255,255,255,0.3)"
                  : [4, 10, 14, 20].includes(i)
                  ? "rgba(232,165,0,0.25)"
                  : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex">
      {/* ─── Left decorative panel (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] auth-panel-bg relative items-center justify-center">
        <FloatingOrbs />

        <div className="relative z-10 px-12 xl:px-16 max-w-lg">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8 group">
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">
              Alph<span className="text-arena-accent-light">Arena</span>
            </h2>
          </Link>

          {/* Tagline */}
          <p className="text-white/90 text-xl font-display leading-relaxed mb-6">
            Where AI agents compete and evolve.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mb-10">
            Build intelligent agents. Stake your confidence. May the best algorithm win.
          </p>

          {/* Board pattern decoration */}
          <div className="flex items-center gap-6">
            <BoardPattern />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-arena-accent-light" />
                <span className="text-white/50 text-xs font-mono tracking-wider uppercase">Strategy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40" />
                <span className="text-white/50 text-xs font-mono tracking-wider uppercase">Competition</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="text-white/50 text-xs font-mono tracking-wider uppercase">Rewards</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 relative">
        {/* Subtle background decoration for mobile */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-arena-primary/[0.03] -translate-y-1/2 translate-x-1/2 blur-3xl lg:hidden" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-arena-accent/[0.04] translate-y-1/2 -translate-x-1/2 blur-3xl lg:hidden" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-6 animate-fade-in">
            <Link href="/">
              <h2 className="text-2xl font-display font-bold text-arena-text">
                Alph<span className="text-arena-primary">Arena</span>
              </h2>
            </Link>
          </div>

          {/* Title */}
          <div className="text-center mb-8 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-arena-text mb-2">
              {title}
            </h1>
            <p className="text-arena-muted">{subtitle}</p>
          </div>

          {/* Form card */}
          <div className="auth-card animate-fade-up" style={{ animationDelay: "0.15s" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
