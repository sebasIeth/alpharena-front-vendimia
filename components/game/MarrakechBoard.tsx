"use client";

import React from "react";
import type { BoardState, CarpetCell } from "@/lib/types";
import { getPlayerColor, getPlayerColorName, getDirectionArrow } from "@/lib/utils";

interface MarrakechBoardProps {
  boardState: BoardState | null | undefined;
  size?: number;
}

const GRID_SIZE = 7;

function EmptyBoard() {
  return (
    <div className="relative">
      <div className="grid grid-cols-7 gap-0.5 bg-arena-border/30 p-0.5 rounded-lg">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-square bg-arena-bg/80 rounded-sm flex items-center justify-center"
          >
            <span className="text-[10px] text-arena-muted/30">
              {Math.floor(idx / GRID_SIZE)},{idx % GRID_SIZE}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-arena-muted">
        No board state available
      </div>
    </div>
  );
}

export default function MarrakechBoard({ boardState, size }: MarrakechBoardProps) {
  if (!boardState || !boardState.grid) {
    return <EmptyBoard />;
  }

  const grid = boardState.grid;
  const assam = boardState.assam;
  const players = boardState.players;

  const cellSize = size ? Math.floor(size / GRID_SIZE) : undefined;

  return (
    <div className="space-y-3">
      {/* Board Grid */}
      <div
        className="grid grid-cols-7 gap-0.5 bg-arena-border/30 p-1 rounded-lg mx-auto"
        style={size ? { width: size, height: size } : { maxWidth: "420px" }}
      >
        {Array.from({ length: GRID_SIZE }).map((_, row) =>
          Array.from({ length: GRID_SIZE }).map((_, col) => {
            const cell: CarpetCell | undefined = grid[row]?.[col];
            const isAssam =
              assam && assam.row === row && assam.col === col;
            const playerId = cell?.playerId ?? -2;
            const hasCarpet = playerId >= -1 && playerId !== -2;
            const bgColor =
              hasCarpet && playerId !== -2
                ? getPlayerColor(playerId)
                : "transparent";

            return (
              <div
                key={`${row}-${col}`}
                className="aspect-square rounded-sm flex items-center justify-center relative border border-arena-border/20"
                style={{
                  backgroundColor:
                    hasCarpet && playerId >= 0
                      ? `${bgColor}25`
                      : playerId === -1
                      ? "#94A3B825"
                      : "#16161F",
                  borderColor:
                    hasCarpet && playerId >= 0
                      ? `${bgColor}60`
                      : isAssam
                      ? "#00F0FF"
                      : undefined,
                  borderWidth: isAssam ? "2px" : undefined,
                  width: cellSize ? cellSize : undefined,
                  height: cellSize ? cellSize : undefined,
                }}
              >
                {/* Carpet color indicator */}
                {hasCarpet && playerId >= 0 && (
                  <div
                    className="absolute inset-1 rounded-sm opacity-30"
                    style={{ backgroundColor: bgColor }}
                  />
                )}
                {hasCarpet && playerId === -1 && (
                  <div className="absolute inset-1 rounded-sm opacity-20 bg-gray-500" />
                )}

                {/* Assam indicator */}
                {isAssam ? (
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-arena-primary font-bold text-lg leading-none">
                      {getDirectionArrow(assam.direction)}
                    </span>
                    <span className="text-[8px] text-arena-primary font-medium">A</span>
                  </div>
                ) : (
                  <span className="text-[9px] text-arena-muted/30 relative z-10">
                    {row},{col}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {[0, 1, 2, 3].map((pid) => (
          <div key={pid} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getPlayerColor(pid) }}
            />
            <span className="text-arena-muted">{getPlayerColorName(pid)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-500" />
          <span className="text-arena-muted">Neutralized</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-arena-primary font-bold text-sm leading-none">A</span>
          <span className="text-arena-muted">Assam</span>
        </div>
      </div>

      {/* Player States */}
      {players && players.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-arena-bg rounded-lg p-2 text-center border border-arena-border/50"
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: getPlayerColor(player.id) }}
                />
                <span className="text-xs font-medium text-arena-text">
                  {getPlayerColorName(player.id)}
                </span>
              </div>
              <div className="text-[10px] text-arena-muted">
                <span className="text-arena-primary font-medium">{player.coins}</span> coins
                {" | "}
                <span className="text-arena-primary font-medium">{player.carpetsRemaining}</span> carpets
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
