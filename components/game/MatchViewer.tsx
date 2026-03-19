"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import type { Match, Move, PokerCard, BettingPoolResponse } from "@/lib/types";
import ChessBoard from "./ChessBoard";
import PokerBoard from "./PokerBoard";
import Badge from "@/components/ui/Badge";
import { formatDate, formatRelativeTime, normalizeMatchAgents, formatEarnings } from "@/lib/utils";

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

// Chess piece names from board values
const CHESS_PIECE_NAMES: Record<number, string> = {
  1: "Peón", 2: "Caballo", 3: "Alfil", 4: "Torre", 5: "Dama", 6: "Rey",
  7: "Peón", 8: "Caballo", 9: "Alfil", 10: "Torre", 11: "Dama", 12: "Rey",
};

/** Convert UCI string like "e2e4" to descriptive format like "Peón e2→e4" */
function formatChessUci(uci: string, board?: any): string {
  if (!uci || uci.length < 4) return uci || "?";
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length > 4 ? uci[4] : null;

  // Try to identify the piece from the board state
  let pieceName = "";
  if (board) {
    const grid = Array.isArray(board) && Array.isArray(board[0]) ? board : board?.grid;
    if (grid) {
      const col = from.charCodeAt(0) - 97; // a=0, b=1, ...
      const row = 8 - parseInt(from[1]);    // 1=row7, 8=row0
      if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        const val = grid[row]?.[col];
        if (val && CHESS_PIECE_NAMES[val]) pieceName = CHESS_PIECE_NAMES[val];
      }
    }
  }

  const moveText = `${from}→${to}`;
  const promoText = promo ? ` =${promo.toUpperCase()}` : "";
  return pieceName ? `${pieceName} ${moveText}${promoText}` : `${moveText}${promoText}`;
}

