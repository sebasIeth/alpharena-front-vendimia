"use client";

import React from "react";

/* ── Sprite mapping ───────────────────────────────────── */
const SPRITE_KEYS = ["claude", "codex", "deepseek", "gemini", "minimax", "openclaw", "qwen"] as const;

function getAgentSprite(name: string): string | null {
  const lower = name.toLowerCase();
  for (const key of SPRITE_KEYS) {
    if (lower.includes(key)) return `/agents/${key}.webp`;
  }
  return null;
}

/* ── AgentAvatar ──────────────────────────────────────── */
interface AgentAvatarProps {
  name: string;
  size?: string;
  textSize?: string;
  gradient?: string;
  rounded?: string;
  shadow?: string;
  /** Solid bg color — used instead of gradient when provided */
  bgColor?: string;
}

export default function AgentAvatar({
  name,
  size = "w-10 h-10",
  textSize = "text-base",
  gradient = "from-arena-primary to-arena-primary-dark",
  rounded = "rounded-xl",
  shadow,
  bgColor,
}: AgentAvatarProps) {
  const sprite = getAgentSprite(name);

  if (sprite) {
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

  // Fallback: letter avatar
  const bgClass = bgColor ? "" : `bg-gradient-to-br ${gradient}`;
  return (
    <div
      className={`${size} ${rounded} ${bgClass} flex items-center justify-center shrink-0 shadow-arena-sm`}
      style={{
        ...(bgColor ? { background: bgColor } : {}),
        ...(shadow ? { boxShadow: shadow } : {}),
      }}
    >
      <span className={`${textSize} font-extrabold text-white drop-shadow-sm`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
