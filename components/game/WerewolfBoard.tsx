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

function IconWolfSvg({ size = 32, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Head */}
      <path
        d="M24 42 C14 42 8 35 8 25 L6 18 L10 20 L13 14 L16 19 L20 14 L22 19 L26 14 L28 19 L32 14 L35 19 L38 14 L42 20 L40 25 C40 35 34 42 24 42 Z"
        fill={color}
      />
      {/* Ears */}
      <path d="M10 20 L8 10 L14 16 Z" fill={color} />
      <path d="M38 20 L40 10 L34 16 Z" fill={color} />
      {/* Eyes */}
      <circle cx="18" cy="26" r="2" fill="#fbbf24" />
      <circle cx="30" cy="26" r="2" fill="#fbbf24" />
      {/* Snout */}
      <path d="M22 33 L26 33 L25 36 Q24 37 23 36 Z" fill="#000" opacity={0.55} />
      {/* Fangs */}
      <path d="M22 36 L22.8 39 L23.4 36 Z" fill="#fff" opacity={0.85} />
      <path d="M26 36 L25.2 39 L24.6 36 Z" fill="#fff" opacity={0.85} />
    </svg>
  );
}

function IconSeerSvg({ size = 32, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Eye outer */}
      <path
        d="M4 24 Q24 6 44 24 Q24 42 4 24 Z"
        stroke={color}
        strokeWidth="2.5"
        fill={color}
        fillOpacity="0.2"
      />
      {/* Iris */}
      <circle cx="24" cy="24" r="8" fill={color} />
      {/* Pupil */}
      <circle cx="24" cy="24" r="3.5" fill="#1e1b4b" />
      {/* Highlight */}
      <circle cx="26" cy="22" r="1.5" fill="#fff" />
      {/* Sparkles */}
      <path d="M8 10 L9 13 L12 14 L9 15 L8 18 L7 15 L4 14 L7 13 Z" fill={color} opacity={0.8} />
      <path d="M40 32 L40.7 34 L43 34.7 L40.7 35.4 L40 37.6 L39.3 35.4 L37 34.7 L39.3 34 Z" fill={color} opacity={0.7} />
    </svg>
  );
}

function IconVillagerSvg({ size = 32, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Hood */}
      <path
        d="M12 18 Q12 8 24 8 Q36 8 36 18 L34 24 L14 24 Z"
        fill={color}
        opacity={0.9}
      />
      {/* Head */}
      <circle cx="24" cy="22" r="8" fill="#f5deb3" />
      {/* Hood shadow over face */}
      <path d="M14 22 Q24 18 34 22 L34 20 Q24 14 14 20 Z" fill={color} opacity={0.35} />
      {/* Beard */}
      <path d="M18 27 Q24 34 30 27 Q27 32 24 32 Q21 32 18 27 Z" fill="#8b6f47" opacity={0.8} />
      {/* Tunic shoulders */}
      <path d="M6 46 L10 32 L16 30 L24 34 L32 30 L38 32 L42 46 Z" fill={color} opacity={0.85} />
      {/* Rope belt */}
      <path d="M10 40 L38 40" stroke="#78350f" strokeWidth="1.5" opacity={0.7} />
    </svg>
  );
}

function IconMaskSvg({ size = 32, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Mask */}
      <path
        d="M10 18 Q10 10 24 10 Q38 10 38 18 L38 28 Q38 36 24 38 Q10 36 10 28 Z"
        fill={color}
        opacity={0.85}
      />
      {/* Eye holes */}
      <ellipse cx="18" cy="22" rx="3" ry="2" fill="#0a0714" />
      <ellipse cx="30" cy="22" rx="3" ry="2" fill="#0a0714" />
      {/* Mouth slit */}
      <path d="M18 30 Q24 32 30 30" stroke="#0a0714" strokeWidth="1.5" fill="none" />
      {/* Decorative dot */}
      <circle cx="24" cy="15" r="1" fill="#fbbf24" />
    </svg>
  );
}

function IconSkullSvg({ size = 32, color = "#fca5a5" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Skull */}
      <path
        d="M10 22 Q10 10 24 10 Q38 10 38 22 L38 30 L32 30 L32 36 L28 36 L28 32 L20 32 L20 36 L16 36 L16 30 L10 30 Z"
        fill={color}
      />
      {/* Eye sockets */}
      <ellipse cx="18" cy="22" rx="3.5" ry="4" fill="#0a0714" />
      <ellipse cx="30" cy="22" rx="3.5" ry="4" fill="#0a0714" />
      {/* Nose */}
      <path d="M22 26 L24 30 L26 26 Z" fill="#0a0714" />
      {/* Teeth */}
      <path d="M18 30 L18 34 L20 32 L22 34 L24 32 L26 34 L28 32 L30 34 L30 30 Z" fill="#0a0714" opacity={0.75} />
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
