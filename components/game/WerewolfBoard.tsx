"use client";

import React, { useMemo, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export type WerewolfRole = "WEREWOLF" | "SEER" | "VILLAGER";
export type WerewolfPhase =
  | "NIGHT_WOLVES"
  | "NIGHT_SEER"
  | "DAY_DISCUSSION"
  | "DAY_VOTE"
  | "FINISHED";

export interface WerewolfPlayerView {
  side: string;
  displayName: string;
  isAlive: boolean;
  deathCycle?: number | null;
  deathCause?: "night" | "day" | null;
  role?: WerewolfRole;
}

export interface WerewolfDiscussionEventView {
  cycle: number;
  speaker: string;
  speakerDisplayName: string;
  action:
    | { type: "DAY_ACCUSE"; target: string; targetDisplayName: string }
    | { type: "DAY_DEFEND"; target: string; targetDisplayName: string }
    | { type: "DAY_CLAIM"; role: WerewolfRole }
    | { type: "DAY_PASS" };
}

export interface WerewolfDeathView {
  cycle: number;
  side: string;
  displayName: string;
  role: WerewolfRole;
  cause: "night" | "day";
}

export type WerewolfAction =
  | { type: "NIGHT_KILL_VOTE"; target: string }
  | { type: "SEER_INVESTIGATE"; target: string }
  | { type: "DAY_ACCUSE"; target: string }
  | { type: "DAY_DEFEND"; target: string }
  | { type: "DAY_CLAIM"; role: WerewolfRole }
  | { type: "DAY_PASS" }
  | { type: "DAY_VOTE"; target: string };

export interface WerewolfSeerMemoryView {
  cycle: number;
  target: string;
  targetDisplayName: string;
  isWerewolf: boolean;
}

interface WerewolfBoardProps {
  players: Record<string, WerewolfPlayerView>;
  phase: WerewolfPhase;
  cycle: number;
  activeSide: string | null;
  discussionLog: WerewolfDiscussionEventView[];
  deaths: WerewolfDeathView[];
  status: "waiting" | "playing" | "finished";
  winner: "VILLAGERS" | "WEREWOLVES" | "DRAW" | null;
  mySide?: string | null;
  myRole?: WerewolfRole;
  knownWerewolves?: string[];
  seerMemory?: WerewolfSeerMemoryView[];
  legalActions?: WerewolfAction[];
  isMyTurn?: boolean;
  onSubmitAction?: (action: WerewolfAction) => void;
}

// ── Visual constants ────────────────────────────────────────────────────────

function IconWolfSvg({ size = 32, color = "#b91c1c" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="wolf-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#1f0909" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Neck fur */}
      <path d="M20 52 L14 60 L22 58 L26 60 L32 58 L38 60 L42 58 L50 60 L44 52 Z" fill="#1f0909" />
      {/* Ears — pointed */}
      <path d="M10 24 L6 6 L20 20 Z" fill="url(#wolf-fur)" />
      <path d="M54 24 L58 6 L44 20 Z" fill="url(#wolf-fur)" />
      <path d="M12 20 L11 12 L17 18 Z" fill="#fecaca" opacity="0.55" />
      <path d="M52 20 L53 12 L47 18 Z" fill="#fecaca" opacity="0.55" />
      {/* Head */}
      <path
        d="M32 56 C18 56 10 46 10 32 C10 20 18 12 32 12 C46 12 54 20 54 32 C54 46 46 56 32 56 Z"
        fill="url(#wolf-fur)"
      />
      {/* Face cheeks highlight */}
      <path d="M14 36 Q20 44 28 42 Q22 38 18 34 Z" fill="#450a0a" opacity="0.55" />
      <path d="M50 36 Q44 44 36 42 Q42 38 46 34 Z" fill="#450a0a" opacity="0.55" />
      {/* Eyes — glowing yellow */}
      <ellipse cx="22" cy="30" rx="4" ry="3" fill="#fbbf24" />
      <ellipse cx="42" cy="30" rx="4" ry="3" fill="#fbbf24" />
      <ellipse cx="22" cy="30" rx="1.4" ry="2.5" fill="#1a1204" />
      <ellipse cx="42" cy="30" rx="1.4" ry="2.5" fill="#1a1204" />
      <circle cx="23.2" cy="28.8" r="0.8" fill="#fff" opacity="0.9" />
      <circle cx="43.2" cy="28.8" r="0.8" fill="#fff" opacity="0.9" />
      {/* Snout (lighter) */}
      <path d="M24 40 Q32 34 40 40 L40 46 Q32 52 24 46 Z" fill="#78350f" opacity="0.4" />
      {/* Nose */}
      <path d="M28 40 Q32 38 36 40 Q34 43 32 43 Q30 43 28 40 Z" fill="#0a0204" />
      {/* Mouth line */}
      <path d="M32 44 L32 48" stroke="#0a0204" strokeWidth="1.3" />
      {/* Fangs */}
      <path d="M27.5 47 L28 51 L29 47 Z" fill="#fff" />
      <path d="M36.5 47 L36 51 L35 47 Z" fill="#fff" />
      {/* Forehead stripe */}
      <path d="M30 18 L32 24 L34 18 Z" fill="#0a0204" opacity="0.45" />
    </svg>
  );
}

