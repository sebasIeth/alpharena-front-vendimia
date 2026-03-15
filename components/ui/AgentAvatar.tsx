"use client";

import React from "react";

/* ── Sprite mapping ───────────────────────────────────── */
const SPRITE_KEYS = ["claude", "codex", "deepseek", "gemini", "minimax", "openclaw", "qwen"] as const;

function getAgentSprite(name: string): string {
  const lower = name.toLowerCase();
  // Exact model match first
  for (const key of SPRITE_KEYS) {
    if (lower.includes(key)) return `/agents/${key}.webp`;
  }
  // Deterministic assignment based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const idx = ((hash % SPRITE_KEYS.length) + SPRITE_KEYS.length) % SPRITE_KEYS.length;
  return `/agents/${SPRITE_KEYS[idx]}.webp`;
}

/* ── AgentAvatar ──────────────────────────────────────── */
interface AgentAvatarProps {
  name: string;
  size?: string;
  rounded?: string;
  shadow?: string;
  /** Unused legacy props — kept for drop-in compat */
  textSize?: string;
  gradient?: string;
  bgColor?: string;
}

export default function AgentAvatar({
  name,
  size = "w-10 h-10",
  rounded = "rounded-xl",
  shadow,
}: AgentAvatarProps) {
  const sprite = getAgentSprite(name);

  return (
    <div
      className={`${size} ${rounded} overflow-hidden shrink-0 bg-arena-bg-light`}
      style={shadow ? { boxShadow: shadow } : undefined}
    >
      <img
        src={sprite}
        alt={name}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
