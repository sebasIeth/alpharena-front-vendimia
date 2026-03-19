"use client";

import React, { useState, useMemo } from "react";

interface ChessBoardProps {
  /** 8x8 grid: 0=empty, 1-6=white (P,N,B,R,Q,K), 7-12=black (p,n,b,r,q,k) */
  board: number[][] | null;
  /** Legal moves in UCI notation, e.g. ["e2e4", "g1f3", "e7e8q"] */
  legalMoves: string[];
  /** "a" = white, "b" = black */
  mySide: "a" | "b" | null;
  /** Whether it's the current player's turn */
  isMyTurn: boolean;
  /** Whether the current player is in check */
  isCheck?: boolean;
  /** Callback when a move is made */
  onMove?: (move: string) => void;
  /** Last move UCI string for arrow/highlight, e.g. "e2e4" */
  lastMove?: string;
}

const GRID = 8;
const FILES = "abcdefgh";

/*
 * Backend board layout:
 *   row 0 = rank 8 (black back rank)
 *   row 7 = rank 1 (white back rank)
 *   col 0 = file a, col 7 = file h
 */

/* ── Coordinate helpers ── */
function fileToCol(file: string): number {
  return FILES.indexOf(file);
}
function colToFile(col: number): string {
  return FILES[col];
}
function rankToRow(rank: string): number {
  return 8 - parseInt(rank, 10); // "8" → 0, "1" → 7
}
function rowToRank(row: number): string {
  return String(8 - row); // 0 → "8", 7 → "1"
}
function squareToCoord(sq: string): [number, number] {
  return [rankToRow(sq[1]), fileToCol(sq[0])];
}
function coordToSquare(row: number, col: number): string {
  return colToFile(col) + rowToRank(row);
}

/* ── Piece ID constants ── */
const WHITE_PAWN = 1;
const BLACK_PAWN = 7;

/* ── Numeric piece → Unicode ── */
const PIECE_CHAR: Record<number, string> = {
  1: "\u2659",  // ♙ white pawn
  2: "\u2658",  // ♘ white knight
  3: "\u2657",  // ♗ white bishop
  4: "\u2656",  // ♖ white rook
  5: "\u2655",  // ♕ white queen
  6: "\u2654",  // ♔ white king
  7: "\u265F",  // ♟ black pawn
  8: "\u265E",  // ♞ black knight
  9: "\u265D",  // ♝ black bishop
  10: "\u265C", // ♜ black rook
  11: "\u265B", // ♛ black queen
  12: "\u265A", // ♚ black king
};

function isWhitePiece(p: number): boolean {
  return p >= 1 && p <= 6;
}
function isBlackPiece(p: number): boolean {
  return p >= 7 && p <= 12;
}
function isOwnPiece(p: number, side: "a" | "b" | null): boolean {
  if (!side || p === 0) return false;
  return side === "a" ? isWhitePiece(p) : isBlackPiece(p);
}
function isPromotionMove(piece: number, toRow: number): boolean {
  // row 0 = rank 8 (white promotes here), row 7 = rank 1 (black promotes here)
  return (piece === WHITE_PAWN && toRow === 0) || (piece === BLACK_PAWN && toRow === 7);
}

/* ── Piece IDs ── */
const WHITE_KING = 6;
const BLACK_KING = 12;

/* ── Colors ── */
const LIGHT_SQ = "#f0d9b5";
const DARK_SQ = "#b58863";
const SELECTED_SQ = "rgba(255, 255, 0, 0.5)";
const CHECK_SQ = "rgba(239, 68, 68, 0.55)";
const LEGAL_DOT = "rgba(91, 79, 207, 0.5)";
const LEGAL_CAPTURE = "rgba(91, 79, 207, 0.35)";
const LAST_MOVE_SQ = "rgba(255, 255, 0, 0.4)";
const ARROW_COLOR = "rgba(0, 150, 50, 0.7)";