// Format move data for display
function formatMoveDisplay(
  moveData: Record<string, unknown>,
  gameType?: string,
  boardBefore?: any,
): { text: string; phase?: string } {
  const md = moveData as any;

  // Chess: show descriptive notation
  if (gameType === "chess") {
    const uci = md.chessMove || md.move || md.uci || md.uciMove || md.san || md.notation;
    if (typeof uci === "string") return { text: formatChessUci(uci, boardBefore) };
    // Try to extract from raw JSON
    if (md.raw && typeof md.raw === "string") {
      try {
        const parsed = JSON.parse(md.raw);
        const m = parsed.move || parsed.uciMove || parsed.chessMove;
        if (m) return { text: formatChessUci(m, boardBefore) };
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
      const amount = typeof action === "object" ? action.amount : (md.pokerAmount ?? md.amount);
      return { text: amount != null ? `${type} (${amount})` : String(type) };
    }
    return { text: "action" };
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
  // data is already a board array (e.g. number[][] for chess)
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) return data;
  // data is an object with a board inside
  const raw = data?.boardState || data?.currentBoard || data?.board || data?.grid;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (raw.grid && Array.isArray(raw.grid)) return raw.grid;
  return null;
}

export default function MatchViewer({ match, onMatchUpdate }: MatchViewerProps) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<any>(
    match.boardState || (match as any).currentBoard
  );
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [thinkingSide, setThinkingSide] = useState<string | null>(null);
  const [score, setScore] = useState<Record<string, number> | null>(null);
  const [viewers, setViewers] = useState(0);
  const [viewerFlash, setViewerFlash] = useState(false);
  const prevViewersRef = useRef(0);
  // Poker-specific state — initialize from match.pokerState if available
  // Backend stores players as { a: {...}, b: {...} }, convert to array
  const initPoker = match.pokerState && typeof match.pokerState === "object" ? match.pokerState as any : null;
  const [pokerCommunityCards, setPokerCommunityCards] = useState<PokerCard[]>(initPoker?.communityCards || []);
  const [pokerPot, setPokerPot] = useState(initPoker?.pot || 0);
  const [pokerStreet, setPokerStreet] = useState(initPoker?.street || "preflop");
  const [pokerHandNumber, setPokerHandNumber] = useState(initPoker?.handNumber || 0);
  const [pokerPlayers, setPokerPlayers] = useState<{
    seatIndex: number; stack: number; currentBet: number;
    hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean;
    playerId?: string; name?: string; isAgent?: boolean;
  }[]>(() => {
    if (!initPoker?.players) return [];
    // Array format (from WS events)
    if (Array.isArray(initPoker.players)) {
      return initPoker.players.map((p: any, i: number) => ({
        seatIndex: p.seatIndex ?? i, stack: p.stack ?? 0, currentBet: p.currentBet ?? 0,
        hasFolded: p.hasFolded ?? false, isAllIn: p.isAllIn ?? false, isDealer: p.isDealer ?? false,
        isEliminated: p.isEliminated ?? false, playerId: p.playerId, name: p.name, isAgent: p.isAgent,
      }));
    }
    // Object format from backend DB: { a: {...}, b: {...} }
    const p = initPoker.players;
    const arr: any[] = [];
    if (p.a) arr.push({ seatIndex: 0, stack: p.a.stack ?? 0, currentBet: p.a.currentBet ?? 0, hasFolded: p.a.hasFolded ?? false, isAllIn: p.a.isAllIn ?? false, isDealer: p.a.isDealer ?? false, isEliminated: false });
    if (p.b) arr.push({ seatIndex: 1, stack: p.b.stack ?? 0, currentBet: p.b.currentBet ?? 0, hasFolded: p.b.hasFolded ?? false, isAllIn: p.b.isAllIn ?? false, isDealer: p.b.isDealer ?? false, isEliminated: false });
    return arr;
  });
  const [pokerCurrentPlayerIndex, setPokerCurrentPlayerIndex] = useState(() => {
    if (!initPoker?.currentPlayerSide) return 0;
    return initPoker.currentPlayerSide === "b" ? 1 : 0;
  });
  const [pokerDealerIndex, setPokerDealerIndex] = useState(() => {
    if (initPoker?.dealerIndex != null) return initPoker.dealerIndex;
    if (initPoker?.dealerSide) return initPoker.dealerSide === "b" ? 1 : 0;
    return 0;
  });
  const [pokerActionHistory, setPokerActionHistory] = useState<{ type: string; amount?: number; playerIndex: number; street: string }[]>([]);
  const [pokerHoleCards, setPokerHoleCards] = useState<Record<number, PokerCard[]>>({});
  const [pokerShowdownResult, setPokerShowdownResult] = useState<any>(null);
  // Per-hand hole cards archive: handNumber → { seatIndex → cards }
  const [pokerHandCardsArchive, setPokerHandCardsArchive] = useState<Record<number, Record<number, PokerCard[]>>>(() => {
    // Initialize from match.pokerState if available (completed match)
    if (initPoker?.showdownResult && initPoker?.handNumber && initPoker?.players) {
      const hcMap: Record<number, PokerCard[]> = {};
      if (Array.isArray(initPoker.players)) {
        initPoker.players.forEach((p: any) => { if (p.holeCards?.length) hcMap[p.seatIndex ?? 0] = p.holeCards; });
      } else {
        if (initPoker.players.a?.holeCards?.length) hcMap[0] = initPoker.players.a.holeCards;
        if (initPoker.players.b?.holeCards?.length) hcMap[1] = initPoker.players.b.holeCards;
      }
      if (Object.keys(hcMap).length > 0) return { [initPoker.handNumber]: hcMap };
    }
    return {};
  });
  // Replay state
  const [replayStep, setReplayStep] = useState(-1); // -1 = show final state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);
  const [isLiveMode, setIsLiveMode] = useState(true); // live scrubbing for active matches
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);
  const replayMoveRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const matchId = match.id || (match as any)._id;

  // Normalize agents: backend sends {a: {...}, b: {...}} not array
  const agents = React.useMemo(() => normalizeMatchAgents(match.agents, match.pokerPlayers), [match.agents, match.pokerPlayers]);

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

  // Lookup by side (for WS moves that don't have agentId)
  const sideLookup = React.useMemo(() => {
    const map = new Map<string, { name: string; side: string }>();
    agents.forEach((a, idx) => {
      const side = ["a", "b", "c", "d"][idx] || String(idx);
      map.set(side, { name: a.agentName, side });
    });
    return map;
  }, [agents]);

  // Betting pool — compact widget in sidebar
  const [bettingPool, setBettingPool] = useState<BettingPoolResponse | null>(null);
  useEffect(() => {
    if (!matchId || agents.length !== 2) return;
    const fetch = () => api.getBettingPool(matchId).then(setBettingPool).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, [matchId, agents.length]);

  // Stable refs for socket callbacks (avoid reconnection loops)
  const agentLookupRef = useRef(agentLookup);
  agentLookupRef.current = agentLookup;
  const onMatchUpdateRef = useRef(onMatchUpdate);
  onMatchUpdateRef.current = onMatchUpdate;

  // Replay: can we replay this match?
  const canReplay = match.status === "completed" && moves.length > 0
    && (match.gameType === "poker" || moves.some(m => m.boardStateAfter && m.boardStateAfter.length > 0));

  // Replay: the board to display (override when stepping through moves)
  const displayBoard = useMemo(() => {
    if (!isLiveMode && replayStep >= 0 && replayStep < moves.length) {
      const board = moves[replayStep].boardStateAfter;
      if (board && board.length > 0) return board;
    }
    return extractBoard(currentBoard || match.boardState || (match as any).currentBoard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayStep, isLiveMode, moves, currentBoard, match.boardState]);

  // Replay: current move info for display
  const replayMoveInfo = useMemo(() => {
    if (replayStep < 0 || replayStep >= moves.length) return null;
    const move = moves[replayStep];
    const info = agentLookup.get(move.agentId) || (move.side ? sideLookup.get(move.side) : undefined);
    const boardBefore = replayStep > 0 ? moves[replayStep - 1].boardStateAfter : null;
    const { text } = formatMoveDisplay(move.moveData, match.gameType, boardBefore);
    return { agentName: info?.name || "Agent", side: info?.side || move.side || "a", text, moveNumber: move.moveNumber ?? move.turnNumber };
  }, [replayStep, moves, agentLookup, match.gameType]);

  // Replay: auto-play timer
  useEffect(() => {
    if (!isAutoPlaying || !canReplay) return;
    const timer = setInterval(() => {
      setReplayStep(prev => {
        const next = (prev < 0 ? 0 : prev) + 1;
        if (next >= moves.length) {
          setIsAutoPlaying(false);
          return moves.length - 1;
        }
        return next;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isAutoPlaying, playbackSpeed, moves.length, canReplay]);

  // Replay: auto-scroll move list to current step
  useEffect(() => {
    if (replayStep < 0) return;
    const el = replayMoveRefs.current.get(replayStep);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [replayStep]);

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

        // Load poker hand histories for rewind
        if (match.gameType === "poker") {
          try {
            const { match: fullMatch } = await api.getMatch(matchId);
            const histories = (fullMatch as any)?.pokerHandHistories;
            if (Array.isArray(histories) && histories.length > 0) {
              const archive: Record<number, Record<number, PokerCard[]>> = {};
              for (const h of histories) {
                if (!h.handNumber || !h.holeCards) continue;
                const hcMap: Record<number, PokerCard[]> = {};
                if (h.holeCards.a?.length) hcMap[0] = h.holeCards.a;
                if (h.holeCards.b?.length) hcMap[1] = h.holeCards.b;
                if (Object.keys(hcMap).length > 0) archive[h.handNumber] = hcMap;
              }
              setPokerHandCardsArchive(prev => ({ ...prev, ...archive }));
            }
          } catch { /* ignore */ }
        }

        // Auto-start replay for completed matches
        if (match.status === "completed" && fetchedMoves.length > 0
            && (match.gameType === "poker" || fetchedMoves.some(m => m.boardStateAfter && m.boardStateAfter.length > 0))) {
          setReplayStep(0);
          setIsAutoPlaying(true);
        }
      } catch {
        // silently fail
      } finally {
        setLoadingMoves(false);
      }
    }
    fetchMoves();
  }, [matchId]);

  // Socket.IO for live updates (connect for both "starting" and "active" matches)
  useEffect(() => {
    if ((match.status !== "active" && match.status !== "starting") || !matchId) return;

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
        // Poker: N-player support
        if (data.pokerPlayers) {
          const players = data.pokerPlayers as typeof pokerPlayers;
          setPokerPlayers(players);
          const dealer = players.findIndex((p: any) => p.isDealer);
          if (dealer !== -1) setPokerDealerIndex(dealer);
        } else if (data.pokerPlayerStacks) {
          const stacks = data.pokerPlayerStacks as { a: number; b: number };
          setPokerPlayers([
            { seatIndex: 0, stack: stacks.a, currentBet: 0, hasFolded: false, isAllIn: false, isDealer: true, isEliminated: false },
            { seatIndex: 1, stack: stacks.b, currentBet: 0, hasFolded: false, isAllIn: false, isDealer: false, isEliminated: false },
          ]);
        }
        if (data.pokerHandNumber != null) {
          setPokerHandNumber((prev: number) => {
            if ((data.pokerHandNumber as number) > prev) {
              setPokerActionHistory([]);
              setPokerCommunityCards([]);
            }
            return data.pokerHandNumber as number;
          });
        }
        if (data.pokerCurrentPlayerIndex != null) setPokerCurrentPlayerIndex(data.pokerCurrentPlayerIndex as number);
      }

      if (type === "match:move" || type === "match:state") {
        const grid = extractBoard(data);

        if (type === "match:move") {
          setThinkingSide(null);
          // Append move to history from WS data
          if (data.moveNumber != null && data.side) {
            const wsMove: Move = {
              id: `ws-${data.moveNumber}-${data.side}`,
              _id: `ws-${data.moveNumber}-${data.side}`,
              matchId: matchId,
              agentId: "",
              side: data.side as string,
              moveNumber: data.moveNumber as number,
              turnNumber: data.moveNumber as number,
              moveData: {
                chessMove: data.chessMove,
                move: data.move,
                pokerAction: data.pokerAction,
                pokerHandNumber: data.pokerHandNumber,
              } as any,
              boardStateAfter: grid || [],
              scoreAfter: data.score || {},
              thinkingTimeMs: (data.thinkingTimeMs as number) || 0,
              timestamp: new Date().toISOString(),
            };
            setMoves((prev) => {
              if (prev.some((m) => m.moveNumber === wsMove.moveNumber && m.side === wsMove.side)) return prev;
              return [...prev, wsMove];
            });
          }
        }

        if (grid) {
          setCurrentBoard({ grid } as any);
        }

        if (data.score) setScore(data.score);
        // Poker-specific (N-player)
        if (Array.isArray(data.pokerCommunityCards)) setPokerCommunityCards(data.pokerCommunityCards);
        if (data.pokerPot != null) setPokerPot(data.pokerPot);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet);
        if (data.pokerHandNumber != null) {
          setPokerHandNumber((prev: number) => {
            if ((data.pokerHandNumber as number) > prev) {
              setPokerActionHistory([]);
              setPokerShowdownResult(null);
              setPokerHoleCards({});
              setPokerCommunityCards([]);
            }
            return data.pokerHandNumber as number;
          });
        }
        // Archive hand result (fold or showdown) — always has hole cards for rewind
        if (data.pokerHandResult) {
          const hr = data.pokerHandResult as any;
          if (hr.handNumber && hr.holeCards) {
            const hcMap: Record<number, PokerCard[]> = {};
            if (hr.holeCards.a?.length) hcMap[0] = hr.holeCards.a;
            if (hr.holeCards.b?.length) hcMap[1] = hr.holeCards.b;
            if (Object.keys(hcMap).length > 0) {
              setPokerHandCardsArchive(prev => ({ ...prev, [hr.handNumber]: hcMap }));
            }
          }
        }

        // Showdown: extract hole cards + result
        if (data.pokerShowdownResult) {
          setPokerShowdownResult(data.pokerShowdownResult);
          if (data.pokerPlayers) {
            const hcMap: Record<number, PokerCard[]> = {};
            (data.pokerPlayers as any[]).forEach((p: any) => {
              if (p.holeCards?.length) hcMap[p.seatIndex] = p.holeCards;
            });
            setPokerHoleCards(hcMap);
            // Archive hole cards for this hand so we can reveal them on rewind
            const handNum = (data.pokerHandNumber as number) ?? pokerHandNumber;
            if (handNum > 0 && Object.keys(hcMap).length > 0) {
              setPokerHandCardsArchive(prev => ({ ...prev, [handNum]: hcMap }));
            }
          }
        }
        if (data.pokerPlayers) {
          const incoming = data.pokerPlayers as typeof pokerPlayers;
          setPokerPlayers(prev => incoming.map((p: any) => {
            const existing = prev.find(e => e.seatIndex === p.seatIndex);
            return { ...p, name: p.name ?? existing?.name, playerId: p.playerId ?? existing?.playerId, isAgent: p.isAgent ?? existing?.isAgent };
          }));
          const dealer = incoming.findIndex((p: any) => p.isDealer);
          if (dealer !== -1) setPokerDealerIndex(dealer);
        } else if (data.pokerPlayerStacks) {
          const stacks = data.pokerPlayerStacks as { a: number; b: number };
          setPokerPlayers(prev => {
            if (prev.length === 0) {
              return [
                { seatIndex: 0, stack: stacks.a, currentBet: 0, hasFolded: false, isAllIn: false, isDealer: true, isEliminated: false },
                { seatIndex: 1, stack: stacks.b, currentBet: 0, hasFolded: false, isAllIn: false, isDealer: false, isEliminated: false },
              ];
            }
            return prev.map((p, i) => ({ ...p, stack: i === 0 ? stacks.a : stacks.b }));
          });
        }
        if (data.pokerCurrentPlayerIndex != null) {
          setPokerCurrentPlayerIndex(data.pokerCurrentPlayerIndex as number);
        } else if (data.pokerPlayerIndex != null) {
          setPokerCurrentPlayerIndex(data.pokerPlayerIndex as number);
        }
        if (data.pokerAction) {
          const action = data.pokerAction as { type: string; amount?: number };
          const playerIndex = (data.pokerPlayerIndex as number) ?? (data.side === "a" ? 0 : data.side === "b" ? 1 : 0);
          setPokerActionHistory((prev) => [...prev, {
            type: action.type,
            amount: action.amount,
            playerIndex,
            street: (data.pokerStreet as string) || pokerStreet,
          }]);
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

      if (type === "match:viewers" || (type === "match:state" && data.viewers != null)) {
        setViewers(data.viewers as number);
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

  // Polling fallback: re-fetch match + moves while active/starting
  // Uses 8s interval with backoff on 429 to avoid rate limiting
  useEffect(() => {
    if ((match.status !== "active" && match.status !== "starting") || !matchId) return;

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
              // Load poker hand histories for rewind
              const histories = (updated as any).pokerHandHistories;
              if (Array.isArray(histories) && histories.length > 0) {
                setPokerHandCardsArchive(prev => {
                  const next = { ...prev };
                  for (const h of histories) {
                    if (!h.handNumber || !h.holeCards) continue;
                    const hcMap: Record<number, PokerCard[]> = {};
                    if (h.holeCards.a?.length) hcMap[0] = h.holeCards.a;
                    if (h.holeCards.b?.length) hcMap[1] = h.holeCards.b;
                    if (Object.keys(hcMap).length > 0) next[h.handNumber] = hcMap;
                  }
                  return next;
                });
              }

              const grid = extractBoard(updated);
              if (grid) {
                setCurrentBoard({ grid } as any);
              } else {
                const rawBoard = updated.boardState || (updated as any).currentBoard;
                if (rawBoard) setCurrentBoard(rawBoard);
              }
              // Extract poker state from polled match data
              const pk = updated.pokerState as any;
              if (pk && typeof pk === "object") {
                if (Array.isArray(pk.communityCards)) setPokerCommunityCards(pk.communityCards);
                if (pk.pot != null) setPokerPot(pk.pot);
                if (pk.street) setPokerStreet(pk.street);
                if (pk.handNumber != null) {
                  setPokerHandNumber((prev: number) => {
                    if ((pk.handNumber as number) > prev) {
                      setPokerActionHistory([]);
                      setPokerShowdownResult(null);
                      setPokerHoleCards({});
                      setPokerCommunityCards([]);
                    }
                    return pk.handNumber as number;
                  });
                }
                // Extract hole cards from polling for showdown display
                if (pk.showdownResult) {
                  setPokerShowdownResult(pk.showdownResult);
                  const hcMap: Record<number, PokerCard[]> = {};
                  if (pk.players?.a?.holeCards?.length) hcMap[0] = pk.players.a.holeCards;
                  if (pk.players?.b?.holeCards?.length) hcMap[1] = pk.players.b.holeCards;
                  if (Object.keys(hcMap).length > 0) {
                    setPokerHoleCards(hcMap);
                    const hn = pk.handNumber as number;
                    if (hn > 0) setPokerHandCardsArchive(prev => ({ ...prev, [hn]: hcMap }));
                  }
                }
                if (pk.dealerIndex != null) setPokerDealerIndex(pk.dealerIndex);
                else if (pk.dealerSide) setPokerDealerIndex(pk.dealerSide === "b" ? 1 : 0);
                if (pk.currentPlayerSide) setPokerCurrentPlayerIndex(pk.currentPlayerSide === "b" ? 1 : 0);
                // Players: handle both array format (WS) and object format (DB: { a, b })
                if (pk.players) {
                  if (Array.isArray(pk.players)) {
                    setPokerPlayers(prev => (pk.players as any[]).map((p: any, i: number) => {
                      const existing = prev.find(e => e.seatIndex === (p.seatIndex ?? i));
                      return {
                        seatIndex: p.seatIndex ?? i, stack: p.stack ?? 0, currentBet: p.currentBet ?? 0,
                        hasFolded: p.hasFolded ?? false, isAllIn: p.isAllIn ?? false, isDealer: p.isDealer ?? false,
                        isEliminated: p.isEliminated ?? false, playerId: p.playerId ?? existing?.playerId,
                        name: p.name ?? existing?.name, isAgent: p.isAgent ?? existing?.isAgent,
                      };
                    }));
                  } else if (pk.players.a || pk.players.b) {
                    setPokerPlayers(prev => {
                      const arr: typeof prev = [];
                      for (const [side, idx] of [["a", 0], ["b", 1]] as const) {
                        const p = (pk.players as any)[side];
                        if (!p) continue;
                        const existing = prev.find(e => e.seatIndex === idx);
                        arr.push({
                          seatIndex: idx, stack: p.stack ?? 0, currentBet: p.currentBet ?? 0,
                          hasFolded: p.hasFolded ?? false, isAllIn: p.isAllIn ?? false, isDealer: p.isDealer ?? false,
                          isEliminated: false, playerId: existing?.playerId, name: existing?.name, isAgent: existing?.isAgent,
                        });
                      }
                      return arr;
                    });
                  }
                }
              }

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

  // Flash green when viewer count increases
  useEffect(() => {
    if (viewers > prevViewersRef.current && prevViewersRef.current >= 0) {
      setViewerFlash(true);
      const timer = setTimeout(() => setViewerFlash(false), 1200);
      prevViewersRef.current = viewers;
      return () => clearTimeout(timer);
    }
    prevViewersRef.current = viewers;
  }, [viewers]);

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
          <div className="dash-glass-card rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-arena-text">Board</h3>
              <div className="flex items-center gap-3">
                <Badge status={match.status} />
                {(match.status === "active" || match.status === "starting") && (
                  <span className="flex items-center gap-1 text-xs text-arena-success">
                    <span className="w-2 h-2 bg-arena-success rounded-full animate-pulse" />
                    {match.status === "starting" ? "STARTING" : "LIVE"}
                  </span>
                )}
                {(match.status === "active" || match.status === "starting") && (
                  <span
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{
                      color: viewerFlash ? "#22c55e" : undefined,
                      transform: viewerFlash ? "scale(1.3)" : "scale(1)",
                      transition: "all 0.3s ease",
                      filter: viewerFlash ? "drop-shadow(0 0 6px rgba(34,197,94,0.7))" : "none",
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {viewers}
                  </span>
                )}
              </div>
            </div>
            {match.gameType === "chess" ? (
              <ChessBoard
                board={displayBoard as number[][] | null}
                legalMoves={[]}
                mySide={null}
                isMyTurn={false}
              />
            ) : match.gameType === "poker" ? (
              (() => {
                const isReplay = match.status === "completed";
                const rawPokerState = isReplay ? match.pokerState : null;
                const savedState = rawPokerState && typeof rawPokerState === "object" ? rawPokerState as {
                  players?: { seatIndex: number; holeCards?: PokerCard[]; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string }[];
                  communityCards?: PokerCard[];
                  pot?: number;
                  street?: string;
                  handNumber?: number;
                  showdownResult?: any;
                  dealerIndex?: number;
                } : null;

                // For replays, use saved pokerState for hole cards
                const replayPlayers = savedState?.players && Array.isArray(savedState.players) ? savedState.players : null;

                // When rewinding in live match, find which hand the current step belongs to
                const rewindHandNum = (!isLiveMode && replayStep >= 0 && moves[replayStep])
                  ? ((moves[replayStep].moveData as any)?.pokerHandNumber ?? null)
                  : null;
                const rewindCards = rewindHandNum != null ? pokerHandCardsArchive[rewindHandNum] : null;

                const spectatorPlayers = pokerPlayers.length > 0
                  ? pokerPlayers.map((p, i) => {
                      const replayP = replayPlayers ? replayPlayers.find(rp => rp.seatIndex === p.seatIndex) : null;
                      // In rewind mode: show archived hole cards for completed hands
                      // In live mode: only show current showdown cards
                      let holeCards: PokerCard[] | undefined;
                      if (!isLiveMode && rewindCards) {
                        holeCards = rewindCards[p.seatIndex];
                      } else if (isLiveMode || replayStep < 0) {
                        holeCards = pokerHoleCards[p.seatIndex];
                      } else if (isReplay && savedState?.showdownResult) {
                        holeCards = replayP?.holeCards as PokerCard[] | undefined;
                      }
                      return {
                        id: p.playerId ?? `p${i}`,
                        name: p.name ?? agents[p.seatIndex]?.agentName ?? `Player ${p.seatIndex + 1}`,
                        seatIndex: p.seatIndex,
                        stack: p.stack,
                        currentBet: p.currentBet,
                        hasFolded: p.hasFolded,
                        isAllIn: p.isAllIn,
                        isEliminated: p.isEliminated,
                        isDealer: p.isDealer,
                        isHuman: false,
                        isAgent: p.isAgent ?? true,
                        holeCards,
                      };
                    })
                  : replayPlayers
                  ? replayPlayers.map((rp, i) => ({
                      id: rp.playerId ?? `p${i}`,
                      name: agents[rp.seatIndex]?.agentName ?? `Player ${(rp.seatIndex ?? i) + 1}`,
                      seatIndex: rp.seatIndex ?? i,
                      stack: rp.stack ?? 0,
                      currentBet: rp.currentBet ?? 0,
                      hasFolded: rp.hasFolded ?? false,
                      isAllIn: rp.isAllIn ?? false,
                      isEliminated: rp.isEliminated ?? false,
                      isDealer: rp.isDealer ?? false,
                      isHuman: false,
                      isAgent: true,
                      holeCards: savedState?.showdownResult ? (rp.holeCards as PokerCard[] | undefined) : undefined,
                    }))
                  : agents.map((a, i) => ({
                      id: a.agentId ?? `p${i}`,
                      name: a.agentName ?? `Player ${i + 1}`,
                      seatIndex: i,
                      stack: 0,
                      currentBet: 0,
                      hasFolded: false,
                      isAllIn: false,
                      isEliminated: false,
                      isDealer: i === 0,
                      isHuman: false,
                      isAgent: true,
                      holeCards: undefined as PokerCard[] | undefined,
                    }));

                // For replays, prefer saved state; detect fresh unplayed hand (match ended between hands)
                const replayCommunity = isReplay && savedState?.communityCards ? savedState.communityCards : pokerCommunityCards;
                const replayStreet = isReplay && savedState?.street ? savedState.street : pokerStreet;
                const replayHandNum = isReplay && savedState?.handNumber != null ? savedState.handNumber : pokerHandNumber;
                const isFreshUnplayedHand = isReplay &&
                  (replayStreet === "preflop" || !replayStreet) &&
                  (!replayCommunity || replayCommunity.length === 0);

                const displayCommunity = replayCommunity;
                const displayPot = isReplay && savedState?.pot != null ? savedState.pot : pokerPot;
                const displayStreet = isFreshUnplayedHand ? "showdown" : replayStreet;
                const displayHandNumber = isFreshUnplayedHand ? Math.max(1, replayHandNum - 1) : replayHandNum;
                const displayDealer = isReplay && savedState?.dealerIndex != null ? savedState.dealerIndex : pokerDealerIndex;

                // Convert backend showdown format to PokerBoard format
                let convertedShowdown = null;
                if (pokerShowdownResult) {
                  const sr = pokerShowdownResult;
                  const winnerIdx = sr.winnerSide === "a" ? 0 : 1;
                  const loserIdx = winnerIdx === 0 ? 1 : 0;
                  convertedShowdown = {
                    winners: [{ playerIndex: winnerIdx, handEval: { rank: sr.winnerHand?.rank ?? 0, description: sr.winnerHand?.description ?? "Winner" } as any }],
                    pots: [{ amount: displayPot, winnerIndices: [winnerIdx] }],
                    playerHands: new Map([
                      [winnerIdx, { rank: sr.winnerHand?.rank ?? 0, description: sr.winnerHand?.description ?? "" } as any],
                      ...(sr.loserHand ? [[loserIdx, { rank: sr.loserHand.rank ?? 0, description: sr.loserHand.description ?? "" } as any] as [number, any]] : []),
                    ]),
                  };
                }

                // Build matchResult for completed matches
                const pokerMatchResult = match.status === "completed" && match.winnerId
                  ? {
                      winnerName: agents.find(a => a.agentId === match.winnerId)?.agentName
                        ?? (match.winnerId === "a" ? agents[0]?.agentName : match.winnerId === "b" ? agents[1]?.agentName : undefined)
                        ?? "Winner",
                      reason: typeof match.result === "string" ? match.result : (match.result as any)?.reason,
                    }
                  : null;

                return (
                  <PokerBoard
                    communityCards={displayCommunity}
                    pot={displayPot}
                    street={displayStreet}
                    handNumber={displayHandNumber}
                    players={spectatorPlayers}
                    humanPlayerIndex={-1}
                    currentPlayerIndex={pokerCurrentPlayerIndex}
                    dealerIndex={displayDealer}
                    actionHistory={pokerActionHistory}
                    showdownResult={convertedShowdown}
                    matchResult={pokerMatchResult}
                  />
                );
              })()
            ) : (
              <div className="text-center text-arena-muted py-8">Unsupported game type</div>
            )}

            {/* Waiting to start overlay */}
            {match.status === "starting" && moves.length === 0 && (
              <div className="mt-4 flex items-center justify-center gap-3 bg-arena-primary/5 border border-arena-primary/20 rounded-lg px-4 py-6">
                <div className="w-5 h-5 border-2 border-arena-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-arena-primary">Match is about to start...</span>
              </div>
            )}

            {/* ── Live Scrub Bar ── */}
            {(match.status === "active" || match.status === "starting") && (
              <div className="mt-4 dash-glass-card rounded-xl p-3 space-y-2">
                {/* Timeline slider */}
                {moves.length > 0 && (
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, moves.length - 1)}
                      value={isLiveMode ? Math.max(0, moves.length - 1) : (replayStep >= 0 ? Math.min(replayStep, moves.length - 1) : Math.max(0, moves.length - 1))}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setReplayStep(val);
                        if (val >= moves.length - 1) {
                          setIsLiveMode(true);
                        } else {
                          setIsLiveMode(false);
                        }
                      }}
                      className="w-full h-1.5 bg-arena-border/40 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:shadow-red-500/30 [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                )}

                {/* Bottom row: move info + LIVE button */}
                <div className="flex items-center justify-between">
                  <div className="text-arena-muted text-[11px] font-mono">
                    {moves.length === 0 ? (
                      <>Waiting for moves...</>
                    ) : !isLiveMode && replayStep >= 0 ? (
                      <>Move {replayStep + 1} / {moves.length}</>
                    ) : (
                      <>Move {moves.length}</>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsLiveMode(true);
                      setReplayStep(-1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isLiveMode
                        ? "bg-red-500 text-white shadow-sm shadow-red-500/20"
                        : "bg-white text-red-500 border border-red-300 hover:bg-red-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? "bg-white animate-pulse" : "bg-red-500"}`} />
                    LIVE
                  </button>
                </div>
              </div>
            )}

            {/* ── Replay Controls ── */}
            {canReplay && (
              <div className="mt-4 dash-glass-card rounded-xl p-4 space-y-3">
                {/* Timeline slider */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={moves.length - 1}
                    value={replayStep >= 0 ? replayStep : moves.length - 1}
                    onChange={(e) => { setReplayStep(parseInt(e.target.value)); setIsAutoPlaying(false); }}
                    className="w-full h-1.5 bg-arena-border/40 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-arena-primary [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-arena-primary/30 [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-3">
                  {/* Transport buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setReplayStep(0); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Start"
                    >⏮</button>
                    <button
                      onClick={() => {
                        setReplayStep(prev => Math.max(0, (prev < 0 ? moves.length - 1 : prev) - 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Step back"
                    >◀</button>
                    <button
                      onClick={() => {
                        if (replayStep < 0) setReplayStep(0);
                        // If at the end, restart
                        if (replayStep >= moves.length - 1) {
                          setReplayStep(0);
                          setIsAutoPlaying(true);
                        } else {
                          setIsAutoPlaying(!isAutoPlaying);
                        }
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all text-lg border shadow-sm ${
                        isAutoPlaying
                          ? "bg-arena-primary/15 text-arena-primary border-arena-primary/30"
                          : "bg-white hover:bg-arena-primary/10 text-arena-primary/70 border-arena-border-light/40"
                      }`}
                      title={isAutoPlaying ? "Pause" : "Play"}
                    >{isAutoPlaying ? "⏸" : "▶"}</button>
                    <button
                      onClick={() => {
                        setReplayStep(prev => Math.min(moves.length - 1, (prev < 0 ? moves.length - 1 : prev) + 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Step forward"
                    >▶</button>
                    <button
                      onClick={() => { setReplayStep(-1); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="End"
                    >⏭</button>
                  </div>

                  {/* Move counter + info */}
                  <div className="flex-1 text-center min-w-0">
                    <div className="text-arena-text text-xs font-mono font-semibold">
                      Move {replayStep >= 0 ? replayStep + 1 : moves.length} / {moves.length}
                    </div>
                    {replayMoveInfo && (
                      <div className="text-arena-muted text-[10px] font-mono truncate mt-0.5">
                        <span style={{ color: SIDE_COLORS[replayMoveInfo.side] || "#8B5CF6" }}>
                          {replayMoveInfo.agentName}
                        </span>
                        {" — "}
                        {replayMoveInfo.text}
                      </div>
                    )}
                  </div>

                  {/* Speed selector */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                    className="bg-white text-arena-primary/70 text-[10px] font-mono font-semibold rounded-lg px-2.5 py-1.5 border border-arena-border-light/40 shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-arena-primary/30 appearance-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237c6dc7' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "22px" }}
                  >
                    <option value={1600}>0.5x</option>
                    <option value={800}>1x</option>
                    <option value={400}>2x</option>
                    <option value={200}>4x</option>
                  </select>
                </div>
              </div>
            )}

            {/* Match Info Below Board */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {match.gameType === "poker" ? (
                <>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Hand</div>
                    <div className="text-arena-text font-medium">
                      #{pokerHandNumber || 1}
                    </div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Hands</div>
                    <div className="text-arena-text font-medium">
                      {moves.length || match.moveCount || 0}
                    </div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Street</div>
                    <div className="text-arena-primary font-medium capitalize">
                      {match.status === "completed" ? "Completed" : pokerStreet}
                    </div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Pot</div>
                    <div className="text-arena-primary font-medium">{pokerPot}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Turn</div>
                    <div className="text-arena-text font-medium">
                      {match.currentTurn ?? "-"}
                    </div>
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
                </>
              )}
            </div>


          </div>
        </div>

        {/* Sidebar: Players + Moves + Details */}
        <div className="space-y-4">
          {/* Players */}
          <div className="dash-glass-card rounded-xl p-4">
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
                      {match.gameType === "chess" ? (
                        <div
                          className={`w-3 h-3 rounded-sm border ${
                            side === "a"
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                        />
                      ) : (
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                        />
                      )}
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
          <div className="dash-glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">
              {match.gameType === "poker" ? "Hand History" : "Move History"}
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {loadingMoves ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  {match.gameType === "poker" ? "Loading hands..." : "Loading moves..."}
                </div>
              ) : moves.length === 0 ? (
                <div className="text-center text-sm text-arena-muted py-4">
                  {match.gameType === "poker" ? "No hands yet" : "No moves yet"}
                </div>
              ) : (
                moves.map((move, idx) => {
                  const info = agentLookup.get(move.agentId) || (move.side ? sideLookup.get(move.side) : undefined);
                  const side = info?.side || move.side || "a";
                  const boardBefore = idx > 0 ? moves[idx - 1].boardStateAfter : null;
                  const { text: display } = formatMoveDisplay(move.moveData, match.gameType, boardBefore);
                  const isActiveReplayMove = (canReplay && replayStep === idx) || (!isLiveMode && replayStep === idx);
                  return (
                    <div
                      key={move.id || move._id || idx}
                      ref={(el) => { if (el) replayMoveRefs.current.set(idx, el); }}
                      className={`rounded-lg px-2.5 py-2 flex items-center gap-2 transition-all cursor-pointer ${
                        isActiveReplayMove
                          ? "bg-arena-primary/15 ring-1 ring-arena-primary/30"
                          : "bg-arena-bg hover:bg-arena-bg/80"
                      }`}
                      onClick={() => {
                        if (canReplay) { setReplayStep(idx); setIsAutoPlaying(false); }
                        else if (match.status === "active" || match.status === "starting") {
                          setReplayStep(idx);
                          setIsLiveMode(idx >= moves.length - 1);
                        }
                      }}
                    >
                      <span className="text-arena-muted font-mono text-[10px] w-5 text-right flex-shrink-0">
                        #{move.moveNumber ?? move.turnNumber ?? idx + 1}
                      </span>
                      {match.gameType === "chess" ? (
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 border ${
                            side === "a" ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
                          }`}
                        />
                      ) : (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SIDE_COLORS[side] || "#8B5CF6" }}
                        />
                      )}
                      <span
                        className="text-xs font-medium flex-shrink-0"
                        style={{ color: match.gameType === "chess" ? (side === "a" ? "#1f2937" : "#6b7280") : (SIDE_COLORS[side] || "#8B5CF6") }}
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

          {/* Live Betting Pool */}
          {bettingPool && bettingPool.pool.totalPool > 0 && (
            <div className="dash-glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-arena-text">Bets</h3>
                <span className="text-[10px] font-mono text-arena-muted">
                  {formatEarnings(bettingPool.pool.totalPool)} ALPHA
                </span>
              </div>

              {/* Pool bar */}
              <div className="h-2 rounded-full overflow-hidden flex bg-white/5 mb-3">
                {bettingPool.pool.percentA > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${bettingPool.pool.percentA}%`,
                      backgroundColor: match.gameType === "chess" ? "#1f2937" : SIDE_COLORS.a,
                    }}
                  />
                )}
                {bettingPool.pool.percentB > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${bettingPool.pool.percentB}%`,
                      backgroundColor: match.gameType === "chess" ? "#e5e7eb" : SIDE_COLORS.b,
                    }}
                  />
                )}
              </div>

              {/* Per-agent breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {match.gameType === "chess" ? (
                      <div className="w-2 h-2 rounded-full bg-gray-800 border border-gray-600" />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SIDE_COLORS.a }} />
                    )}
                    <span className="text-arena-text truncate max-w-[100px]">{agents[0]?.agentName || "Agent A"}</span>
                  </div>
                  <span className="font-mono text-arena-muted">
                    {formatEarnings(bettingPool.pool.totalBetsA)} <span className="text-[10px]">({bettingPool.pool.percentA}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {match.gameType === "chess" ? (
                      <div className="w-2 h-2 rounded-full bg-white border border-gray-300" />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SIDE_COLORS.b }} />
                    )}
                    <span className="text-arena-text truncate max-w-[100px]">{agents[1]?.agentName || "Agent B"}</span>
                  </div>
                  <span className="font-mono text-arena-muted">
                    {formatEarnings(bettingPool.pool.totalBetsB)} <span className="text-[10px]">({bettingPool.pool.percentB}%)</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Match Details */}
          <div className="dash-glass-card rounded-xl p-4">
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

    </div>
  );
}
