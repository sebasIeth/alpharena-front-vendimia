"use client";

import React from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UnoCardData {
  id: string;
  color: "RED" | "BLUE" | "GREEN" | "YELLOW" | "BLACK";
  type: "NUMBER" | "SKIP" | "REVERSE" | "DRAW_TWO" | "WILD" | "WILD_DRAW_FOUR";
  value: number | null;
}

interface UnoCardProps {
  card: UnoCardData;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  playable?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

// ── Colors ──────────────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, string> = {
  RED: "#E63022",
  BLUE: "#0F6EBD",
  GREEN: "#1A9E4A",
  YELLOW: "#F5C400",
  BLACK: "#1A1A1A",
};

const CARD_GLOW: Record<string, string> = {
  RED: "rgba(230, 48, 34, 0.5)",
  BLUE: "rgba(15, 110, 189, 0.5)",
  GREEN: "rgba(26, 158, 74, 0.5)",
  YELLOW: "rgba(245, 196, 0, 0.5)",
  BLACK: "rgba(100, 100, 100, 0.4)",
};

// ── Sizes ───────────────────────────────────────────────────────────────────

const SIZES = {
  sm: { w: 60, h: 90, font: 22, corner: 10, oval: { rx: 20, ry: 28 } },
  md: { w: 80, h: 120, font: 30, corner: 12, oval: { rx: 26, ry: 36 } },
  lg: { w: 100, h: 150, font: 38, corner: 16, oval: { rx: 32, ry: 44 } },
};

// ── Card Value Display ──────────────────────────────────────────────────────

function getCardLabel(card: UnoCardData): string {
  switch (card.type) {
    case "NUMBER": return String(card.value ?? 0);
    case "SKIP": return "\u{20E0}"; // combining enclosing circle backslash
    case "REVERSE": return "\u21C4"; // rightwards arrow over leftwards
    case "DRAW_TWO": return "+2";
    case "WILD": return "W";
    case "WILD_DRAW_FOUR": return "+4";
    default: return "?";
  }
}

function getCornerLabel(card: UnoCardData): string {
  switch (card.type) {
    case "NUMBER": return String(card.value ?? 0);
    case "SKIP": return "\u20E0";
    case "REVERSE": return "\u21C4";
    case "DRAW_TWO": return "+2";
    case "WILD": return "\u2605";
    case "WILD_DRAW_FOUR": return "+4";
    default: return "?";
  }
}

// ── SVG Symbols ─────────────────────────────────────────────────────────────

function SkipSymbol({ size }: { size: number }) {
  const r = size * 0.35;
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill="none" stroke="white" strokeWidth={r * 0.2} />
      <line x1={-r * 0.7} y1={-r * 0.7} x2={r * 0.7} y2={r * 0.7} stroke="white" strokeWidth={r * 0.2} strokeLinecap="round" />
    </g>
  );
}

function ReverseSymbol({ size }: { size: number }) {
  const s = size * 0.3;
  return (
    <g>
      <path
        d={`M ${-s} ${-s * 0.3} L ${s * 0.3} ${-s * 0.3} L ${s * 0.3} ${-s * 0.7} L ${s} 0 L ${s * 0.3} ${s * 0.7} L ${s * 0.3} ${s * 0.3} L ${-s} ${s * 0.3}`}
        fill="none" stroke="white" strokeWidth={s * 0.15} strokeLinejoin="round" strokeLinecap="round"
      />
      <path
        d={`M ${s} ${s * 0.3} L ${-s * 0.3} ${s * 0.3} L ${-s * 0.3} ${s * 0.7} L ${-s} 0 L ${-s * 0.3} ${-s * 0.7} L ${-s * 0.3} ${-s * 0.3} L ${s} ${-s * 0.3}`}
        fill="none" stroke="white" strokeWidth={s * 0.15} strokeLinejoin="round" strokeLinecap="round"
        transform="rotate(180)"
        opacity={0.6}
      />
    </g>
  );
}

function DrawTwoSymbol({ size }: { size: number }) {
  const w = size * 0.22;
  const h = size * 0.3;
  return (
    <g>
      <rect x={-w - 2} y={-h / 2 - 2} width={w} height={h} rx={2} fill="none" stroke="white" strokeWidth={1.5} />
      <rect x={-w + 4} y={-h / 2 + 4} width={w} height={h} rx={2} fill="none" stroke="white" strokeWidth={1.5} />
      <text x={w * 0.6} y={4} textAnchor="middle" fill="white" fontSize={size * 0.25} fontWeight="bold" fontStyle="italic" fontFamily="Impact, Arial Black, sans-serif">+2</text>
    </g>
  );
}

function WildPinwheel({ size }: { size: number }) {
  const r = size * 0.3;
  const colors = ["#E63022", "#0F6EBD", "#1A9E4A", "#F5C400"];
  return (
    <g>
      {colors.map((color, i) => (
        <path
          key={i}
          d={`M 0 0 L ${r * Math.cos((Math.PI / 2) * i - Math.PI / 4)} ${r * Math.sin((Math.PI / 2) * i - Math.PI / 4)} A ${r} ${r} 0 0 1 ${r * Math.cos((Math.PI / 2) * (i + 1) - Math.PI / 4)} ${r * Math.sin((Math.PI / 2) * (i + 1) - Math.PI / 4)} Z`}
          fill={color}
        />
      ))}
    </g>
  );
}

// ── Card Back ───────────────────────────────────────────────────────────────