function IconSeerSvg({ size = 32, color = "#8b5cf6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="seer-ball" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="35%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
        <radialGradient id="seer-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Hood */}
      <path
        d="M10 30 Q10 10 32 10 Q54 10 54 30 L50 44 L14 44 Z"
        fill="#3b0764"
      />
      {/* Inner hood shadow */}
      <path d="M18 30 Q18 18 32 18 Q46 18 46 30 L44 38 L20 38 Z" fill="#1e0840" />
      {/* Face in shadow */}
      <ellipse cx="32" cy="30" rx="10" ry="8" fill="#0a0714" opacity="0.9" />
      {/* Glowing eyes inside the hood */}
      <circle cx="28" cy="30" r="1.6" fill="#fde047" />
      <circle cx="36" cy="30" r="1.6" fill="#fde047" />
      {/* Third eye glow on forehead */}
      <circle cx="32" cy="22" r="5" fill="url(#seer-glow)" />
      <ellipse cx="32" cy="22" rx="3" ry="2" fill="#fde047" />
      <circle cx="32" cy="22" r="1" fill="#1e0840" />
      {/* Hands holding orb */}
      <path d="M18 52 Q24 46 30 50" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M46 52 Q40 46 34 50" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Crystal ball */}
      <circle cx="32" cy="55" r="7" fill="url(#seer-ball)" />
      <ellipse cx="30" cy="52" rx="2" ry="1.2" fill="#fff" opacity="0.85" />
      {/* Sparkles */}
      <path d="M52 14 L53 17 L56 18 L53 19 L52 22 L51 19 L48 18 L51 17 Z" fill="#fde047" />
      <path d="M8 26 L8.7 28 L11 28.7 L8.7 29.4 L8 31.6 L7.3 29.4 L5 28.7 L7.3 28 Z" fill="#c4b5fd" opacity="0.8" />
    </svg>
  );
}

function IconVillagerSvg({ size = 32, color = "#d97706" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="straw-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Straw hat brim */}
      <ellipse cx="32" cy="18" rx="24" ry="5" fill="url(#straw-hat)" />
      <ellipse cx="32" cy="17" rx="24" ry="4" fill="#78350f" opacity="0.35" />
      {/* Hat crown */}
      <path d="M18 16 Q20 4 32 4 Q44 4 46 16 Z" fill="url(#straw-hat)" />
      {/* Hat band */}
      <path d="M20 14 L44 14" stroke="#78350f" strokeWidth="2" />
      {/* Hat straw texture */}
      <path d="M22 12 L24 8 M26 13 L27 6 M32 12 L32 5 M37 13 L38 6 M42 12 L40 8" stroke="#78350f" strokeWidth="0.6" opacity="0.5" />
      {/* Face */}
      <ellipse cx="32" cy="32" rx="12" ry="13" fill="#fcd9b6" />
      {/* Eyes (closed friendly) */}
      <path d="M25 30 Q27 28 29 30" stroke="#3b1d09" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M35 30 Q37 28 39 30" stroke="#3b1d09" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <circle cx="24" cy="34" r="2" fill="#f87171" opacity="0.5" />
      <circle cx="40" cy="34" r="2" fill="#f87171" opacity="0.5" />
      {/* Mustache */}
      <path d="M26 37 Q32 40 38 37 Q36 39 32 39 Q28 39 26 37 Z" fill="#78350f" />
      {/* Mouth */}
      <path d="M29 41 Q32 43 35 41" stroke="#78350f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Beard */}
      <path d="M22 38 Q24 50 32 52 Q40 50 42 38 Q40 46 32 48 Q24 46 22 38 Z" fill="#78350f" />
      {/* Shirt collar */}
      <path d="M18 54 L22 48 L32 52 L42 48 L46 54 L44 62 L20 62 Z" fill="#4b5563" />
      <path d="M28 52 L32 58 L36 52 Z" fill="#1f2937" />
    </svg>
  );
}

function IconMaskSvg({ size = 32, color = "#7c3aed" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="mask-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Playing card back */}
      <rect x="12" y="6" width="40" height="52" rx="4" fill="url(#mask-grad)" stroke="#fde047" strokeWidth="1.5" />
      {/* Decorative border */}
      <rect x="16" y="10" width="32" height="44" rx="2" fill="none" stroke="#fde047" strokeWidth="0.8" opacity="0.7" />
      {/* Diamond pattern */}
      <g opacity="0.35" stroke="#fde047" strokeWidth="0.6" fill="none">
        <path d="M24 18 L32 14 L40 18 L32 22 Z" />
        <path d="M24 32 L32 28 L40 32 L32 36 Z" />
        <path d="M24 46 L32 42 L40 46 L32 50 Z" />
      </g>
      {/* Center crest — question mark inside circle */}
      <circle cx="32" cy="32" r="9" fill="#1e0840" opacity="0.85" />
      <path
        d="M28 28 Q28 24 32 24 Q36 24 36 28 Q36 30.5 33.5 32 Q32 33 32 35"
        stroke="#fde047"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="38" r="1.1" fill="#fde047" />
      {/* Corner marks */}
      <circle cx="18" cy="12" r="1" fill="#fde047" />
      <circle cx="46" cy="12" r="1" fill="#fde047" />
      <circle cx="18" cy="52" r="1" fill="#fde047" />
      <circle cx="46" cy="52" r="1" fill="#fde047" />
    </svg>
  );
}

