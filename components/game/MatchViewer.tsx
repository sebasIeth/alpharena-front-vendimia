"use client";

import React, { useEffect, useState, useRef } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import type { Match, Move, BoardState, AssamPosition, PlayerState, DiceResult, TributeEvent, GamePhase } from "@/lib/types";
import MarrakechBoard from "./MarrakechBoard";
import ChessBoard from "./ChessBoard";
import ReversiBoard from "./ReversiBoard";
import PokerBoard from "./PokerBoard";
import type { PokerCard } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import { formatDate, formatRelativeTime, normalizeMatchAgents } from "@/lib/utils";

interface MatchViewerProps {
  match: Match;
  onMatchUpdate?: (match: Match) => void;
}

interface AgentThought {
  agentId: string;
  agentName: string;
  side: string;
  text: string;
  timestamp: number;
  turnNumber?: number;
}

const SIDE_COLORS: Record<string, string> = {
  a: "#EF4444",
  b: "#3B82F6",
  c: "#10B981",
  d: "#8B5CF6",
};

// Normalize direction from various formats
function normalizeDirection(dir: any): "N" | "S" | "E" | "W" {
  if (typeof dir === "number") {
    return (["N", "E", "S", "W"] as const)[dir % 4] || "N";
  }
  const s = String(dir || "").toUpperCase();
  if (s === "N" || s === "NORTH" || s === "UP") return "N";
  if (s === "S" || s === "SOUTH" || s === "DOWN") return "S";
  if (s === "E" || s === "EAST" || s === "RIGHT") return "E";
  if (s === "W" || s === "WEST" || s === "LEFT") return "W";
  return "N";
}

function parseAssamCandidate(c: any): AssamPosition | null {
  if (!c || typeof c !== "object") return null;
  const row = c.row ?? c.y ?? c.position?.row ?? c.position?.y;
  const col = c.col ?? c.x ?? c.position?.col ?? c.position?.x;
  if (row == null || col == null) return null;
  const dir = c.direction ?? c.dir ?? c.facing ?? c.orientation;
  return { row: Number(row), col: Number(col), direction: normalizeDirection(dir) };
}

function extractAssam(data: any): AssamPosition | null {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.assam, data.assamPosition, data.assam_position,
    data.gameState?.assam, data.state?.assam,
    data.boardState?.assam, data.currentBoard?.assam, data.game?.assam,
  ];
  for (const c of candidates) {
    const parsed = parseAssamCandidate(c);
    if (parsed) return parsed;
  }
  return null;
}

function extractAssamFromMove(moveData: Record<string, unknown>): AssamPosition | null {
  const md = moveData as any;
  const action = md?.action && typeof md.action === "object" ? md.action : null;
  let parsedRaw: any = null;
  if (md?.raw && typeof md.raw === "string") {
    try { parsedRaw = JSON.parse(md.raw); } catch { /* ignore */ }
  }
  const candidates = [
    md?.assam, md?.assamPosition, md?.assam_position, md?.newAssamPosition,
    md?.result?.assam, md?.result?.assamPosition,
    action?.assam, action?.assamPosition,
    parsedRaw?.assam, parsedRaw?.assamPosition,
  ];
  for (const c of candidates) {
    const parsed = parseAssamCandidate(c);
    if (parsed) return parsed;
  }
  return null;
}

// Phase badge labels/colors
const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  roll: { label: "ROLL", color: "#F59E0B" },
  tribute: { label: "PAY", color: "#EF4444" },
  place: { label: "PLACE", color: "#10B981" },
};

