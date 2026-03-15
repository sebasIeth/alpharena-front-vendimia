"use client";

import React from "react";

/* ── Sprite mapping ───────────────────────────────────── */
export const SPRITE_KEYS = ["claude", "codex", "deepseek", "gemini", "minimax", "openclaw", "qwen"] as const;
export type AgentSpriteType = (typeof SPRITE_KEYS)[number];

export function getAgentSprite(name: string): string {
  const lower = name.toLowerCase();
  for (const key of SPRITE_KEYS) {
    if (lower.includes(key)) return `/agents/${key}.webp`;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const idx = ((hash % SPRITE_KEYS.length) + SPRITE_KEYS.length) % SPRITE_KEYS.length;
  return `/agents/${SPRITE_KEYS[idx]}.webp`;
}

/* ── Size presets ─────────────────────────────────────── */
const SIZES: Record<string, { box: string; w: number; h: number }> = {
  xs: { box: "w-7 h-7",   w: 28,  h: 28 },
  sm: { box: "w-9 h-9",   w: 36,  h: 36 },
  md: { box: "w-11 h-11", w: 44,  h: 44 },
  lg: { box: "w-14 h-14", w: 56,  h: 56 },
  xl: { box: "w-20 h-20", w: 80,  h: 80 },
};

/* ── AgentAvatar ──────────────────────────────────────── */
interface AgentAvatarProps {
  name: string;
  /** Preset size or tailwind classes (e.g. "w-10 h-10") */
  size?: string;
  rounded?: string;
  shadow?: string;
  /** Set false to show a static frame instead of animating */
  animated?: boolean;
  /** Legacy props — accepted but unused */
  textSize?: string;
  gradient?: string;
  bgColor?: string;
}

export default function AgentAvatar({
  name,
  size = "md",
  rounded = "rounded-xl",
  shadow,
  animated = true,
}: AgentAvatarProps) {
  const sprite = getAgentSprite(name);
  const preset = SIZES[size];
  const boxClass = preset ? preset.box : size;

  return (
    <div
      className={`${boxClass} ${rounded} overflow-hidden shrink-0 agent-sprite`}
      style={{
        backgroundImage: `url('${sprite}')`,
        ...(shadow ? { boxShadow: shadow } : {}),
        ...(!animated ? { animation: "none", backgroundPosition: "0% 0%" } : {}),
      }}
    />
  );
}
