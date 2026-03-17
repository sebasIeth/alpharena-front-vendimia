"use client";

import React from "react";
import type { CountdownValue } from "@/hooks/useCountdown";

/* ── Clock icon (circle + hands) ── */
function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

interface CountdownTimerProps {
  countdown: CountdownValue;
}

export default function CountdownTimer({ countdown }: CountdownTimerProps) {
  const { hours, minutes, seconds, totalSeconds, isLive } = countdown;

  /* ── LIVE state ── */
  if (isLive) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-red-400 font-bold text-sm font-mono uppercase tracking-wider">
          Live Now
        </span>
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  /* Urgency states */
  const isCritical = totalSeconds <= 60;
  const isUrgent = totalSeconds <= 600;

  const colorClass = isCritical
    ? "text-red-500"
    : isUrgent
    ? "text-amber-500"
    : "text-arena-muted";

  const pulseClass = isCritical ? "animate-pulse" : "";

  /* Format */
  let display: string;
  if (hours > 0) {
    display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (totalSeconds > 60) {
    display = `${pad(minutes)}:${pad(seconds)}`;
  } else {
    display = `00:${pad(seconds)}`;
  }

  return (
    <div className={`flex items-center gap-2 ${pulseClass}`}>
      <IconClock className={`w-4 h-4 ${colorClass}`} />
      <span className={`font-mono font-bold tabular-nums tracking-wider text-lg ${colorClass}`}>
        {display}
      </span>
    </div>
  );
}