// moveData from backend — now includes phase, diceResult, tribute, etc.
function formatMoveDisplay(
  moveData: Record<string, unknown>,
  gameType?: string,
): { text: string; phase?: string } {
  const md = moveData as any;

  // Chess: show UCI move notation
  if (gameType === "chess") {
    const move = md.move || md.uci || md.san || md.notation;
    if (typeof move === "string") return { text: move };
    // Try to extract from raw JSON
    if (md.raw && typeof md.raw === "string") {
      try {
        const parsed = JSON.parse(md.raw);
        if (parsed.move) return { text: parsed.move };
      } catch { /* ignore */ }
    }
    // Fallback: array [from, to]
    if (Array.isArray(md)) return { text: md.join("") };
  }

  // Poker: show action + amount
  if (gameType === "poker") {
    const action = md.pokerAction || md.action || md.moveData?.pokerAction;
    if (action) {
      const type = typeof action === "string" ? action : action.type || action;
      const amount = typeof action === "object" ? action.amount : md.amount;
      return { text: amount != null ? `${type} (${amount})` : String(type) };
    }
    return { text: "action" };
  }

  // Reversi: show [row, col]
  if (gameType === "reversi") {
    const move = md.move || md;
    if (Array.isArray(move) && move.length === 2) return { text: `(${move[0]}, ${move[1]})` };
    if (md.row != null && md.col != null) return { text: `(${md.row}, ${md.col})` };
  }

  // New rich format: check phase first
  if (md.phase === "roll" && md.diceResult) {
    const dr = md.diceResult;
    const val = dr.value ?? dr;
    const pos = md.assam || md.assamPosition;
    const posStr = pos ? ` → (${pos.row ?? pos.y},${pos.col ?? pos.x})` : "";
    return { text: `Rolled ${val}${posStr}`, phase: "roll" };
  }
  if (md.phase === "tribute" && md.tribute) {
    return { text: `Tribute: ${md.tribute.amount} dirhams`, phase: "tribute" };
  }
  if (md.phase === "place" && md.move) {
    const m = md.move;
    return { text: `Carpet at (${m.row ?? m.y}, ${m.col ?? m.x})`, phase: "place" };
  }

  // Legacy: simple {row, col} carpet placement
  if (md.row != null && md.col != null && Object.keys(md).length <= 3) {
    return { text: `Carpet at (${md.row}, ${md.col})` };
  }
  // Fallback: show cleaned JSON
  const cleaned = { ...md };
  delete cleaned.thinking;
  delete cleaned.raw;
  const json = JSON.stringify(cleaned);
  return { text: json.length > 60 ? json.slice(0, 57) + "..." : json };
}

// Extract board from various response formats
function extractBoard(data: any): any[] | null {
  if (!data) return null;
  // data is already a board array (e.g. number[][] for chess/reversi)
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) return data;
  // data is an object with a board inside
  const raw = data?.boardState || data?.currentBoard || data?.board || data?.grid;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (raw.grid && Array.isArray(raw.grid)) return raw.grid;
  const values = Object.values(raw);
  if (values.length === 7 && Array.isArray(values[0])) return values as any[];
  return null;
}