function CardBack({ w, h, corner }: { w: number; h: number; corner: number }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Outer card */}
      <rect x={0} y={0} width={w} height={h} rx={corner} fill="#1B2838" />
      {/* White border inset */}
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={corner - 2} fill="none" stroke="white" strokeWidth={1.5} opacity={0.6} />
      {/* Red oval */}
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.3} ry={h * 0.2} fill="#E63022" />
      {/* UNO text */}
      <text
        x={w / 2} y={h / 2 + h * 0.06}
        textAnchor="middle"
        fill="white"
        fontSize={h * 0.13}
        fontWeight="bold"
        fontStyle="italic"
        fontFamily="Impact, Arial Black, sans-serif"
        letterSpacing={1}
      >
        UNO
      </text>
    </svg>
  );
}

// ── Main Card Component ─────────────────────────────────────────────────────

export default function UnoCard({
  card,
  size = "md",
  faceDown = false,
  playable = false,
  dimmed = false,
  onClick,
  style,
  className = "",
}: UnoCardProps) {
  const s = SIZES[size];
  const bg = CARD_COLORS[card.color] || CARD_COLORS.BLACK;
  const glow = CARD_GLOW[card.color] || CARD_GLOW.BLACK;
  const isWild = card.type === "WILD" || card.type === "WILD_DRAW_FOUR";

  if (faceDown) {
    return (
      <div
        className={`inline-block flex-shrink-0 ${className}`}
        style={{
          width: s.w, height: s.h,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          ...style,
        }}
      >
        <CardBack w={s.w} h={s.h} corner={s.corner} />
      </div>
    );
  }

  const label = getCardLabel(card);
  const cornerLabel = getCornerLabel(card);
  const showSymbol = card.type === "SKIP" || card.type === "REVERSE" || card.type === "DRAW_TWO";
  const showPinwheel = isWild;

  return (
    <div
      className={`inline-block flex-shrink-0 transition-all duration-200 ${
        playable
          ? "cursor-pointer hover:-translate-y-2"
          : dimmed
            ? "opacity-50"
            : ""
      } ${className}`}
      style={{
        width: s.w,
        height: s.h,
        filter: playable
          ? `drop-shadow(0 4px 12px ${glow})`
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        ...style,
      }}
      onClick={playable ? onClick : undefined}
    >
      <svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`}>
        {/* Card background */}
        <rect x={0} y={0} width={s.w} height={s.h} rx={s.corner} fill={bg} />

        {/* White border inset */}
        <rect
          x={3} y={3}
          width={s.w - 6} height={s.h - 6}
          rx={s.corner - 2}
          fill="none" stroke="white" strokeWidth={1.5} opacity={0.7}
        />

        {/* Center oval — black, rotated */}
        <ellipse
          cx={s.w / 2} cy={s.h / 2}
          rx={s.oval.rx} ry={s.oval.ry}
          fill={isWild ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.25)"}
          transform={`rotate(-20, ${s.w / 2}, ${s.h / 2})`}
        />

        {/* Center content */}
        <g transform={`translate(${s.w / 2}, ${s.h / 2})`}>
          {showPinwheel ? (
            <>
              <WildPinwheel size={s.font * 1.8} />
              {card.type === "WILD_DRAW_FOUR" && (
                <text
                  y={s.font * 0.15}
                  textAnchor="middle"
                  fill="white"
                  fontSize={s.font * 0.7}
                  fontWeight="bold"
                  fontStyle="italic"
                  fontFamily="Impact, Arial Black, sans-serif"
                  stroke="black" strokeWidth={1.5} paintOrder="stroke"
                >
                  +4
                </text>
              )}
            </>
          ) : showSymbol ? (
            card.type === "SKIP" ? (
              <SkipSymbol size={s.font * 2} />
            ) : card.type === "REVERSE" ? (
              <ReverseSymbol size={s.font * 2} />
            ) : (
              <DrawTwoSymbol size={s.font * 2} />
            )
          ) : (
            <text
              y={s.font * 0.35}
              textAnchor="middle"
              fill="white"
              fontSize={s.font}
              fontWeight="bold"
              fontStyle="italic"
              fontFamily="Impact, Arial Black, sans-serif"
              stroke={bg} strokeWidth={0.5} paintOrder="stroke"
            >
              {label}
            </text>
          )}
        </g>

        {/* Top-left corner */}
        <text
          x={7} y={s.font * 0.55 + 4}
          fill="white"
          fontSize={s.font * 0.4}
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="Impact, Arial Black, sans-serif"
        >
          {cornerLabel}
        </text>

        {/* Bottom-right corner (rotated 180deg) */}
        <text
          x={s.w - 7} y={s.h - 6}
          fill="white"
          fontSize={s.font * 0.4}
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="Impact, Arial Black, sans-serif"
          textAnchor="end"
          transform={`rotate(180, ${s.w - 7}, ${s.h - 6 - s.font * 0.15})`}
        >
          {cornerLabel}
        </text>
      </svg>
    </div>
  );
}

// ── Color Selector ──────────────────────────────────────────────────────────

interface ColorSelectorProps {
  onSelect: (color: "RED" | "BLUE" | "GREEN" | "YELLOW") => void;
}

export function UnoColorSelector({ onSelect }: ColorSelectorProps) {
  const colors: Array<{ value: "RED" | "BLUE" | "GREEN" | "YELLOW"; hex: string }> = [
    { value: "RED", hex: "#E63022" },
    { value: "BLUE", hex: "#0F6EBD" },
    { value: "GREEN", hex: "#1A9E4A" },
    { value: "YELLOW", hex: "#F5C400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
        <p className="text-white text-center text-sm font-medium mb-5">Choose a color</p>
        <div className="flex gap-4">
          {colors.map(({ value, hex }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className="w-16 h-16 rounded-full transition-transform hover:scale-110 active:scale-95 ring-2 ring-white/20 hover:ring-white/60"
              style={{ backgroundColor: hex }}
              title={value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