export default function ChessBoard({
  board,
  legalMoves,
  mySide,
  isMyTurn,
  isCheck,
  onMove,
  lastMove,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const flipped = mySide === "b";

  // Parse last move for highlighting
  const lastMoveSquares = useMemo(() => {
    if (!lastMove || lastMove.length < 4) return null;
    return { from: lastMove.slice(0, 2), to: lastMove.slice(2, 4) };
  }, [lastMove]);

  // Build lookup: from-square → list of destination suffixes (e.g. "e4", "e8q")
  const movesFromSquare = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const move of legalMoves) {
      const from = move.slice(0, 2);
      const to = move.slice(2);
      if (!map.has(from)) map.set(from, []);
      map.get(from)!.push(to);
    }
    return map;
  }, [legalMoves]);

  // Destination squares for the currently selected piece
  const destinations = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    const dests = movesFromSquare.get(selectedSquare) || [];
    return new Set(dests.map((d) => d.slice(0, 2)));
  }, [selectedSquare, movesFromSquare]);

  // Find the king square for check highlighting
  const myKingSquare = useMemo(() => {
    if (!board || !mySide || !isCheck) return null;
    const kingId = mySide === "a" ? WHITE_KING : BLACK_KING;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (board[r]?.[c] === kingId) return coordToSquare(r, c);
      }
    }
    return null;
  }, [board, mySide, isCheck]);

  // When legalMoves is empty but it's our turn, allow free selection (backend validates)
  const permissive = legalMoves.length === 0;

  const handleClick = (row: number, col: number) => {
    if (!isMyTurn || !onMove || !board) return;

    const sq = coordToSquare(row, col);
    const piece = board[row]?.[col] ?? 0;

    if (selectedSquare) {
      // Deselect
      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      // In permissive mode: any non-own square is a valid destination
      // In normal mode: only legal destinations
      const isValidDest = permissive ? !isOwnPiece(piece, mySide) : destinations.has(sq);

      if (isValidDest) {
        const [fromR, fromC] = squareToCoord(selectedSquare);
        const fromPiece = board[fromR]?.[fromC] ?? 0;
        let moveStr = selectedSquare + sq;

        if (isPromotionMove(fromPiece, row)) {
          const promoMoves = (movesFromSquare.get(selectedSquare) || []).filter(
            (d) => d.startsWith(sq)
          );
          if (promoMoves.length > 0) {
            const queenPromo = promoMoves.find((d) => d.endsWith("q"));
            moveStr = selectedSquare + (queenPromo || promoMoves[0]);
          } else {
            moveStr += "q";
          }
        }

        onMove(moveStr);
        setSelectedSquare(null);
        return;
      }

      // Re-select own piece
      if (isOwnPiece(piece, mySide)) {
        setSelectedSquare(sq);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    // First click — select own piece
    // In permissive mode: any own piece is selectable
    // In normal mode: only pieces with legal moves
    if (isOwnPiece(piece, mySide) && (permissive || movesFromSquare.has(sq))) {
      setSelectedSquare(sq);
    }
  };

  // ── Empty board placeholder ──
  if (!board || board.length === 0) {
    return (
      <div className="relative">
        <div
          className="grid gap-0 rounded-lg overflow-hidden mx-auto"
          style={{
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            maxWidth: "400px",
          }}
        >
          {Array.from({ length: GRID * GRID }).map((_, idx) => {
            const r = Math.floor(idx / GRID);
            const c = idx % GRID;
            return (
              <div
                key={idx}
                className="aspect-square"
                style={{ backgroundColor: (r + c) % 2 === 0 ? LIGHT_SQ : DARK_SQ }}
              />
            );
          })}
        </div>
        <div className="mt-2 text-center text-xs text-arena-muted">
          No board state available
        </div>
      </div>
    );
  }

  // Display order: row 0 = rank 8 (black back rank)
  // White perspective: rank 8 at top → row 0 at top → ascending
  // Black perspective: rank 1 at top → row 7 at top → descending
  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-2">
      <div className="mx-auto" style={{ maxWidth: "420px" }}>
        {/* Column labels (top) */}
        <div className="flex" style={{ paddingLeft: "20px", paddingRight: "20px" }}>
          {cols.map((c) => (
            <div
              key={c}
              className="flex-1 text-center text-[10px] font-mono text-arena-muted pb-0.5"
            >
              {colToFile(c)}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Row labels (left) */}
          <div className="flex flex-col" style={{ width: "20px" }}>
            {rows.map((r) => (
              <div
                key={r}
                className="flex-1 flex items-center justify-center text-[10px] font-mono text-arena-muted"
              >
                {rowToRank(r)}
              </div>
            ))}
          </div>

          {/* Board grid + arrow overlay */}
          <div className="relative flex-1">
            <div
              className="grid gap-0 rounded-md overflow-hidden"
              style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
            >
              {rows.map((r) =>
                cols.map((c) => {
                  const sq = coordToSquare(r, c);
                  const piece = board[r]?.[c] ?? 0;
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = sq === selectedSquare;
                  const isDestination = destinations.has(sq);
                  const isKingInCheck = sq === myKingSquare;
                  const hasPiece = piece !== 0;
                  const clickable =
                    isMyTurn &&
                    onMove &&
                    ((hasPiece && isOwnPiece(piece, mySide) && (permissive || movesFromSquare.has(sq))) ||
                      (selectedSquare && (permissive || isDestination)));

                  const isLastMoveSquare = lastMoveSquares && (sq === lastMoveSquares.from || sq === lastMoveSquares.to);
                  let bgColor = isLight ? LIGHT_SQ : DARK_SQ;
                  if (isLastMoveSquare) bgColor = LAST_MOVE_SQ;
                  if (isKingInCheck) bgColor = CHECK_SQ;
                  if (isSelected) bgColor = SELECTED_SQ;

                  return (
                    <button
                      key={sq}
                      type="button"
                      onClick={() => handleClick(r, c)}
                      className="aspect-square flex items-center justify-center relative"
                      style={{
                        backgroundColor: bgColor,
                        cursor: clickable ? "pointer" : "default",
                      }}
                    >
                      {/* Legal move dot (empty square) */}
                      {isDestination && isMyTurn && !hasPiece && (
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: "28%",
                            height: "28%",
                            backgroundColor: LEGAL_DOT,
                          }}
                        />
                      )}
                      {/* Legal capture ring */}
                      {isDestination && isMyTurn && hasPiece && (
                        <div
                          className="absolute inset-[4%] rounded-full border-[3px]"
                          style={{ borderColor: LEGAL_CAPTURE }}
                        />
                      )}
                      {/* Piece */}
                      {hasPiece && (
                        <span
                          className="text-[clamp(1.5rem,4vw,2.5rem)] leading-none select-none"
                          style={{
                            filter: isWhitePiece(piece)
                              ? "drop-shadow(0 1px 1px rgba(0,0,0,0.3))"
                              : "drop-shadow(0 1px 1px rgba(0,0,0,0.5))",
                          }}
                        >
                          {PIECE_CHAR[piece] || ""}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* SVG Arrow overlay for last move */}
            {lastMoveSquares && (() => {
              const [fromR, fromC] = squareToCoord(lastMoveSquares.from);
              const [toR, toC] = squareToCoord(lastMoveSquares.to);
              // Convert to visual position (account for flipping)
              const visualFromR = flipped ? 7 - fromR : fromR;
              const visualFromC = flipped ? 7 - fromC : fromC;
              const visualToR = flipped ? 7 - toR : toR;
              const visualToC = flipped ? 7 - toC : toC;
              // Center of each square in percentage
              const x1 = (visualFromC + 0.5) * 12.5;
              const y1 = (visualFromR + 0.5) * 12.5;
              const x2 = (visualToC + 0.5) * 12.5;
              const y2 = (visualToR + 0.5) * 12.5;
              // Shorten the arrow so it doesn't overlap piece centers too much
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const shortenFrom = 2;
              const shortenTo = 3.5;
              const sx1 = x1 + (dx / len) * shortenFrom;
              const sy1 = y1 + (dy / len) * shortenFrom;
              const sx2 = x2 - (dx / len) * shortenTo;
              const sy2 = y2 - (dy / len) * shortenTo;

              return (
                <svg
                  key={lastMove}
                  className="absolute inset-0 w-full h-full pointer-events-none rounded-md"
                  viewBox="0 0 100 100"
                  style={{ animation: "chessArrowFadeIn 0.3s ease-out" }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="3.5"
                      markerHeight="3"
                      refX="3"
                      refY="1.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 3.5 1.5, 0 3" fill={ARROW_COLOR} />
                    </marker>
                  </defs>
                  <line
                    x1={sx1} y1={sy1}
                    x2={sx2} y2={sy2}
                    stroke={ARROW_COLOR}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              );
            })()}
          </div>

          {/* Row labels (right) */}
          <div className="flex flex-col" style={{ width: "20px" }}>
            {rows.map((r) => (
              <div
                key={r}
                className="flex-1 flex items-center justify-center text-[10px] font-mono text-arena-muted"
              >
                {rowToRank(r)}
              </div>
            ))}
          </div>
        </div>

        {/* Column labels (bottom) */}
        <div className="flex" style={{ paddingLeft: "20px", paddingRight: "20px" }}>
          {cols.map((c) => (
            <div
              key={c}
              className="flex-1 text-center text-[10px] font-mono text-arena-muted pt-0.5"
            >
              {colToFile(c)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