export default function MatchViewer({ match, onMatchUpdate }: MatchViewerProps) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<BoardState | null | undefined>(
    match.boardState || (match as any).currentBoard
  );
  const [currentAssam, setCurrentAssam] = useState<AssamPosition | null>(
    extractAssam(match.boardState) || extractAssam(match) || null
  );
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [thinkingSide, setThinkingSide] = useState<string | null>(null);
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase | null>(null);
  const [tribute, setTribute] = useState<TributeEvent | null>(null);
  const [playerStates, setPlayerStates] = useState<PlayerState[] | null>(null);
  const [score, setScore] = useState<Record<string, number> | null>(null);
  // Poker-specific state
  const [pokerCommunityCards, setPokerCommunityCards] = useState<PokerCard[]>([]);
  const [pokerPot, setPokerPot] = useState(0);
  const [pokerStreet, setPokerStreet] = useState("preflop");
  const [pokerHandNumber, setPokerHandNumber] = useState(0);
  const [pokerStacks, setPokerStacks] = useState<{ a: number; b: number }>({ a: 0, b: 0 });
  const [pokerActionHistory, setPokerActionHistory] = useState<{ type: string; amount?: number; playerSide: string; street: string }[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const matchId = match.id || (match as any)._id;

  // Normalize agents: backend sends {a: {...}, b: {...}} not array
  const agents = React.useMemo(() => normalizeMatchAgents(match.agents), [match.agents]);

  // pot: backend sends "potAmount" not "pot"
  const pot = match.pot ?? (match as any).potAmount ?? 0;

  // Build agentId -> { name, side } lookup
  const agentLookup = React.useMemo(() => {
    const map = new Map<string, { name: string; side: string }>();
    agents.forEach((a, idx) => {
      const side = ["a", "b", "c", "d"][idx] || String(idx);
      map.set(a.agentId, { name: a.agentName, side });
    });
    return map;
  }, [agents]);

  // Stable refs for socket callbacks (avoid reconnection loops)
  const agentLookupRef = useRef(agentLookup);
  agentLookupRef.current = agentLookup;
  const onMatchUpdateRef = useRef(onMatchUpdate);
  onMatchUpdateRef.current = onMatchUpdate;

  // Fetch moves + extract initial thoughts
  useEffect(() => {
    async function fetchMoves() {
      if (!matchId) return;
      try {
        const data = await api.getMatchMoves(matchId);
        const fetchedMoves = data?.moves || [];
        setMoves(fetchedMoves);

        const initialThoughts: AgentThought[] = [];
        for (const move of fetchedMoves) {
          const md = move.moveData as any;
          const thinking = md?.thinking || md?.raw;
          if (thinking) {
            const info = agentLookupRef.current.get(move.agentId);
            initialThoughts.push({
              agentId: move.agentId,
              agentName: info?.name || "Agent",
              side: info?.side || "a",
              text: thinking,
              timestamp: new Date(move.timestamp).getTime() || Date.now(),
              turnNumber: move.turnNumber,
            });
          }
        }
        if (initialThoughts.length > 0) {
          setThoughts(initialThoughts);
        }

        // Try to extract assam from the latest move
        if (fetchedMoves.length > 0) {
          const lastMove = fetchedMoves[fetchedMoves.length - 1];
          const assamFromMove = extractAssamFromMove(lastMove.moveData);
          if (assamFromMove) {
            setCurrentAssam((prev) => prev || assamFromMove);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingMoves(false);
      }
    }
    fetchMoves();
  }, [matchId]);

  // Socket.IO for live updates
  useEffect(() => {
    if (match.status !== "active" || !matchId) return;

    setWsStatus("connecting");
    const socket = api.connectMatchSocket(matchId);
    if (!socket) {
      setWsStatus("disconnected");
      return;
    }

    socketRef.current = socket;

    socket.on("connect", () => setWsStatus("connected"));
    socket.on("disconnect", () => setWsStatus("disconnected"));
    socket.on("connect_error", () => setWsStatus("disconnected"));

    socket.onAny((eventName: string, raw: any) => {
      if (eventName !== "message") return;
      const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      const type = msg?.type;
      const data = msg?.data;
      if (!type || !data) return;

      if (type === "match:start") {
        const grid = extractBoard(data);
        if (grid) setCurrentBoard({ grid } as any);
        const assam = extractAssam(data);
        if (assam) setCurrentAssam(assam);
        if (data.players && Array.isArray(data.players)) {
          setPlayerStates(data.players.map((p: any) => ({
            id: p.id,
            coins: p.dirhams ?? p.coins ?? 0,
            carpetsRemaining: p.carpetsRemaining ?? 0,
            dirhams: p.dirhams ?? p.coins,
            name: p.name,
            eliminated: p.eliminated,
          })));
        }
        // Poker
        if (data.pokerPlayerStacks) setPokerStacks(data.pokerPlayerStacks);
        if (data.pokerHandNumber != null) setPokerHandNumber(data.pokerHandNumber);
      }

      if (type === "match:move" || type === "match:state") {
        const grid = extractBoard(data);
        if (grid) {
          setCurrentBoard({ grid } as any);
        }
        const assam = extractAssam(data);
        if (assam) {
          setCurrentAssam(assam);
        } else {
          const fromMove = extractAssamFromMove(data);
          if (fromMove) setCurrentAssam(fromMove);
        }
        if (type === "match:move") setThinkingSide(null);

        // Rich game data
        if (data.diceResult) setDiceResult(data.diceResult);
        if (data.phase) setGamePhase(data.phase);
        if (data.tribute) {
          setTribute(data.tribute);
          setTimeout(() => setTribute(null), 3000);
        }
        if (data.players && Array.isArray(data.players)) {
          setPlayerStates(data.players.map((p: any) => ({
            id: p.id,
            coins: p.dirhams ?? p.coins ?? 0,
            carpetsRemaining: p.carpetsRemaining ?? 0,
            dirhams: p.dirhams ?? p.coins,
            name: p.name,
            eliminated: p.eliminated,
          })));
        }
        if (data.score) setScore(data.score);
        // Poker-specific
        if (data.pokerCommunityCards) setPokerCommunityCards(data.pokerCommunityCards);
        if (data.pokerPot != null) setPokerPot(data.pokerPot);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet);
        if (data.pokerPlayerStacks) setPokerStacks(data.pokerPlayerStacks);
        if (data.pokerHandNumber != null) setPokerHandNumber(data.pokerHandNumber);
        if (data.pokerAction) {
          setPokerActionHistory((prev) => [
            ...prev,
            {
              type: data.pokerAction.type,
              amount: data.pokerAction.amount,
              playerSide: data.side,
              street: data.pokerStreet || pokerStreet,
            },
          ]);
        }
      }

      if (type === "agent:thinking") {
        const { agentId, side, raw: rawText, moveNumber } = data;
        const info = agentLookupRef.current.get(agentId);

        let displayText = "";
        try {
          const parsed = JSON.parse(rawText);
          displayText = parsed.thinking || "";
        } catch {
          displayText = rawText || "";
          const jsonIdx = displayText.indexOf("\n{");
          if (jsonIdx > 0) {
            displayText = displayText.slice(0, jsonIdx).trim();
          }
        }

        setThinkingSide(side || info?.side || null);
        setThoughts((prev) => {
          const exists = prev.some(
            (t) => t.turnNumber === moveNumber && t.agentId === agentId
          );
          if (exists) return prev;
          return [
            ...prev,
            {
              agentId,
              agentName: info?.name || "Agent",
              side: side || info?.side || "a",
              text: displayText || `(move #${moveNumber})`,
              timestamp: Date.now(),
              turnNumber: moveNumber,
            },
          ];
        });
      }

      if (type === "match:end") {
        onMatchUpdateRef.current?.(data);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, match.status]);

  // Polling fallback: re-fetch match + moves while active
  // Uses 8s interval with backoff on 429 to avoid rate limiting
  useEffect(() => {
    if (match.status !== "active" || !matchId) return;

    let interval = 8000;
    const schedule = () => {
      pollRef.current = setTimeout(async () => {
        try {
          const [matchRes, movesRes] = await Promise.allSettled([
            api.getMatch(matchId),
            api.getMatchMoves(matchId),
          ]);

          // Check for 429 — back off if rate limited
          const got429 = [matchRes, movesRes].some(
            (r) => r.status === "rejected" && String(r.reason).includes("429")
          );
          if (got429) {
            interval = Math.min(interval * 2, 30000);
          } else {
            interval = 8000;
          }

          if (matchRes.status === "fulfilled") {
            const updated = matchRes.value.match;
            if (updated) {
              const grid = extractBoard(updated);
              if (grid) {
                setCurrentBoard({ grid } as any);
              } else {
                const rawBoard = updated.boardState || (updated as any).currentBoard;
                if (rawBoard) setCurrentBoard(rawBoard);
              }
              const assam = extractAssam(updated);
              if (assam) setCurrentAssam(assam);

              onMatchUpdateRef.current?.({ ...updated, id: updated.id || (updated as any)._id });
            }
          }

          if (movesRes.status === "fulfilled") {
            const newMoves = movesRes.value?.moves || [];
            setMoves((prev) => {
              if (!newMoves.length || newMoves.length <= prev.length) return prev;

              const newOnes = newMoves.slice(prev.length);
              for (const move of newOnes) {
                const md = move.moveData as any;
                const thinking = md?.thinking || md?.raw;
                if (thinking) {
                  const info = agentLookupRef.current.get(move.agentId);
                  setThoughts((prevThoughts) => {
                    const exists = prevThoughts.some(
                      (t) => t.turnNumber === move.turnNumber && t.agentId === move.agentId
                    );
                    if (exists) return prevThoughts;
                    return [
                      ...prevThoughts,
                      {
                        agentId: move.agentId,
                        agentName: info?.name || "Agent",
                        side: info?.side || "a",
                        text: thinking,
                        timestamp: new Date(move.timestamp).getTime() || Date.now(),
                        turnNumber: move.turnNumber,
                      },
                    ];
                  });
                }
              }

              // Extract assam from latest move
              const lastMove = newMoves[newMoves.length - 1];
              if (lastMove) {
                const assamFromMove = extractAssamFromMove(lastMove.moveData);
                if (assamFromMove) setCurrentAssam(assamFromMove);
              }

              return newMoves;
            });
          }
        } catch {
          // silently fail — next poll will retry
          interval = Math.min(interval * 2, 30000);
        }
        schedule();
      }, interval);
    };
    schedule();

    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.status, matchId]);

  // Auto-scroll within containers only (don't jump the whole page)
  useEffect(() => {
    const el = movesEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves]);

  useEffect(() => {
    const el = thoughtsEndRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thoughts]);

  return (
    <div className="space-y-6">
      {/* Main grid: Board + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Board Area */}
        <div className="lg:col-span-2">
          <div className="bg-arena-card border border-arena-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-arena-text">Board</h3>
              <div className="flex items-center gap-2">
                <Badge status={match.status} />
                {match.status === "active" && (
                  <span className="flex items-center gap-1 text-xs text-arena-success">
                    <span className="w-2 h-2 bg-arena-success rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
            {match.gameType === "chess" ? (
              <ChessBoard
                board={extractBoard(currentBoard || match.boardState || (match as any).currentBoard) as number[][] | null}
                legalMoves={[]}
                mySide={null}
                isMyTurn={false}
              />
            ) : match.gameType === "reversi" ? (
              <ReversiBoard
                board={extractBoard(currentBoard || match.boardState || (match as any).currentBoard) as number[][] | null}
                legalMoves={[]}
                mySide={null}
                isMyTurn={false}
              />
            ) : match.gameType === "poker" ? (
              <PokerBoard
                communityCards={pokerCommunityCards}
                pot={pokerPot}
                street={pokerStreet}
                handNumber={pokerHandNumber}
                playerA={{
                  name: agents[0]?.agentName ?? "Player A",
                  stack: pokerStacks.a,
                  currentBet: 0,
                  hasFolded: false,
                  isAllIn: false,
                  isDealer: false,
                }}
                playerB={{
                  name: agents[1]?.agentName ?? "Player B",
                  stack: pokerStacks.b,
                  currentBet: 0,
                  hasFolded: false,
                  isAllIn: false,
                  isDealer: false,
                }}
                actionHistory={pokerActionHistory}
              />
            ) : (
              <MarrakechBoard
                boardState={
                  playerStates
                    ? { ...(currentBoard || match.boardState || {}), players: playerStates } as BoardState
                    : currentBoard || match.boardState
                }
                assamOverride={currentAssam}
                playerCount={agents.length || 2}
              />
            )}

            {/* Game Status Bar (Marrakech-specific) */}
            {match.gameType !== "chess" && match.gameType !== "reversi" && (gamePhase || diceResult || tribute || score) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 bg-arena-bg rounded-lg px-4 py-2.5">
                {/* Phase badge */}
                {gamePhase && (
                  <span
                    className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${PHASE_CONFIG[gamePhase]?.color || "#6B7280"}20`,
                      color: PHASE_CONFIG[gamePhase]?.color || "#6B7280",
                    }}
                  >
                    {gamePhase === "roll" ? "Rolling" : gamePhase === "tribute" ? "Tribute" : "Placing Carpet"}
                  </span>
                )}

                {/* Dice result */}
                {diceResult && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-arena-muted text-xs">Dice:</span>
                    <span className="text-xl font-bold text-arena-text">{diceResult.value}</span>
                    {diceResult.faces && diceResult.faces.length > 0 && (
                      <span className="text-[10px] text-arena-muted">
                        [{diceResult.faces.join(",")}]
                      </span>
                    )}
                  </div>
                )}

                {/* Tribute event */}
                {tribute && (
                  <span className="text-xs font-medium text-red-400 animate-pulse">
                    {agents[tribute.fromPlayerId]?.agentName || `Player ${tribute.fromPlayerId}`}
                    {" pays "}
                    <span className="font-bold">{tribute.amount}</span>
                    {" to "}
                    {agents[tribute.toPlayerId]?.agentName || `Player ${tribute.toPlayerId}`}
                  </span>
                )}

                {/* Score */}
                {score && (
                  <div className="flex items-center gap-2 ml-auto">
                    {Object.entries(score).map(([key, value]) => {
                      const idx = parseInt(key, 10);
                      const side = ["a", "b", "c", "d"][isNaN(idx) ? 0 : idx] || key;
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                          />
                          <span className="text-xs font-bold text-arena-text">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Match Info Below Board */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Turn</div>
                <div className="text-arena-text font-medium">
                  {match.currentTurn ?? "-"}
                </div>
                {gamePhase && (
                  <div className="text-[10px] text-arena-muted capitalize mt-0.5">{gamePhase}</div>
                )}
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Moves</div>
                <div className="text-arena-text font-medium">
                  {moves.length || match.moveCount || 0}
                </div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Stake</div>
                <div className="text-arena-primary font-medium">
                  {match.stakeAmount}
                </div>
              </div>
              <div className="bg-arena-bg rounded-lg p-2 text-center">
                <div className="text-arena-muted text-xs">Pot</div>
                <div className="text-arena-primary font-medium">{pot}</div>
              </div>
            </div>

            {/* Info: Assam not available from backend (Marrakech only) */}
            {match.gameType !== "chess" && match.gameType !== "reversi" && !currentAssam && match.status === "active" && (
              <div className="mt-2 text-center text-[10px] text-arena-muted/50">
                Assam position not available from backend
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Players + Moves + Details */}
        <div className="space-y-4">
          {/* Players */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Players</h3>
            <div className="space-y-3">
              {agents.map((agent, idx) => {
                const side = ["a", "b", "c", "d"][idx];
                const isThinking = thinkingSide === side;
                return (
                  <div
                    key={agent.agentId}
                    className={`flex items-center justify-between bg-arena-bg rounded-lg p-3 transition-all ${
                      isThinking ? "ring-1 ring-arena-primary/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                      />
                      <div>
                        <div className="text-sm font-medium text-arena-text">
                          {agent.agentName}
                        </div>
                        {agent.username && (
                          <div className="text-xs text-arena-muted">
                            by {agent.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {isThinking ? (
                        <span className="text-xs text-arena-primary animate-pulse">
                          Thinking...
                        </span>
                      ) : (
                        <>
                          <div className="text-sm text-arena-primary font-medium">
                            {agent.eloAtStart}
                          </div>
                          {agent.eloChange !== undefined && agent.eloChange !== null && (
                            <div
                              className={`text-xs font-medium ${
                                agent.eloChange > 0
                                  ? "text-arena-success"
                                  : agent.eloChange < 0
                                  ? "text-arena-accent"
                                  : "text-arena-muted"
                              }`}
                            >
                              {agent.eloChange > 0 ? "+" : ""}
                              {agent.eloChange}
                            </div>
                          )}
                          {playerStates?.[idx] && (
                            <div className="text-[10px] text-arena-muted mt-0.5">
                              {playerStates[idx].dirhams ?? playerStates[idx].coins}💰
                              {" "}
                              {playerStates[idx].carpetsRemaining}🧶
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result */}
            {match.status === "completed" && match.winnerId && (
              <div className="mt-3 p-3 bg-arena-primary/10 border border-arena-primary/30 rounded-lg">
                <div className="text-xs text-arena-muted mb-1">Winner</div>
                <div className="text-sm font-semibold text-arena-primary">
                  {agents.find((a) => a.agentId === match.winnerId)
                    ?.agentName || "Unknown"}
                </div>
                {match.result && (
                  <div className="text-xs text-arena-muted mt-1">
                    {typeof match.result === "string"
                      ? match.result
                      : (match.result as any)?.reason || JSON.stringify(match.result)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">
              Move History
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {loadingMoves ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  Loading moves...
                </div>
              ) : moves.length === 0 ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  No moves yet
                </div>
              ) : (
                moves.map((move, idx) => {
                  const info = agentLookup.get(move.agentId);
                  const side = info?.side || "a";
                  const { text: display, phase } = formatMoveDisplay(move.moveData, match.gameType);
                  const phaseConf = phase ? PHASE_CONFIG[phase] : null;
                  return (
                    <div
                      key={move.id || idx}
                      className="bg-arena-bg rounded-lg px-2.5 py-2 flex items-center gap-2"
                    >
                      <span className="text-arena-muted font-mono text-[10px] w-5 text-right flex-shrink-0">
                        #{move.turnNumber}
                      </span>
                      {phaseConf && (
                        <span
                          className="text-[9px] font-bold uppercase px-1 py-px rounded flex-shrink-0"
                          style={{
                            backgroundColor: `${phaseConf.color}20`,
                            color: phaseConf.color,
                          }}
                        >
                          {phaseConf.label}
                        </span>
                      )}
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                      />
                      <span
                        className="text-xs font-medium flex-shrink-0"
                        style={{ color: SIDE_COLORS[side] || "#8B5CF6" }}
                      >
                        {info?.name || "Agent"}
                      </span>
                      <span className="text-xs text-arena-text/70 truncate flex-1">
                        {display}
                      </span>
                      <span className="text-[10px] text-arena-muted flex-shrink-0">
                        {formatRelativeTime(move.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={movesEndRef} />
            </div>
          </div>

          {/* Match Details */}
          <div className="bg-arena-card border border-arena-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Details</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-arena-muted">Match ID</dt>
                <dd className="text-arena-text font-mono">{(matchId || "unknown").slice(0, 12)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-arena-muted">Game Type</dt>
                <dd className="text-arena-text capitalize">{match.gameType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-arena-muted">Created</dt>
                <dd className="text-arena-text">{formatDate(match.createdAt)}</dd>
              </div>
              {(match.completedAt || (match as any).endedAt) && (
                <div className="flex justify-between">
                  <dt className="text-arena-muted">Completed</dt>
                  <dd className="text-arena-text">{formatDate(match.completedAt || (match as any).endedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Agent Thoughts — full width below the board */}
      {(match.status === "active" || thoughts.length > 0) && (
        <div className="bg-arena-card border border-arena-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-arena-text">Agent Thoughts</h3>
            {match.status === "active" && (
              <span className={`flex items-center gap-1 text-[10px] ${
                wsStatus === "connected" ? "text-arena-success" : wsStatus === "connecting" ? "text-yellow-400" : "text-arena-muted"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  wsStatus === "connected" ? "bg-arena-success animate-pulse" : wsStatus === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-arena-muted"
                }`} />
                {wsStatus === "connected" ? "LIVE" : wsStatus === "connecting" ? "CONNECTING" : "OFFLINE"}
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {thoughts.length === 0 ? (
              <div className="text-center text-sm text-arena-muted py-6">
                {wsStatus === "connected"
                  ? "Waiting for agents to think..."
                  : wsStatus === "connecting"
                  ? "Connecting to match..."
                  : "WebSocket not connected — thoughts won't appear in real-time"}
                <div className="text-xs mt-1 text-arena-muted/60">
                  {wsStatus === "connected"
                    ? "Agent reasoning will appear here in real-time"
                    : `WS status: ${wsStatus}`}
                </div>
              </div>
            ) : (
              thoughts.map((thought, idx) => (
                <div key={idx} className="flex gap-2">
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SIDE_COLORS[thought.side] || "#8B5CF6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: SIDE_COLORS[thought.side] || "#8B5CF6" }}
                      >
                        {thought.agentName}
                      </span>
                      <span className="text-[10px] text-arena-muted">
                        {new Date(thought.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-arena-text/80 whitespace-pre-wrap break-words">
                      {thought.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            {thinkingSide && (
              <div className="flex gap-2 items-center">
                <div
                  className="w-1 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SIDE_COLORS[thinkingSide] || "#8B5CF6" }}
                />
                <span className="text-xs text-arena-muted animate-pulse">
                  {agents.find((_, idx) => ["a", "b", "c", "d"][idx] === thinkingSide)?.agentName || "Agent"}{" "}
                  is thinking...
                </span>
              </div>
            )}
            <div ref={thoughtsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