function IconSkullSvg({ size = 32, color = "#e5e7eb" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="skull-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Crossbones */}
      <g transform="translate(32 40) rotate(45) translate(-32 -40)">
        <rect x="10" y="38" width="44" height="5" rx="2" fill="url(#skull-grad)" />
        <circle cx="10" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="14" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="54" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="50" cy="40.5" r="3.5" fill="url(#skull-grad)" />
      </g>
      <g transform="translate(32 40) rotate(-45) translate(-32 -40)">
        <rect x="10" y="38" width="44" height="5" rx="2" fill="url(#skull-grad)" />
        <circle cx="10" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="14" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="54" cy="40.5" r="3.5" fill="url(#skull-grad)" />
        <circle cx="50" cy="40.5" r="3.5" fill="url(#skull-grad)" />
      </g>
      {/* Skull */}
      <path
        d="M14 28 Q14 10 32 10 Q50 10 50 28 L50 38 Q50 42 47 44 L44 46 L44 54 L38 54 L38 48 L32 50 L26 48 L26 54 L20 54 L20 46 L17 44 Q14 42 14 38 Z"
        fill="url(#skull-grad)"
      />
      {/* Eye sockets */}
      <ellipse cx="23" cy="28" rx="5" ry="6" fill="#0a0714" />
      <ellipse cx="41" cy="28" rx="5" ry="6" fill="#0a0714" />
      {/* Eye shine */}
      <circle cx="24.5" cy="26" r="1" fill="#fca5a5" opacity="0.8" />
      <circle cx="42.5" cy="26" r="1" fill="#fca5a5" opacity="0.8" />
      {/* Nose */}
      <path d="M29 36 L32 43 L35 36 Z" fill="#0a0714" />
      {/* Teeth */}
      <g fill="#0a0714">
        <rect x="22" y="42" width="4" height="7" rx="1" />
        <rect x="27" y="44" width="4" height="8" rx="1" />
        <rect x="33" y="44" width="4" height="8" rx="1" />
        <rect x="38" y="42" width="4" height="7" rx="1" />
      </g>
      {/* Crack on forehead */}
      <path d="M22 20 L24 22 L23 25 L26 27" stroke="#9ca3af" strokeWidth="0.8" fill="none" opacity="0.7" />
    </svg>
  );
}

