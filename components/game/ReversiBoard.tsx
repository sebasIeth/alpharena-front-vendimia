"use client";

import React from "react";

interface ReversiBoardProps {
  /** 8x8 grid: 0 = empty, 1 = black, 2 = white */
  board: number[][] | null;
  /** List of legal moves as [row, col] pairs */
  legalMoves: [number, number][];
  /** Which side the current player is: "a" = black, "b" = white */
  mySide: "a" | "b" | null;
  /** Whether it's the current player's turn */
  isMyTurn: boolean;
  /** Callback when a cell is clicked */
  onCellClick?: (row: number, col: number) => void;
}

const GRID = 8;

function countPieces(board: number[][]) {
  let black = 0;
  let white = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === 2) white++;
    }
  }
  return { black, white };
}

export default function ReversiBoard({
  board,
  legalMoves,
  mySide,
  isMyTurn,
  onCellClick,
}: ReversiBoardProps) {
  if (!board || board.length === 0) {
    return (
      <div className="relative">
        <div
          className="grid gap-0.5 rounded-lg p-1"
          style={{
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            backgroundColor: "#2d6a4f",
          }}
        >
          {Array.from({ length: GRID * GRID }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-sm"
              style={{ backgroundColor: "#40916c" }}
            />
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-arena-muted">
          No board state available
        </div>
      </div>
    );
  }

  const legalSet = new Set(legalMoves.map(([r, c]) => `${r},${c}`));
  const { black, white } = countPieces(board);

  return (
    <div className="space-y-3">
      {/* Board */}
      <div
        className="grid gap-px rounded-lg p-1 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          backgroundColor: "#1b4332",
          maxWidth: "400px",
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isLegal = legalSet.has(key);
            const clickable = isMyTurn && isLegal && onCellClick;

            return (
              <button
                key={key}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onCellClick(r, c)}
                className="aspect-square flex items-center justify-center relative transition-colors"
                style={{
                  backgroundColor: "#40916c",
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                {/* Piece */}
                {cell === 1 && (
                  <div
                    className="w-[80%] h-[80%] rounded-full shadow-md"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #555, #111)",
                    }}
                  />
                )}
                {cell === 2 && (
                  <div
                    className="w-[80%] h-[80%] rounded-full shadow-md"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #fff, #ccc)",
                    }}
                  />
                )}
                {/* Legal move indicator */}
                {cell === 0 && isLegal && isMyTurn && (
                  <div className="w-[30%] h-[30%] rounded-full bg-arena-primary/60 animate-pulse" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full shadow-sm"
            style={{
              background: "radial-gradient(circle at 35% 35%, #555, #111)",
            }}
          />
          <span className={`font-mono font-bold tabular-nums ${mySide === "a" ? "text-arena-primary" : "text-arena-text"}`}>
            {black}
          </span>
          {mySide === "a" && (
            <span className="text-[10px] text-arena-primary uppercase tracking-wider font-semibold">YOU</span>
          )}
        </div>
        <div className="text-arena-muted font-mono text-xs">vs</div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full shadow-sm"
            style={{
              background: "radial-gradient(circle at 35% 35%, #fff, #ccc)",
            }}
          />
          <span className={`font-mono font-bold tabular-nums ${mySide === "b" ? "text-arena-primary" : "text-arena-text"}`}>
            {white}
          </span>
          {mySide === "b" && (
            <span className="text-[10px] text-arena-primary uppercase tracking-wider font-semibold">YOU</span>
          )}
        </div>
      </div>
    </div>
  );
}