function IconFlameSvg({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 60" fill="none">
      {/* Outer flame */}
      <path
        d="M24 4 Q30 16 36 22 Q42 30 38 42 Q34 54 24 56 Q14 54 10 42 Q6 30 12 22 Q18 16 24 4 Z"
        fill="url(#flame-outer)"
      />
      {/* Inner flame */}
      <path
        d="M24 14 Q28 22 32 28 Q36 36 32 46 Q28 52 24 52 Q20 52 16 46 Q12 36 16 28 Q20 22 24 14 Z"
        fill="url(#flame-inner)"
      />
      {/* Core */}
      <ellipse cx="24" cy="44" rx="4" ry="6" fill="#fefce8" opacity={0.9} />
      <defs>
        <radialGradient id="flame-outer" cx="50%" cy="80%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id="flame-inner" cx="50%" cy="80%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function RoleIcon({ role, size = 32, color }: { role: WerewolfRole; size?: number; color?: string }) {
  if (role === "WEREWOLF") return <IconWolfSvg size={size} color={color ?? "#f87171"} />;
  if (role === "SEER") return <IconSeerSvg size={size} color={color ?? "#c4b5fd"} />;
  return <IconVillagerSvg size={size} color={color ?? "#fbbf24"} />;
}

// Tiny inline icons for action buttons
function IconActionDagger({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
    </svg>
  );
}
function IconActionEye({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}
function IconActionSwords({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4 L14 14 M4 6 L6 4 M16 20 L20 20 L20 16 L18 14" />
      <path d="M20 4 L10 14 M18 6 L20 4 M4 16 L4 20 L8 20 L10 18" />
    </svg>
  );
}
function IconActionShield({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L4 6 L4 12 Q4 18 12 22 Q20 18 20 12 L20 6 Z" opacity={0.85} />
      <path d="M10 12 L12 14 L16 10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function IconActionScroll({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor" opacity={0.15} />
      <path d="M7 8 L17 8 M7 12 L17 12 M7 16 L13 16" strokeLinecap="round" />
    </svg>
  );
}
function IconActionMute({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 10 L8 10 L13 6 L13 18 L8 14 L4 14 Z" fill="currentColor" opacity={0.3} />
      <path d="M17 9 L21 13 M21 9 L17 13" />
    </svg>
  );
}
function IconActionBallot({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="8" width="18" height="13" rx="1" fill="currentColor" opacity={0.15} />
      <path d="M8 12 L11 15 L16 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8 L7 4 L17 4 L21 8" strokeLinejoin="round" />
    </svg>
  );
}

const ROLE_COLOR: Record<WerewolfRole, { ring: string; glow: string; text: string }> = {
  WEREWOLF: {
    ring: "rgba(220,38,38,0.7)",
    glow: "0 0 24px rgba(220,38,38,0.5)",
    text: "#fca5a5",
  },
  SEER: {
    ring: "rgba(167,139,250,0.7)",
    glow: "0 0 24px rgba(167,139,250,0.5)",
    text: "#c4b5fd",
  },
  VILLAGER: {
    ring: "rgba(217,119,6,0.6)",
    glow: "0 0 20px rgba(217,119,6,0.4)",
    text: "#fcd34d",
  },
};

function isNight(phase: WerewolfPhase): boolean {
  return phase === "NIGHT_WOLVES" || phase === "NIGHT_SEER";
}

function seatPosition(index: number, count: number, radius: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
  };
}

// ── Background (night/day) ──────────────────────────────────────────────────

function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 70,
        size: Math.random() * 1.8 + 0.4,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
      })),
    [],
  );
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: 0.7,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
            animation: `ww-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function SkyOrb({ night }: { night: boolean }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        right: night ? "8%" : "10%",
        top: night ? "6%" : "8%",
        width: night ? 90 : 80,
        height: night ? 90 : 80,
        borderRadius: "50%",
        background: night
          ? "radial-gradient(circle at 35% 35%, #fef9c3 0%, #fde68a 40%, #facc15 70%, rgba(250,204,21,0) 100%)"
          : "radial-gradient(circle at 35% 35%, #fffbeb 0%, #fbbf24 50%, #f97316 100%)",
        boxShadow: night
          ? "0 0 60px rgba(253,224,71,0.6), 0 0 120px rgba(253,224,71,0.3)"
          : "0 0 80px rgba(249,115,22,0.55), 0 0 140px rgba(251,191,36,0.35)",
        animation: night ? "ww-moon-float 14s ease-in-out infinite" : "ww-sun-float 18s ease-in-out infinite",
      }}
    />
  );
}

function Fog() {
  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "60%",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(30,27,54,0.65) 0%, rgba(30,27,54,0) 70%)",
          filter: "blur(2px)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "30%",
          background:
            "linear-gradient(180deg, rgba(12,12,24,0) 0%, rgba(12,12,24,0.55) 100%)",
        }}
      />
    </>
  );
}

function TreeSilhouette({ left, scale = 1, flip = false }: { left: string; scale?: number; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="absolute bottom-0 pointer-events-none"
      style={{
        left,
        width: 120 * scale,
        height: 120 * scale,
        transform: flip ? "scaleX(-1)" : undefined,
        filter: "blur(0.3px)",
        opacity: 0.85,
      }}
    >
      <path
        d="M60 118 L60 70 M60 70 L35 40 M60 70 L85 40 M60 55 L45 35 M60 55 L75 35 M55 60 L40 48 M65 60 L80 48"
        stroke="#000"
        strokeWidth="3"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M60 85 Q30 70 28 38 Q35 14 60 20 Q85 14 92 38 Q90 70 60 85 Z"
        fill="#0a0714"
      />
    </svg>
  );
}

// ── Centerpiece: campfire / moon ring ───────────────────────────────────────

function Campfire({ night }: { night: boolean }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
      style={{
        width: 120,
        height: 120,
      }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: night
            ? "radial-gradient(circle, rgba(251,146,60,0.55) 0%, rgba(251,146,60,0) 70%)"
            : "radial-gradient(circle, rgba(253,224,71,0.5) 0%, rgba(253,224,71,0) 70%)",
          animation: "ww-fire-pulse 2.6s ease-in-out infinite",
        }}
      />
      {/* Flame */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "drop-shadow(0 0 16px rgba(251,146,60,0.8))",
          animation: "ww-flame-dance 1.4s ease-in-out infinite",
          transformOrigin: "center",
        }}
      >
        <IconFlameSvg size={60} />
      </div>
    </div>
  );
}

// ── Player card ─────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  isActive,
  isMe,
  revealedAsWolf,
  onClick,
  clickable,
  selected,
}: {
  player: WerewolfPlayerView;
  isActive: boolean;
  isMe: boolean;
  revealedAsWolf: boolean;
  onClick?: () => void;
  clickable?: boolean;
  selected?: boolean;
}) {
  const alive = player.isAlive;
  const revealRole = !alive && player.role;
  const ringColor = revealRole
    ? ROLE_COLOR[player.role!].ring
    : isActive
    ? "rgba(251,191,36,0.9)"
    : "rgba(255,255,255,0.25)";
  const glow = isActive
    ? "0 0 24px rgba(251,191,36,0.7)"
    : revealRole
    ? ROLE_COLOR[player.role!].glow
    : "none";

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className="relative flex flex-col items-center gap-1.5 group"
      style={{
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {/* Tarot-style card */}
      <div
        className="relative rounded-lg overflow-hidden transition-all"
        style={{
          width: 72,
          height: 96,
          border: `2px solid ${selected ? "#34d399" : ringColor}`,
          boxShadow: selected ? "0 0 20px rgba(52,211,153,0.7)" : glow,
          background: alive
            ? "linear-gradient(160deg, #2a1f3d 0%, #0f0a1e 100%)"
            : "linear-gradient(160deg, #2a0f0f 0%, #0a0606 100%)",
          opacity: alive ? 1 : 0.55,
          filter: alive ? "none" : "grayscale(0.4)",
          transform: isActive ? "translateY(-4px)" : "none",
        }}
      >
        {/* Card inner frame */}
        <div
          className="absolute inset-1 rounded flex flex-col items-center justify-between py-1"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: alive
              ? "radial-gradient(ellipse at 50% 40%, rgba(251,191,36,0.1) 0%, transparent 60%)"
              : "none",
          }}
        >
          {/* Top ornament */}
          <div className="text-[8px] text-white/40 font-serif tracking-widest">
            ✦
          </div>
          {/* Center symbol */}
          <div className="leading-none flex items-center justify-center">
            {alive ? (
              revealedAsWolf ? (
                <div style={{ filter: "drop-shadow(0 0 8px rgba(220,38,38,0.7))" }}>
                  <IconWolfSvg size={36} color="#f87171" />
                </div>
              ) : player.role ? (
                <RoleIcon role={player.role} size={36} />
              ) : (
                <div style={{ opacity: 0.65 }}>
                  <IconMaskSvg size={36} color="#c4b5fd" />
                </div>
              )
            ) : (
              <IconSkullSvg size={36} color="#fca5a5" />
            )}
          </div>
          {/* Bottom ornament */}
          <div className="text-[8px] text-white/40 font-serif tracking-widest">
            ✦
          </div>
        </div>
        {/* "You" tag */}
        {isMe && (
          <div className="absolute top-0 left-0 right-0 text-center text-[9px] font-bold tracking-widest text-emerald-300 bg-black/60 py-0.5">
            YOU
          </div>
        )}
        {/* Active indicator */}
        {isActive && alive && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-300"
            style={{
              boxShadow: "0 0 10px rgba(251,191,36,0.9)",
              animation: "ww-pulse 1.4s ease-in-out infinite",
            }}
          />
        )}
      </div>
      {/* Name plate */}
      <div
        className="text-[11px] font-serif text-center whitespace-nowrap px-2 py-0.5 rounded"
        style={{
          color: alive ? "#f5f5f4" : "#71717a",
          background: "rgba(0,0,0,0.45)",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          letterSpacing: "0.05em",
        }}
      >
        {player.displayName}
      </div>
      {revealRole && (
        <div
          className="text-[9px] font-serif italic px-1.5 py-0.5 rounded uppercase tracking-wider"
          style={{
            color: ROLE_COLOR[player.role!].text,
            background: "rgba(0,0,0,0.5)",
          }}
        >
          {player.role!.toLowerCase()}
        </div>
      )}
    </button>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function WerewolfBoard(props: WerewolfBoardProps) {
  const {
    players,
    phase,
    cycle,
    activeSide,
    discussionLog,
    deaths,
    status,
    winner,
    mySide,
    myRole,
    knownWerewolves,
    seerMemory,
    legalActions = [],
    isMyTurn = false,
    onSubmitAction,
  } = props;

  const playerList = useMemo(
    () => Object.values(players).sort((a, b) => a.side.localeCompare(b.side)),
    [players],
  );
  const alivePlayers = playerList.filter((p) => p.isAlive);

  const [selectedAction, setSelectedAction] = useState<WerewolfAction["type"] | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<WerewolfRole | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const legalByType = useMemo(() => {
    const m: Record<string, WerewolfAction[]> = {};
    for (const a of legalActions) {
      if (!m[a.type]) m[a.type] = [];
      m[a.type].push(a);
    }
    return m;
  }, [legalActions]);

  const availableActionTypes = useMemo(
    () => Object.keys(legalByType) as WerewolfAction["type"][],
    [legalByType],
  );

  const night = isNight(phase);
  const bgGradient = (() => {
    if (phase === "NIGHT_WOLVES")
      return "linear-gradient(180deg, #0b0724 0%, #1a0d2e 45%, #2a0d24 100%)";
    if (phase === "NIGHT_SEER")
      return "linear-gradient(180deg, #150935 0%, #241042 45%, #3a134f 100%)";
    if (phase === "DAY_DISCUSSION")
      return "linear-gradient(180deg, #2c1a4d 0%, #5d3b2a 55%, #c27040 100%)";
    if (phase === "DAY_VOTE")
      return "linear-gradient(180deg, #2f1632 0%, #6b2733 55%, #b84a32 100%)";
    return "linear-gradient(180deg, #0b0a14 0%, #1d1829 100%)";
  })();

  const submit = (a: WerewolfAction) => {
    onSubmitAction?.(a);
    setSelectedAction(null);
    setSelectedTarget(null);
    setSelectedRole(null);
  };

  const handleConfirm = () => {
    if (!selectedAction) return;
    if (selectedAction === "DAY_PASS") return submit({ type: "DAY_PASS" });
    if (selectedAction === "DAY_CLAIM") {
      if (!selectedRole) return;
      return submit({ type: "DAY_CLAIM", role: selectedRole });
    }
    if (selectedTarget) {
      if (selectedAction === "NIGHT_KILL_VOTE") return submit({ type: "NIGHT_KILL_VOTE", target: selectedTarget });
      if (selectedAction === "SEER_INVESTIGATE") return submit({ type: "SEER_INVESTIGATE", target: selectedTarget });
      if (selectedAction === "DAY_ACCUSE") return submit({ type: "DAY_ACCUSE", target: selectedTarget });
      if (selectedAction === "DAY_DEFEND") return submit({ type: "DAY_DEFEND", target: selectedTarget });
      if (selectedAction === "DAY_VOTE") return submit({ type: "DAY_VOTE", target: selectedTarget });
    }
  };

  const count = playerList.length;
  const myDead = !!(mySide && players[mySide] && !players[mySide].isAlive);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden font-sans"
      style={{
        minHeight: 640,
        background: bgGradient,
        boxShadow: "inset 0 0 120px rgba(0,0,0,0.6), 0 12px 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* Keyframes */}
      <style jsx global>{`
        @keyframes ww-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes ww-fire-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes ww-flame-dance {
          0%, 100% { transform: translate(-50%, -50%) rotate(-3deg) scaleY(1); }
          50% { transform: translate(-50%, -52%) rotate(3deg) scaleY(1.05); }
        }
        @keyframes ww-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.7; }
        }
        @keyframes ww-moon-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ww-sun-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Sky background */}
      {night && <Starfield />}
      <SkyOrb night={night} />

      {/* Tree silhouettes */}
      <TreeSilhouette left="-2%" scale={1.6} />
      <TreeSilhouette left="8%" scale={1.1} flip />
      <TreeSilhouette left="84%" scale={1.4} />
      <TreeSilhouette left="92%" scale={1.0} flip />

      <Fog />

      {/* How-to-play toggle — always visible (live + replay) */}
      <button
        onClick={() => setShowGuide(true)}
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-serif font-semibold transition hover:scale-[1.04]"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(217,119,6,0.95))",
          color: "#1c1917",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 4px 18px rgba(251,191,36,0.45), 0 0 0 2px rgba(0,0,0,0.25)",
        }}
        aria-label="How to play"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9 Q10 6 12 6 Q15 6 15 9 Q15 11 12 12 L12 14" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="0.8" fill="currentColor" />
        </svg>
        How to play
      </button>

      {/* How-to-play modal */}
      {showGuide && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90%] overflow-y-auto rounded-xl text-white/95"
            style={{
              background: "linear-gradient(180deg, #1a0f2e 0%, #0b0714 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-inherit">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif">
                  Spectator guide
                </div>
                <div className="text-xl font-serif italic">How Werewolf is played</div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70"
                aria-label="Close"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6 L18 18 M18 6 L6 18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 text-sm leading-relaxed">
              {/* Objective */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
                  Objective
                </h3>
                <p className="text-white/85">
                  A hidden-role deduction game for <strong>7 players</strong>. Two secret
                  Werewolves hunt the village each night; the rest try to unmask them
                  before they're all eliminated.
                </p>
              </section>

              {/* Roles */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-3">
                  The three roles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(127,29,29,0.25)",
                      border: "1px solid rgba(220,38,38,0.4)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconWolfSvg size={24} color="#f87171" />
                      <div className="font-serif italic text-red-200">
                        Werewolves × 2
                      </div>
                    </div>
                    <div className="text-xs text-white/75">
                      Know each other. Each night they agree on a victim to kill.
                      By day they pretend to be villagers.
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(88,28,135,0.3)",
                      border: "1px solid rgba(167,139,250,0.4)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconSeerSvg size={24} color="#c4b5fd" />
                      <div className="font-serif italic text-violet-200">Seer × 1</div>
                    </div>
                    <div className="text-xs text-white/75">
                      Each night picks one player and learns whether they are a
                      werewolf. Must share info without making themselves a target.
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(146,64,14,0.25)",
                      border: "1px solid rgba(251,191,36,0.35)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconVillagerSvg size={24} color="#fbbf24" />
                      <div className="font-serif italic text-amber-200">
                        Villagers × 4
                      </div>
                    </div>
                    <div className="text-xs text-white/75">
                      No night ability. Must vote wisely by day to lynch werewolves
                      based only on accusations, claims and behaviour.
                    </div>
                  </div>
                </div>
              </section>

              {/* Phases */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-3">
                  A cycle: night → day
                </h3>
                <ol className="space-y-2 text-white/85">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-900/70 text-indigo-200 text-xs font-serif flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <span className="font-serif italic text-indigo-200">
                        Night · Werewolves
                      </span>{" "}
                      — the wolves secretly vote on a victim. Majority decides.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-violet-900/70 text-violet-200 text-xs font-serif flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <span className="font-serif italic text-violet-200">
                        Night · Seer
                      </span>{" "}
                      — the seer investigates one player and learns their alignment
                      (privately).
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-amber-900/70 text-amber-200 text-xs font-serif flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <span className="font-serif italic text-amber-200">
                        Day · Discussion
                      </span>{" "}
                      — night's victim is revealed with their role. Alive players
                      accuse, defend, or claim roles (up to 2 turns each).
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-900/70 text-orange-200 text-xs font-serif flex items-center justify-center">
                      4
                    </span>
                    <div>
                      <span className="font-serif italic text-orange-200">
                        Day · Vote
                      </span>{" "}
                      — alive players vote to lynch. Majority kills; tie = no lynch.
                      A self-vote counts as abstention.
                    </div>
                  </li>
                </ol>
                <p className="text-xs text-white/55 italic mt-2">
                  Up to 6 cycles. If no team has won by then, the match ends in a draw.
                </p>
              </section>

              {/* Win conditions */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
                  Win conditions
                </h3>
                <ul className="space-y-1 text-white/85">
                  <li>
                    <span className="text-amber-200 font-serif italic">Villagers</span>{" "}
                    win when both werewolves are eliminated.
                  </li>
                  <li>
                    <span className="text-red-200 font-serif italic">Werewolves</span>{" "}
                    win when they equal or outnumber the living non-wolves.
                  </li>
                </ul>
              </section>

              {/* UI legend */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-3">
                  Reading the board
                </h3>
                <div className="space-y-2 text-xs text-white/80">
                  <div className="flex items-start gap-3">
                    <IconMaskSvg size={22} color="#c4b5fd" />
                    <div>
                      <strong>Face-down card</strong> — role hidden. All living players
                      show this to spectators until they die.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <IconSkullSvg size={22} color="#fca5a5" />
                    <div>
                      <strong>Skull</strong> — dead. The player's true role is revealed
                      next to their name, along with how they died (night kill vs. lynch).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-[22px] h-[22px] rounded-full bg-amber-300 shrink-0 mt-0.5 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                    <div>
                      <strong>Glowing dot</strong> — the active player right now
                      (whose turn it is to act).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 w-[22px] text-center font-serif text-[10px] text-emerald-300 bg-black/60 px-1 py-0.5 rounded">
                      YOU
                    </div>
                    <div>
                      Your own seat, if you're playing. Your role appears in the left
                      panel (only you can see it).
                    </div>
                  </div>
                  <div>
                    <strong className="text-amber-200">Chronicle</strong> logs every
                    public action: accusations, claims, night deaths, lynches. Night
                    actions themselves (who wolves vote to kill, who the seer investigates)
                    are never shown publicly — only their aftermath.
                  </div>
                </div>
              </section>

              {/* Watch tips */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
                  Tips for spectating
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-white/75">
                  <li>
                    Watch who defends whom — werewolves often protect each other.
                  </li>
                  <li>
                    Someone claiming <em>Seer</em> is either the real seer… or a wolf
                    fishing for targets.
                  </li>
                  <li>
                    Votes cast by already-revealed wolves tell you who they fear.
                  </li>
                  <li>
                    Use the scrub bar below to replay the match step by step.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Winner banner */}
      {status === "finished" && winner && (
        <div className="absolute top-5 right-5 z-20">
          <div
            className="px-4 py-2 rounded-lg font-serif text-sm"
            style={{
              background:
                winner === "WEREWOLVES"
                  ? "linear-gradient(135deg, rgba(127,29,29,0.9), rgba(220,38,38,0.9))"
                  : winner === "VILLAGERS"
                  ? "linear-gradient(135deg, rgba(180,83,9,0.9), rgba(251,191,36,0.9))"
                  : "linear-gradient(135deg, rgba(63,63,70,0.9), rgba(115,115,115,0.9))",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              {winner === "WEREWOLVES" && <IconWolfSvg size={16} color="#fff" />}
              {winner === "DRAW"
                ? "The village endures. Stalemate."
                : winner === "WEREWOLVES"
                ? "The wolves feast tonight"
                : "Dawn brings victory to the village"}
            </span>
          </div>
        </div>
      )}

      {/* Circle of seats */}
      <div className="relative mx-auto" style={{ width: "100%", height: 480 }}>
        <Campfire night={night} />
        {playerList.map((p, i) => {
          const pos = seatPosition(i, count, 190);
          const isActive = activeSide === p.side;
          const isMe = mySide === p.side;
          const revealedAsWolf =
            (knownWerewolves?.includes(p.side) ?? false) && p.isAlive;

          const alive = p.isAlive;
          const clickable =
            !!selectedAction &&
            selectedAction !== "DAY_PASS" &&
            selectedAction !== "DAY_CLAIM" &&
            alive &&
            !!legalByType[selectedAction]?.some(
              (a) => "target" in a && a.target === p.side,
            );

          return (
            <div
              key={p.side}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={pos}
            >
              <PlayerCard
                player={p}
                isActive={isActive}
                isMe={isMe}
                revealedAsWolf={revealedAsWolf}
                clickable={clickable}
                selected={selectedTarget === p.side}
                onClick={() => setSelectedTarget(p.side)}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom panels */}
      <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-3 gap-3 relative z-10">
        {/* Your role */}
        <div
          className="rounded-lg p-3 text-white/95 text-sm"
          style={{
            background: "rgba(10,6,20,0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
            Your card
          </div>
          {myRole ? (
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-16 rounded flex items-center justify-center"
                style={{
                  background: "linear-gradient(160deg, #2a1f3d 0%, #0f0a1e 100%)",
                  border: `2px solid ${ROLE_COLOR[myRole].ring}`,
                  boxShadow: ROLE_COLOR[myRole].glow,
                }}
              >
                <RoleIcon role={myRole} size={30} />
              </div>
              <div>
                <div className="font-serif italic text-lg" style={{ color: ROLE_COLOR[myRole].text }}>
                  {myRole === "WEREWOLF" ? "Werewolf" : myRole === "SEER" ? "Seer" : "Villager"}
                </div>
                <div className="text-[11px] text-white/60 italic">
                  {myRole === "WEREWOLF"
                    ? "Hunt by night, deceive by day."
                    : myRole === "SEER"
                    ? "See the truth beneath the skin."
                    : "Trust, suspect, survive."}
                </div>
              </div>
            </div>
          ) : (
            <div className="opacity-50 italic">Face down</div>
          )}
          {knownWerewolves && knownWerewolves.length > 0 && (
            <div className="text-xs mt-2 pt-2 border-t border-white/10">
              <span className="text-red-300/80 italic">Your pack: </span>
              <span className="text-red-200">
                {knownWerewolves.map((s) => players[s]?.displayName ?? s).join(", ")}
              </span>
            </div>
          )}
          {seerMemory && seerMemory.length > 0 && (
            <div className="text-xs mt-2 pt-2 border-t border-white/10 space-y-0.5">
              <div className="text-violet-300/80 italic mb-1">Visions:</div>
              {seerMemory.map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-white/70">
                    Night {m.cycle} · {m.targetDisplayName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      m.isWerewolf ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {m.isWerewolf ? (
                      <>
                        <IconWolfSvg size={11} color="#fca5a5" /> wolf
                      </>
                    ) : (
                      <>
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-emerald-300"
                          style={{ boxShadow: "0 0 6px rgba(110,231,183,0.7)" }}
                        />
                        innocent
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chronicle (discussion + deaths) */}
        <div
          className="rounded-lg p-3 text-white/90 text-sm max-h-56 overflow-y-auto"
          style={{
            background: "rgba(10,6,20,0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
            Chronicle
          </div>
          {discussionLog.length === 0 && deaths.length === 0 && (
            <div className="opacity-50 text-xs italic font-serif">
              Silence hangs over the village...
            </div>
          )}
          {deaths.map((d, i) => (
            <div
              key={`d${i}`}
              className="text-xs mb-1 py-0.5 px-1.5 rounded"
              style={{
                background:
                  d.cause === "night"
                    ? "rgba(127,29,29,0.25)"
                    : "rgba(180,83,9,0.25)",
              }}
            >
              <span className="opacity-60">Day {d.cycle}</span> ·{" "}
              <span className="font-semibold text-red-200">{d.displayName}</span>{" "}
              <span className="italic">
                ({d.role.toLowerCase()}) —{" "}
                {d.cause === "night" ? "found dead at dawn" : "lynched at dusk"}
              </span>
            </div>
          ))}
          {discussionLog.map((ev, i) => (
            <div key={`l${i}`} className="text-xs mb-0.5 font-serif">
              <span className="opacity-50">C{ev.cycle}</span>{" "}
              <span className="font-semibold text-amber-200">
                {ev.speakerDisplayName}
              </span>{" "}
              {ev.action.type === "DAY_ACCUSE" && (
                <>
                  points at{" "}
                  <span className="text-red-300 italic">
                    {ev.action.targetDisplayName}
                  </span>
                </>
              )}
              {ev.action.type === "DAY_DEFEND" && (
                <>
                  speaks for{" "}
                  <span className="text-emerald-300 italic">
                    {ev.action.targetDisplayName}
                  </span>
                </>
              )}
              {ev.action.type === "DAY_CLAIM" && (
                <>
                  claims to be{" "}
                  <span className="text-violet-300 italic">
                    {ev.action.role.toLowerCase()}
                  </span>
                </>
              )}
              {ev.action.type === "DAY_PASS" && (
                <span className="opacity-60 italic">keeps silent.</span>
              )}
            </div>
          ))}
        </div>

        {/* Action panel */}
        <div
          className="rounded-lg p-3 text-white/95 text-sm"
          style={{
            background: "rgba(10,6,20,0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-serif mb-2">
            Your deed
          </div>
          {myDead ? (
            <div className="text-red-300 text-xs font-serif italic flex items-start gap-2">
              <IconSkullSvg size={14} color="#fca5a5" />
              <span>
                You were{" "}
                {players[mySide!].deathCause === "night"
                  ? "slain in the night"
                  : "hanged at dusk"}
                . Rest now, and watch the tale unfold.
              </span>
            </div>
          ) : !isMyTurn || availableActionTypes.length === 0 ? (
            <div className="opacity-55 text-xs italic font-serif">
              {status === "finished"
                ? "The tale is told."
                : night
                ? "You sleep while others stir..."
                : "The council has not yet called upon you..."}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {availableActionTypes.map((t) => {
                  const { icon, label } = (() => {
                    if (t === "NIGHT_KILL_VOTE") return { icon: <IconActionDagger />, label: "Hunt" };
                    if (t === "SEER_INVESTIGATE") return { icon: <IconActionEye />, label: "Reveal" };
                    if (t === "DAY_ACCUSE") return { icon: <IconActionSwords />, label: "Accuse" };
                    if (t === "DAY_DEFEND") return { icon: <IconActionShield />, label: "Defend" };
                    if (t === "DAY_CLAIM") return { icon: <IconActionScroll />, label: "Claim" };
                    if (t === "DAY_PASS") return { icon: <IconActionMute />, label: "Silent" };
                    if (t === "DAY_VOTE") return { icon: <IconActionBallot />, label: "Vote" };
                    return { icon: null, label: t };
                  })();
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedAction(t);
                        setSelectedTarget(null);
                        setSelectedRole(null);
                      }}
                      className="px-2.5 py-1 rounded text-xs font-serif transition inline-flex items-center gap-1.5"
                      style={{
                        background:
                          selectedAction === t
                            ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                            : "rgba(255,255,255,0.08)",
                        color: selectedAction === t ? "#1c1917" : "#fafaf9",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>

              {selectedAction &&
                selectedAction !== "DAY_PASS" &&
                selectedAction !== "DAY_CLAIM" && (
                  <div className="text-[10px] text-white/50 font-serif italic mt-1">
                    Choose a soul above...
                  </div>
                )}

              {selectedAction === "DAY_CLAIM" && (
                <div className="flex gap-1">
                  {(["VILLAGER", "SEER", "WEREWOLF"] as WerewolfRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRole(r)}
                      className="px-2 py-1 rounded text-xs font-serif inline-flex items-center gap-1.5"
                      style={{
                        background:
                          selectedRole === r
                            ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                            : "rgba(255,255,255,0.08)",
                        color: selectedRole === r ? "#fff" : "#fafaf9",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <RoleIcon role={r} size={14} color={selectedRole === r ? "#fff" : "#e5e7eb"} />
                      {r.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={
                  !selectedAction ||
                  (selectedAction === "DAY_CLAIM" && !selectedRole) ||
                  (selectedAction !== "DAY_PASS" &&
                    selectedAction !== "DAY_CLAIM" &&
                    !selectedTarget)
                }
                className="w-full py-1.5 rounded text-xs font-serif italic transition"
                style={{
                  background:
                    !selectedAction ||
                    (selectedAction === "DAY_CLAIM" && !selectedRole) ||
                    (selectedAction !== "DAY_PASS" &&
                      selectedAction !== "DAY_CLAIM" &&
                      !selectedTarget)
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(135deg, #10b981, #059669)",
                  color:
                    !selectedAction ||
                    (selectedAction === "DAY_CLAIM" && !selectedRole) ||
                    (selectedAction !== "DAY_PASS" &&
                      selectedAction !== "DAY_CLAIM" &&
                      !selectedTarget)
                      ? "rgba(255,255,255,0.3)"
                      : "#ffffff",
                  border: "1px solid rgba(255,255,255,0.15)",
                  letterSpacing: "0.1em",
                }}
              >
                Seal thy deed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
