"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import type { Match, Move, PokerCard, BettingPoolResponse } from "@/lib/types";
import ChessBoard from "./ChessBoard";
import PokerBoard from "./PokerBoard";
import RpsBoard, { RpsThrowIcon } from "./RpsBoard";
import type { RpsRound } from "./RpsBoard";
import UnoBoard from "./UnoBoard";
import type { UnoCardData } from "./UnoCard";
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

// Chess piece symbols for algebraic notation
const CHESS_PIECE_SYMBOL: Record<number, string> = {
  1: "", 2: "N", 3: "B", 4: "R", 5: "Q", 6: "K",   // White pieces (pawn = empty)
  7: "", 8: "N", 9: "B", 10: "R", 11: "Q", 12: "K", // Black pieces
};
const CHESS_PIECE_UNICODE: Record<number, string> = {
  1: "\u2659", 2: "\u2658", 3: "\u2657", 4: "\u2656", 5: "\u2655", 6: "\u2654",
  7: "\u265F", 8: "\u265E", 9: "\u265D", 10: "\u265C", 11: "\u265B", 12: "\u265A",
};

/** Convert UCI string like "e2e4" to algebraic-like format: "e4", "Nf3", "Bxe5" */
function formatChessUci(uci: string, board?: any): string {
  if (!uci || uci.length < 4) return uci || "?";
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length > 4 ? uci[4] : null;

  let pieceSymbol = "";
  let pieceUnicode = "";
  let isCapture = false;
  let isPawn = false;

  if (board) {
    const grid = Array.isArray(board) && Array.isArray(board[0]) ? board : board?.grid;
    if (grid) {
      const fromCol = from.charCodeAt(0) - 97;
      const fromRow = 8 - parseInt(from[1]);
      const toCol = to.charCodeAt(0) - 97;
      const toRow = 8 - parseInt(to[1]);

      if (fromRow >= 0 && fromRow < 8 && fromCol >= 0 && fromCol < 8) {
        const val = grid[fromRow]?.[fromCol];
        if (val) {
          pieceSymbol = CHESS_PIECE_SYMBOL[val] || "";
          pieceUnicode = CHESS_PIECE_UNICODE[val] || "";
          isPawn = val === 1 || val === 7;
        }
      }
      // Check if destination has a piece (capture)
      if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
        const destVal = grid[toRow]?.[toCol];
        if (destVal && destVal !== 0) isCapture = true;
      }
      // En passant: pawn moving diagonally to empty square
      if (isPawn && fromCol !== toCol && !isCapture) isCapture = true;
    }
  }

  // Castling detection
  if ((pieceSymbol === "K") && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
    return to.charCodeAt(0) > from.charCodeAt(0) ? "O-O" : "O-O-O";
  }

  const captureStr = isCapture ? "x" : "";
  const promoStr = promo ? `=${promo.toUpperCase()}` : "";

  if (isPawn) {
    // Pawn: "e4", "exd5", "e8=Q"
    const fromFile = isCapture ? from[0] : "";
    return `${fromFile}${captureStr}${to}${promoStr}`;
  }

  // Piece: "Nf3", "Bxe5", "Qd1"
  return `${pieceSymbol}${captureStr}${to}${promoStr}`;
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

  // Poker: show action + amount with better formatting
  if (gameType === "poker") {
    const action = md.pokerAction || md.action || md.moveData?.pokerAction;
    if (action) {
      const type = (typeof action === "string" ? action : action.type || action).toLowerCase();
      const amount = typeof action === "object" ? action.amount : (md.pokerAmount ?? md.amount);
      const handNum = md.pokerHandNumber ?? md.handNumber;
      const street = md.pokerStreet ?? md.street;

      const ACTION_LABELS: Record<string, string> = {
        fold: "Fold",
        check: "Check",
        call: "Call",
        bet: "Bet",
        raise: "Raise",
        "all-in": "ALL-IN",
        allin: "ALL-IN",
        "all_in": "ALL-IN",
      };
      const label = ACTION_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);
      const amountStr = amount != null && amount > 0 ? ` ${Number(amount).toLocaleString()}` : "";
      const text = `${label}${amountStr}`;
      return { text, phase: street || undefined };
    }
    return { text: "action" };
  }

  // RPS: show throw
  if (gameType === "rps") {
    const rpsThrow = md.rpsThrow || md.throw || md.action;
    if (rpsThrow) {
      const label = rpsThrow.charAt(0).toUpperCase() + rpsThrow.slice(1);
      return { text: label };
    }
    return { text: "choosing..." };
  }

  // UNO: show action
  if (gameType === "uno") {
    const unoAction = md.unoAction || md;
    if (unoAction?.type === "PLAY_CARD") {
      const tc = md.topCard;
      if (tc) {
        if (tc.type === "NUMBER") return { text: `${tc.color} ${tc.value}` };
        if (tc.type === "WILD") return { text: `Wild \u2192 ${unoAction.chosenColor || "?"}` };
        if (tc.type === "WILD_DRAW_FOUR") return { text: `Wild +4 \u2192 ${unoAction.chosenColor || "?"}` };
        return { text: `${tc.color} ${tc.type.replace(/_/g, " ")}` };
      }
      return { text: "Played card" };
    }
    if (unoAction?.type === "DRAW_CARD") return { text: "Drew a card" };
    if (unoAction?.type === "PASS") return { text: "Passed" };
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
  const [thinkingSide, setThinkingSide] = useState<string | null>(
    // Initialize from match.currentTurn for active matches so spectators see the timer immediately
    (match.status === "active" || match.status === "starting") ? (match.currentTurn != null ? String(match.currentTurn) : null) : null
  );
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number | null>(null);
  const turnStartRef = useRef<number | null>(null);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    // Object format from backend DB: { a: {...}, b: {...}, c: {...}, ... }
    const p = initPoker.players as Record<string, any>;
    const seatOrder = initPoker.seatOrder || Object.keys(p).sort();
    return seatOrder.map((side: string, i: number) => {
      const pl = p[side];
      if (!pl) return null;
      return { seatIndex: i, stack: pl.stack ?? 0, currentBet: pl.currentBet ?? 0, hasFolded: pl.hasFolded ?? false, isAllIn: pl.isAllIn ?? false, isDealer: pl.isDealer ?? false, isEliminated: pl.isEliminated ?? false };
    }).filter(Boolean);
  });
  const [pokerCurrentPlayerIndex, setPokerCurrentPlayerIndex] = useState(() => {
    if (!initPoker?.currentPlayerSide) return 0;
    const seatOrder = initPoker.seatOrder || Object.keys(initPoker.players || {}).sort();
    return Math.max(0, seatOrder.indexOf(initPoker.currentPlayerSide));
  });
  const [pokerDealerIndex, setPokerDealerIndex] = useState(() => {
    if (initPoker?.dealerIndex != null) return initPoker.dealerIndex;
    if (initPoker?.dealerSide) {
      const seatOrder = initPoker.seatOrder || Object.keys(initPoker.players || {}).sort();
      return Math.max(0, seatOrder.indexOf(initPoker.dealerSide));
    }
    return 0;
  });
  const [pokerActionHistory, setPokerActionHistory] = useState<{ type: string; amount?: number; playerIndex: number; street: string }[]>([]);
  const [pokerHoleCards, setPokerHoleCards] = useState<Record<number, PokerCard[]>>({});
  const [pokerShowdownResult, setPokerShowdownResult] = useState<any>(null);
  // Per-hand hole cards archive: handNumber → { seatIndex → cards }
  // Archive of community cards per hand number (for replay)
  const [pokerHandCommunityArchive, setPokerHandCommunityArchive] = useState<Record<number, PokerCard[]>>({});
  const [pokerHandCardsArchive, setPokerHandCardsArchive] = useState<Record<number, Record<number, PokerCard[]>>>(() => {
    // Initialize from match.pokerState if available (completed match)
    if (initPoker?.showdownResult && initPoker?.handNumber && initPoker?.players) {
      const hcMap: Record<number, PokerCard[]> = {};
      if (Array.isArray(initPoker.players)) {
        initPoker.players.forEach((p: any) => { if (p.holeCards?.length) hcMap[p.seatIndex ?? 0] = p.holeCards; });
      } else {
        const sOrder = initPoker.seatOrder || Object.keys(initPoker.players).sort();
        sOrder.forEach((side: string, i: number) => {
          const pl = (initPoker.players as any)[side];
          if (pl?.holeCards?.length) hcMap[i] = pl.holeCards;
        });
      }
      if (Object.keys(hcMap).length > 0) return { [initPoker.handNumber]: hcMap };
    }
    return {};
  });
  // RPS state — initialize from match.rpsState if available
  const initRps = match.rpsState && typeof match.rpsState === "object" ? match.rpsState as any : null;
  const [rpsRounds, setRpsRounds] = useState<RpsRound[]>(initRps?.rounds || []);
  const [rpsCurrentRound, setRpsCurrentRound] = useState(initRps?.currentRound || 1);
  const [rpsTotalRounds, setRpsTotalRounds] = useState(initRps?.bestOf || 3);
  const [rpsScoreA, setRpsScoreA] = useState(initRps?.scores?.a || 0);
  const [rpsScoreB, setRpsScoreB] = useState(initRps?.scores?.b || 0);
  const [rpsPhase, setRpsPhase] = useState<"waiting" | "thinking" | "revealing" | "round_complete" | "game_over">(
    match.status === "completed" ? "game_over" : (initRps?.phase === "match_over" ? "game_over" : "waiting")
  );
  const RPS_TURN_TIMEOUT_SECS = 70;
  const [rpsSecondsLeft, setRpsSecondsLeft] = useState<number | null>(null);
  const rpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rpsTimerStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (match.gameType === "rps" && rpsPhase === "waiting" && match.status !== "completed") {
      rpsTimerStartRef.current = Date.now();
      setRpsSecondsLeft(RPS_TURN_TIMEOUT_SECS);
      if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
      rpsTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (rpsTimerStartRef.current || Date.now())) / 1000);
        const remaining = Math.max(0, RPS_TURN_TIMEOUT_SECS - elapsed);
        setRpsSecondsLeft(remaining);
        if (remaining <= 0 && rpsTimerRef.current) clearInterval(rpsTimerRef.current);
      }, 1000);
    } else {
      if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
      rpsTimerRef.current = null;
      rpsTimerStartRef.current = null;
      setRpsSecondsLeft(null);
    }
    return () => { if (rpsTimerRef.current) clearInterval(rpsTimerRef.current); };
  }, [rpsPhase, match.gameType, match.status]);

  // UNO state — initialize from match.unoState if available
  const initUno = match.unoState && typeof match.unoState === "object" ? match.unoState as any : null;
  const [unoTopCard, setUnoTopCard] = useState<UnoCardData | null>(initUno?.topCard || null);
  const [unoCurrentColor, setUnoCurrentColor] = useState<string>(initUno?.currentColor || "RED");
  const [unoCurrentTurn, setUnoCurrentTurn] = useState<string>(initUno?.currentTurn || "a");
  const [unoDrawPileCount, setUnoDrawPileCount] = useState<number>(initUno?.drawPileCount || 0);
  const [unoHandCounts, setUnoHandCounts] = useState<Record<string, number>>(initUno?.handCounts || { a: 7, b: 7 });
  const [unoStatus, setUnoStatus] = useState<string>(initUno?.status || "playing");
  const [unoWinner, setUnoWinner] = useState<string | null>(initUno?.winner || null);
  const [unoLastAction, setUnoLastAction] = useState<any>(initUno?.lastAction || null);
  const [unoDirection, setUnoDirection] = useState<number>(initUno?.direction || 1);
  const [unoMoveCount, setUnoMoveCount] = useState<number>(initUno?.moveCount || 0);

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
      const side = String.fromCharCode(97 + idx) || String(idx);
      map.set(a.agentId, { name: a.agentName, side });
    });
    return map;
  }, [agents]);

  // Lookup by side (for WS moves that don't have agentId)
  const sideLookup = React.useMemo(() => {
    const map = new Map<string, { name: string; side: string }>();
    agents.forEach((a, idx) => {
      const side = String.fromCharCode(97 + idx) || String(idx);
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
  const canReplay = match.status === "completed" && moves.length > 0;

  // Replay: the board to display (override when stepping through moves)
  const displayBoard = useMemo(() => {
    if (!isLiveMode && replayStep >= 0 && replayStep < moves.length) {
      const board = moves[replayStep].boardStateAfter;
      if (board && board.length > 0) return board;
    }
    return extractBoard(currentBoard || match.boardState || (match as any).currentBoard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayStep, isLiveMode, moves, currentBoard, match.boardState]);

  // Replay: UNO state at current replay step
  const unoReplayState = useMemo(() => {
    if (match.gameType !== "uno") return null;
    if (isLiveMode || replayStep < 0 || replayStep >= moves.length) return null;
    const move = moves[replayStep];
    const md = move.moveData as any;
    return {
      topCard: md?.topCard || null,
      currentColor: md?.currentColor || "RED",
      handCounts: md?.handCounts || { a: 0, b: 0 },
      lastAction: md?.unoAction || null,
      moveCount: move.moveNumber ?? replayStep + 1,
      currentTurn: move.side === "a" ? "b" : "a", // after this move, turn goes to other side
    };
  }, [match.gameType, isLiveMode, replayStep, moves]);

  // Replay: current move info for display
  const replayMoveInfo = useMemo(() => {
    if (replayStep < 0 || replayStep >= moves.length) return null;
    const move = moves[replayStep];
    const info = agentLookup.get(move.agentId) || (move.side ? sideLookup.get(move.side) : undefined);
    const boardBefore = replayStep > 0 ? moves[replayStep - 1].boardStateAfter : null;
    const { text } = formatMoveDisplay(move.moveData, match.gameType, boardBefore);
    return { agentName: info?.name || "Agent", side: info?.side || move.side || "a", text, moveNumber: move.moveNumber ?? move.turnNumber };
  }, [replayStep, moves, agentLookup, match.gameType]);

  // Turn countdown timer — starts when an agent begins thinking
  const TURN_TIMEOUT_SECS = 60;
  useEffect(() => {
    if (thinkingSide) {
      turnStartRef.current = Date.now();
      setTurnSecondsLeft(TURN_TIMEOUT_SECS);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (turnStartRef.current || Date.now())) / 1000);
        const remaining = Math.max(0, TURN_TIMEOUT_SECS - elapsed);
        setTurnSecondsLeft(remaining);
        if (remaining <= 0 && turnTimerRef.current) clearInterval(turnTimerRef.current);
      }, 1000);
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
      turnStartRef.current = null;
      setTurnSecondsLeft(null);
    }
    return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
  }, [thinkingSide]);

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

  // Replay: auto-scroll move list to current step (within container only, don't scroll page)
  useEffect(() => {
    if (replayStep < 0) return;
    const el = replayMoveRefs.current.get(replayStep);
    if (!el) return;
    const container = el.closest("[data-move-list]") as HTMLElement | null;
    if (container) {
      const elTop = el.offsetTop - container.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const scrollTop = container.scrollTop;
      const scrollBottom = scrollTop + container.clientHeight;
      if (elTop < scrollTop) {
        container.scrollTo({ top: elTop, behavior: "smooth" });
      } else if (elBottom > scrollBottom) {
        container.scrollTo({ top: elBottom - container.clientHeight, behavior: "smooth" });
      }
    }
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
              const communityArchive: Record<number, PokerCard[]> = {};
              for (const h of histories) {
                if (!h.handNumber) continue;
                if (h.holeCards) {
                  const hcMap: Record<number, PokerCard[]> = {};
                  if (Array.isArray(h.holeCards)) {
                    h.holeCards.forEach((hc: any, i: number) => { if (hc?.length) hcMap[i] = hc; });
                  } else {
                    Object.entries(h.holeCards).forEach(([side, cards]: [string, any]) => {
                      if (cards?.length) hcMap[side.charCodeAt(0) - 97] = cards;
                    });
                  }
                  if (Object.keys(hcMap).length > 0) archive[h.handNumber] = hcMap;
                }
                if (Array.isArray(h.communityCards) && h.communityCards.length > 0) {
                  communityArchive[h.handNumber] = h.communityCards;
                }
              }
              setPokerHandCardsArchive(prev => ({ ...prev, ...archive }));
              setPokerHandCommunityArchive(prev => ({ ...prev, ...communityArchive }));
            }
          } catch { /* ignore */ }
        }

        // Auto-start replay for completed matches
        if (match.status === "completed" && fetchedMoves.length > 0) {
          setIsLiveMode(false);
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
          const stacks = data.pokerPlayerStacks as Record<string, number>;
          const sides = Object.keys(stacks).sort();
          setPokerPlayers(sides.map((side, i) => ({
            seatIndex: i, stack: stacks[side], currentBet: 0, hasFolded: false, isAllIn: false, isDealer: i === 0, isEliminated: false,
          })));
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
        // UNO: load initial state
        if (data.unoState && typeof data.unoState === "object") {
          const us = data.unoState as any;
          if (us.topCard) setUnoTopCard(us.topCard);
          if (us.currentColor) setUnoCurrentColor(us.currentColor);
          if (us.currentTurn) setUnoCurrentTurn(us.currentTurn);
          if (us.drawPileCount != null) setUnoDrawPileCount(us.drawPileCount);
          if (us.handCounts) setUnoHandCounts(us.handCounts);
          if (us.status) setUnoStatus(us.status);
        }
      }

      if (type === "match:move" || type === "match:state") {
        const grid = extractBoard(data);

        if (type === "match:move") {
          // After a move, the OTHER player starts thinking
          const moveSide = data.side as string | undefined;
          // N-player: next side is the next letter, wrapping around
          const sideIdx = moveSide ? moveSide.charCodeAt(0) - 97 : 0;
          const totalPlayers = pokerPlayers.length || 2;
          const nextSide = String.fromCharCode(97 + ((sideIdx + 1) % totalPlayers));
          // Brief null to reset timer, then set next player as thinking (skip for RPS)
          if (moveSide && match.gameType !== "rps" && match.gameType !== "uno") {
            setThinkingSide(null);
            setTimeout(() => setThinkingSide(nextSide), 50);
          }
          // Append move to history from WS data (skip street-advance events that have no action)
          const hasAction = data.chessMove || data.move || data.pokerAction;
          if (data.moveNumber != null && data.side && hasAction) {
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
                pokerStreet: data.pokerStreet,
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

        // RPS-specific
        if (match.gameType === "rps") {
          if (data.rpsRound != null) setRpsCurrentRound(data.rpsRound as number);
          if (data.rpsTotalRounds != null) setRpsTotalRounds(data.rpsTotalRounds as number);
          if (data.rpsPhase) {
            const ph = data.rpsPhase as string;
            const mapped = ph === "waiting_moves" ? "waiting"
              : ph === "round_result" ? "round_complete"
              : ph === "match_over" ? "game_over"
              : ph;
            setRpsPhase(mapped as any);
          }
          if (data.rpsScores) {
            const s = data.rpsScores as { a: number; b: number };
            setRpsScoreA(s.a);
            setRpsScoreB(s.b);
          }
          if (data.rpsResult) {
            const r = data.rpsResult as { roundNumber: number; throwA: string; throwB: string; winner: string };
            setRpsRounds((prev) => {
              const exists = prev.some((rd) => rd.roundNumber === r.roundNumber);
              if (exists) return prev;
              return [...prev, {
                roundNumber: r.roundNumber,
                throwA: r.throwA as any,
                throwB: r.throwB as any,
                winner: r.winner as any,
              }];
            });
          }
        }

        // UNO-specific
        if (match.gameType === "uno") {
          if (data.topCard) setUnoTopCard(data.topCard as UnoCardData);
          if (data.currentColor) setUnoCurrentColor(data.currentColor as string);
          if (data.currentTurn) setUnoCurrentTurn(data.currentTurn as string);
          if (data.drawPileCount != null) setUnoDrawPileCount(data.drawPileCount as number);
          if (data.handCounts) setUnoHandCounts(data.handCounts as Record<string, number>);
          if (data.status) setUnoStatus(data.status as string);
          if (data.winner !== undefined) setUnoWinner(data.winner as string | null);
          if (data.lastAction) setUnoLastAction(data.lastAction);
          if (data.direction != null) setUnoDirection(data.direction as number);
          if (data.moveCount != null) setUnoMoveCount(data.moveCount as number);
          if (data.unoAction) setUnoLastAction(data.unoAction);
        }

        // Poker-specific (N-player)
        // IMPORTANT: handle hand number change BEFORE setting community cards,
        // so a new hand clears old cards first, then the new ones (if any) get set.
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
        if (Array.isArray(data.pokerCommunityCards)) setPokerCommunityCards(data.pokerCommunityCards);
        if (data.pokerPot != null) setPokerPot(data.pokerPot);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet);
        // Archive hand result (fold or showdown) — always has hole cards for rewind
        if (data.pokerHandResult) {
          const hr = data.pokerHandResult as any;
          if (hr.handNumber) {
            if (hr.holeCards) {
              const hcMap: Record<number, PokerCard[]> = {};
              if (Array.isArray(hr.holeCards)) {
                hr.holeCards.forEach((hc: any, i: number) => { if (hc?.length) hcMap[i] = hc; });
              } else {
                Object.entries(hr.holeCards).forEach(([side, cards]: [string, any]) => {
                  if (cards?.length) hcMap[side.charCodeAt(0) - 97] = cards;
                });
              }
              if (Object.keys(hcMap).length > 0) {
                setPokerHandCardsArchive(prev => ({ ...prev, [hr.handNumber]: hcMap }));
              }
            }
            if (Array.isArray(hr.communityCards) && hr.communityCards.length > 0) {
              setPokerHandCommunityArchive(prev => ({ ...prev, [hr.handNumber]: hr.communityCards }));
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
            if (handNum > 0) {
              if (Object.keys(hcMap).length > 0) {
                setPokerHandCardsArchive(prev => ({ ...prev, [handNum]: hcMap }));
              }
              // Also archive community cards for this hand
              if (Array.isArray(data.pokerCommunityCards) && (data.pokerCommunityCards as PokerCard[]).length > 0) {
                setPokerHandCommunityArchive(prev => ({ ...prev, [handNum]: data.pokerCommunityCards as PokerCard[] }));
              }
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
          const stacks = data.pokerPlayerStacks as Record<string, number>;
          const sides = Object.keys(stacks).sort();
          setPokerPlayers(prev => {
            if (prev.length === 0) {
              return sides.map((side, i) => ({
                seatIndex: i, stack: stacks[side], currentBet: 0, hasFolded: false, isAllIn: false, isDealer: i === 0, isEliminated: false,
              }));
            }
            return prev.map((p, i) => ({ ...p, stack: stacks[sides[i]] ?? p.stack }));
          });
        }
        if (data.pokerCurrentPlayerIndex != null) {
          setPokerCurrentPlayerIndex(data.pokerCurrentPlayerIndex as number);
        } else if (data.pokerPlayerIndex != null) {
          setPokerCurrentPlayerIndex(data.pokerPlayerIndex as number);
        }
        if (data.pokerAction) {
          const action = data.pokerAction as { type: string; amount?: number };
          const playerIndex = (data.pokerPlayerIndex as number) ?? (typeof data.side === 'string' ? Math.max(0, data.side.charCodeAt(0) - 97) : 0);
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
        setThinkingSide(null);
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
                    if (Array.isArray(h.holeCards)) {
                      h.holeCards.forEach((hc: any, i: number) => { if (hc?.length) hcMap[i] = hc; });
                    } else {
                      Object.entries(h.holeCards).forEach(([side, cards]: [string, any]) => {
                        if (cards?.length) hcMap[side.charCodeAt(0) - 97] = cards;
                      });
                    }
                    if (Object.keys(hcMap).length > 0) next[h.handNumber] = hcMap;
                  }
                  return next;
                });
                setPokerHandCommunityArchive(prev => {
                  const next = { ...prev };
                  for (const h of histories) {
                    if (!h.handNumber || !Array.isArray(h.communityCards)) continue;
                    if (h.communityCards.length > 0) next[h.handNumber] = h.communityCards;
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
                if (Array.isArray(pk.communityCards)) setPokerCommunityCards(pk.communityCards);
                if (pk.pot != null) setPokerPot(pk.pot);
                if (pk.street) setPokerStreet(pk.street);
                // Extract hole cards from polling for showdown display
                if (pk.showdownResult) {
                  setPokerShowdownResult(pk.showdownResult);
                  const hcMap: Record<number, PokerCard[]> = {};
                  const pollSeatOrder = pk.seatOrder || Object.keys(pk.players || {}).sort();
                  pollSeatOrder.forEach((side: string, i: number) => {
                    const pl = (pk.players as any)?.[side];
                    if (pl?.holeCards?.length) hcMap[i] = pl.holeCards;
                  });
                  if (Object.keys(hcMap).length > 0) {
                    setPokerHoleCards(hcMap);
                    const hn = pk.handNumber as number;
                    if (hn > 0) setPokerHandCardsArchive(prev => ({ ...prev, [hn]: hcMap }));
                  }
                }
                if (pk.dealerIndex != null) setPokerDealerIndex(pk.dealerIndex);
                else if (pk.dealerSide) {
                  const so = pk.seatOrder || Object.keys(pk.players || {}).sort();
                  setPokerDealerIndex(Math.max(0, so.indexOf(pk.dealerSide)));
                }
                if (pk.currentPlayerSide) {
                  const so = pk.seatOrder || Object.keys(pk.players || {}).sort();
                  setPokerCurrentPlayerIndex(Math.max(0, so.indexOf(pk.currentPlayerSide)));
                }
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
                  } else if (typeof pk.players === 'object') {
                    setPokerPlayers(prev => {
                      const arr: typeof prev = [];
                      const so = pk.seatOrder || Object.keys(pk.players).sort();
                      so.forEach((side: string, idx: number) => {
                        const p = (pk.players as any)[side];
                        if (!p) return;
                        const existing = prev.find(e => e.seatIndex === idx);
                        arr.push({
                          seatIndex: idx, stack: p.stack ?? 0, currentBet: p.currentBet ?? 0,
                          hasFolded: p.hasFolded ?? false, isAllIn: p.isAllIn ?? false, isDealer: p.isDealer ?? false,
                          isEliminated: p.isEliminated ?? false, playerId: existing?.playerId, name: existing?.name, isAgent: existing?.isAgent,
                        });
                      });
                      return arr;
                    });
                  }
                }
              }

              // Extract UNO state from polled match data
              const uno = updated.unoState as any;
              if (uno && typeof uno === "object") {
                if (uno.topCard) setUnoTopCard(uno.topCard);
                if (uno.currentColor) setUnoCurrentColor(uno.currentColor);
                if (uno.currentTurn) setUnoCurrentTurn(uno.currentTurn);
                if (uno.drawPileCount != null) setUnoDrawPileCount(uno.drawPileCount);
                if (uno.handCounts) setUnoHandCounts(uno.handCounts);
                if (uno.status) setUnoStatus(uno.status);
                if (uno.winner !== undefined) setUnoWinner(uno.winner);
                if (uno.lastAction) setUnoLastAction(uno.lastAction);
                if (uno.direction != null) setUnoDirection(uno.direction);
                if (uno.moveCount != null) setUnoMoveCount(uno.moveCount);
              }

              onMatchUpdateRef.current?.({ ...updated, id: updated.id || (updated as any)._id });
            }
          }

          if (movesRes.status === "fulfilled") {
            const newMoves = movesRes.value?.moves || [];
            setMoves((prev) => {
              if (!newMoves.length || newMoves.length <= prev.length) return prev;

              const newOnes = newMoves.slice(prev.length);

              // If multiple new moves arrived, stagger them so each one appears individually
              if (newOnes.length > 1) {
                // Add the first one now, schedule the rest with delays
                const [first, ...rest] = newOnes;
                rest.forEach((move, idx) => {
                  setTimeout(() => {
                    setMoves((p) => {
                      if (p.some((m) => m.moveNumber === move.moveNumber && m.side === move.side)) return p;
                      return [...p, move];
                    });
                  }, (idx + 1) * 1500); // 1.5s between each queued move
                });
                // Only add the first move now
                for (const move of [first]) {
                  const md = move.moveData as any;
                  const thinking = md?.thinking || md?.raw;
                  if (thinking) {
                    const info = agentLookupRef.current.get(move.agentId);
                    setThoughts((prevThoughts) => {
                      const exists = prevThoughts.some(
                        (t) => t.turnNumber === move.turnNumber && t.agentId === move.agentId
                      );
                      if (exists) return prevThoughts;
                      return [...prevThoughts, { agentId: move.agentId, agentName: info?.name || "Agent", side: info?.side || "a", text: thinking, timestamp: new Date(move.timestamp).getTime() || Date.now(), turnNumber: move.turnNumber }];
                    });
                  }
                }
                return [...prev, first];
              }

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
                {match.status !== "active" && match.status !== "starting" && <Badge status={match.status} />}
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
              (() => {
                // Get the last chess move for arrow/highlight
                const chessStepIdx = (!isLiveMode && replayStep >= 0) ? replayStep : moves.length - 1;
                const lastChessMove = chessStepIdx >= 0 ? moves[chessStepIdx] : null;
                const lastUci = lastChessMove ? ((lastChessMove.moveData as any)?.chessMove || (lastChessMove.moveData as any)?.move || (lastChessMove.moveData as any)?.uciMove) : null;
                return (
                  <ChessBoard
                    board={displayBoard as number[][] | null}
                    legalMoves={[]}
                    mySide={null}
                    isMyTurn={false}
                    lastMove={typeof lastUci === "string" && lastUci.length >= 4 ? lastUci : undefined}
                  />
                );
              })()
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
                const rewindCards = rewindHandNum != null
                  ? (pokerHandCardsArchive[rewindHandNum] ?? pokerHandCardsArchive[rewindHandNum + 1] ?? pokerHandCardsArchive[rewindHandNum - 1] ?? null)
                  : null;

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
                        // For completed matches: fallback to last hand in archive
                        if (!holeCards && match.status === "completed") {
                          const lastHandNum = Math.max(...Object.keys(pokerHandCardsArchive).map(Number).filter(n => !isNaN(n)), 0);
                          if (lastHandNum > 0) holeCards = pokerHandCardsArchive[lastHandNum]?.[p.seatIndex];
                        }
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
                  ? replayPlayers.map((rp, i) => {
                      const seatIdx = rp.seatIndex ?? i;
                      let holeCards: PokerCard[] | undefined;
                      if (!isLiveMode && rewindCards) {
                        holeCards = rewindCards[seatIdx];
                      } else if (savedState?.showdownResult) {
                        holeCards = rp.holeCards as PokerCard[] | undefined;
                      }
                      return {
                        id: rp.playerId ?? `p${i}`,
                        name: agents[seatIdx]?.agentName ?? `Player ${seatIdx + 1}`,
                        seatIndex: seatIdx,
                        stack: rp.stack ?? 0,
                        currentBet: rp.currentBet ?? 0,
                        hasFolded: rp.hasFolded ?? false,
                        isAllIn: rp.isAllIn ?? false,
                        isEliminated: rp.isEliminated ?? false,
                        isDealer: rp.isDealer ?? false,
                        isHuman: false,
                        isAgent: true,
                        holeCards,
                      };
                    })
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
                      holeCards: (!isLiveMode && rewindCards) ? rewindCards[i] : undefined,
                    }));

                // Determine if we're rewinding (not at the final state)
                const isAtFinalState = replayStep < 0 || replayStep >= moves.length - 1;
                // Rewinding works for both completed (isReplay) AND live matches (when slider moved back)
                const isRewinding = !isAtFinalState && replayStep >= 0 && !isLiveMode;

                // When rewinding, reconstruct state from the current move's data
                const curMove = isRewinding ? moves[replayStep] : null;
                const curMd = curMove?.moveData as any;
                const curHandNum = curMd?.pokerHandNumber;
                const curStreet = curMd?.pokerStreet;
                const curStacks = curMove?.scoreAfter as Record<string, number> | undefined;

                // Extract rich state from moveData (new format includes community cards, pot, player states)
                const curMdCommunity = curMd?.pokerCommunityCards as PokerCard[] | undefined;
                const curMdPot = curMd?.pokerPot as number | undefined;
                const curMdPlayers = curMd?.pokerPlayers as Record<string, { stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean }> | Array<{ seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean }> | undefined;

                // Get hole cards and community cards for the current hand from the archive
                // Try exact hand number first, then +1 and -1 (handles off-by-one in old matches)
                const rewindHandCards = curHandNum != null
                  ? (pokerHandCardsArchive[curHandNum] ?? pokerHandCardsArchive[curHandNum + 1] ?? pokerHandCardsArchive[curHandNum - 1] ?? null)
                  : null;
                const archiveCommunity = curHandNum != null
                  ? (pokerHandCommunityArchive[curHandNum] ?? pokerHandCommunityArchive[curHandNum + 1] ?? pokerHandCommunityArchive[curHandNum - 1] ?? null)
                  : null;

                // Derive which community cards to show based on street
                const communityForStreet = (allCards: PokerCard[], street: string | undefined): PokerCard[] => {
                  if (street === "preflop") return [];
                  if (street === "flop") return allCards.slice(0, 3);
                  if (street === "turn") return allCards.slice(0, 4);
                  // If street is unknown, show all cards for this hand (better than nothing)
                  return allCards;
                };

                // For replays, prefer saved state; detect fresh unplayed hand
                const replayCommunity = isReplay && savedState?.communityCards ? savedState.communityCards : pokerCommunityCards;
                const replayStreet = isReplay && savedState?.street ? savedState.street : pokerStreet;
                const replayHandNum = isReplay && savedState?.handNumber != null ? savedState.handNumber : pokerHandNumber;
                const isFreshUnplayedHand = isReplay && !isRewinding &&
                  (replayStreet === "preflop" || !replayStreet) &&
                  (!replayCommunity || replayCommunity.length === 0);

                // Community cards during rewind:
                // 1. New format: exact state from moveData (best)
                // 2. Archive: hand's final community cards sliced by street
                // 3. Empty for preflop when we know the street
                let displayCommunity: PokerCard[];
                if (!isRewinding) {
                  displayCommunity = replayCommunity;
                } else if (curMdCommunity && curMdCommunity.length >= 0) {
                  // New format: exact community at this move
                  displayCommunity = curMdCommunity;
                } else if (archiveCommunity) {
                  // Old format: use archive sliced by street
                  displayCommunity = communityForStreet(archiveCommunity, curStreet);
                } else {
                  // No data available
                  displayCommunity = [];
                }

                const displayPot = isRewinding
                  ? (curMdPot ?? 0)
                  : (isReplay && savedState?.pot != null ? savedState.pot : pokerPot);
                const displayStreet = isRewinding
                  ? (curStreet || "preflop")
                  : (isFreshUnplayedHand ? "showdown" : replayStreet);
                const displayHandNumber = isRewinding
                  ? (curHandNum ?? 1)
                  : (isFreshUnplayedHand ? Math.max(1, replayHandNum - 1) : replayHandNum);
                const displayDealer = isReplay && savedState?.dealerIndex != null ? savedState.dealerIndex : pokerDealerIndex;

                // Update player states when rewinding
                const rewindPlayers = isRewinding
                  ? spectatorPlayers.map((p, i) => {
                      const side = String.fromCharCode(97 + i); // a, b, c, ...
                      let mdP: any = null;
                      if (Array.isArray(curMdPlayers)) {
                        mdP = curMdPlayers.find((pp: any) => pp.seatIndex === i) || curMdPlayers[i];
                      } else if (curMdPlayers) {
                        mdP = (curMdPlayers as any)[side];
                      }
                      const holeCards = rewindHandCards?.[i];
                      return {
                        ...p,
                        stack: mdP?.stack ?? (curStacks?.[side] ?? p.stack),
                        currentBet: mdP?.currentBet ?? 0,
                        hasFolded: mdP?.hasFolded ?? false,
                        isAllIn: mdP?.isAllIn ?? false,
                        isEliminated: (mdP?.stack ?? (curStacks?.[side] ?? 1)) <= 0,
                        holeCards,
                      };
                    })
                  : spectatorPlayers;

                // Convert backend showdown format to PokerBoard format (only at final state)
                let convertedShowdown = null;
                if (pokerShowdownResult && !isRewinding) {
                  const sr = pokerShowdownResult;
                  const winnerIdx = sr.winnerSide && sr.winnerSide.length === 1 ? Math.max(0, sr.winnerSide.charCodeAt(0) - 97) : 0;
                  const playerHandEntries: [number, any][] = [[winnerIdx, { rank: sr.winnerHand?.rank ?? 0, description: sr.winnerHand?.description ?? "" } as any]];
                  // Add all hands from showdown
                  if (sr.hands) {
                    Object.entries(sr.hands).forEach(([side, hand]: [string, any]) => {
                      const idx = side.charCodeAt(0) - 97;
                      if (idx !== winnerIdx) playerHandEntries.push([idx, { rank: hand?.rank ?? 0, description: hand?.description ?? "" } as any]);
                    });
                  } else if (sr.loserHand) {
                    // Legacy 2-player format
                    const loserIdx = winnerIdx === 0 ? 1 : 0;
                    playerHandEntries.push([loserIdx, { rank: sr.loserHand.rank ?? 0, description: sr.loserHand.description ?? "" } as any]);
                  }
                  convertedShowdown = {
                    winners: [{ playerIndex: winnerIdx, handEval: { rank: sr.winnerHand?.rank ?? 0, description: sr.winnerHand?.description ?? "Winner" } as any }],
                    pots: [{ amount: displayPot, winnerIndices: [winnerIdx] }],
                    playerHands: new Map(playerHandEntries),
                  };
                }

                // Build matchResult for completed matches (only show at final state)
                const pokerMatchResult = match.status === "completed" && match.winnerId && !isRewinding
                  ? {
                      winnerName: agents.find(a => a.agentId === match.winnerId)?.agentName
                        ?? (match.winnerId && match.winnerId.length === 1 ? agents[match.winnerId.charCodeAt(0) - 97]?.agentName : undefined)
                        ?? "Winner",
                      reason: (() => {
                        const raw = typeof match.result === "string" ? match.result : (match.result as any)?.reason;
                        const labels: Record<string, string> = { max_hands: "Hand limit reached", timeout: "Time expired", score: "Score", draw: "Draw", checkmate: "Checkmate", stalemate: "Stalemate", forfeit: "Forfeit" };
                        return labels[raw] || raw;
                      })(),
                    }
                  : null;

                return (
                  <PokerBoard
                    communityCards={displayCommunity}
                    pot={displayPot}
                    street={displayStreet}
                    handNumber={displayHandNumber}
                    players={rewindPlayers}
                    humanPlayerIndex={-1}
                    currentPlayerIndex={isRewinding ? -1 : pokerCurrentPlayerIndex}
                    dealerIndex={displayDealer}
                    actionHistory={isRewinding ? (() => {
                      // Build a mini action history with just the last action at the current replay step
                      if (!curMd?.pokerAction) return [];
                      const rawAct = curMd.pokerAction;
                      const actionType = typeof rawAct === "string" ? rawAct : (rawAct?.type || String(rawAct));
                      const amount = curMd.pokerAmount;
                      const side = curMove?.side;
                      const playerIndex = typeof side === 'string' && side.length === 1 ? Math.max(0, side.charCodeAt(0) - 97) : 0;
                      return [{ type: actionType, amount, playerIndex, street: curStreet || "preflop" }];
                    })() : pokerActionHistory}
                    showdownResult={convertedShowdown}
                    matchResult={pokerMatchResult}
                    turnSecondsLeft={isRewinding ? null : turnSecondsLeft}
                  />
                );
              })()
            ) : match.gameType === "rps" ? (
              <RpsBoard
                rounds={rpsRounds}
                currentRound={rpsCurrentRound}
                totalRounds={rpsTotalRounds}
                scoreA={rpsScoreA}
                scoreB={rpsScoreB}
                playerAName={agents[0]?.agentName || "Player A"}
                playerBName={agents[1]?.agentName || "Player B"}
                phase={match.status === "completed" ? "game_over" : rpsPhase}
                winnerName={match.status === "completed" && match.winnerId
                  ? (agents.find(a => a.agentId === match.winnerId)?.agentName || "Winner")
                  : null}
                winReason={match.status === "completed"
                  ? (typeof match.result === "string" ? match.result : (match.result as any)?.reason) || null
                  : null}
                replayRound={!isLiveMode && replayStep >= 0 && replayStep < rpsRounds.length
                  ? rpsRounds[replayStep]?.roundNumber
                  : null}
              />
            ) : match.gameType === "uno" ? (
              <UnoBoard
                topCard={unoReplayState ? unoReplayState.topCard : unoTopCard}
                currentColor={unoReplayState ? unoReplayState.currentColor : unoCurrentColor}
                currentTurn={unoReplayState ? unoReplayState.currentTurn : unoCurrentTurn}
                drawPileCount={unoDrawPileCount}
                handCounts={unoReplayState ? unoReplayState.handCounts : unoHandCounts}
                status={match.status === "completed" && (!unoReplayState || replayStep >= moves.length - 1) ? "finished" : "playing"}
                winner={match.status === "completed" && (!unoReplayState || replayStep >= moves.length - 1) ? unoWinner : null}
                lastAction={unoReplayState ? unoReplayState.lastAction : unoLastAction}
                direction={unoDirection}
                moveCount={unoReplayState ? unoReplayState.moveCount : unoMoveCount}
                agentA={agents[0] ? { name: agents[0].agentName, side: "a", agentId: agents[0].agentId } : undefined}
                agentB={agents[1] ? { name: agents[1].agentName, side: "b", agentId: agents[1].agentId } : undefined}
                agentC={agents[2] ? { name: agents[2].agentName, side: "c", agentId: agents[2].agentId } : undefined}
                agentD={agents[3] ? { name: agents[3].agentName, side: "d", agentId: agents[3].agentId } : undefined}
                playerCount={Object.keys(unoHandCounts).length || agents.length}
              />
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
            {(match.status === "active" || match.status === "starting") && (() => {
              const isRps = match.gameType === "rps";
              const scrubItems = isRps ? rpsRounds : moves;
              const scrubLabel = isRps ? "Round" : "Move";
              return (
              <div className="mt-4 dash-glass-card rounded-xl p-3 space-y-2">
                {/* Timeline slider */}
                {scrubItems.length > 0 && (
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, scrubItems.length - 1)}
                      value={isLiveMode ? Math.max(0, scrubItems.length - 1) : (replayStep >= 0 ? Math.min(replayStep, scrubItems.length - 1) : Math.max(0, scrubItems.length - 1))}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setReplayStep(val);
                        if (val >= scrubItems.length - 1) {
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
                    {scrubItems.length === 0 ? (
                      <>Waiting for {scrubLabel.toLowerCase()}s...</>
                    ) : !isLiveMode && replayStep >= 0 ? (
                      <>{scrubLabel} {replayStep + 1} / {scrubItems.length}</>
                    ) : (
                      <>{scrubLabel} {scrubItems.length}</>
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
            );
            })()}

            {/* ── Replay Controls ── */}
            {canReplay && (() => {
              const isRpsReplay = match.gameType === "rps";
              const replayItems = isRpsReplay ? rpsRounds : moves;
              const replayLabel = isRpsReplay ? "Round" : "Move";
              return (
              <div className="mt-4 dash-glass-card rounded-xl p-4 space-y-3">
                {/* Timeline slider */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={replayItems.length - 1}
                    value={replayStep >= 0 ? replayStep : replayItems.length - 1}
                    onChange={(e) => { setIsLiveMode(false); setReplayStep(parseInt(e.target.value)); setIsAutoPlaying(false); }}
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
                      onClick={() => { setIsLiveMode(false); setReplayStep(0); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Start"
                    >⏮</button>
                    <button
                      onClick={() => {
                        setIsLiveMode(false);
                        setReplayStep(prev => Math.max(0, (prev < 0 ? replayItems.length - 1 : prev) - 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Step back"
                    >◀</button>
                    <button
                      onClick={() => {
                        setIsLiveMode(false);
                        if (replayStep < 0) setReplayStep(0);
                        // If at the end, restart
                        if (replayStep >= replayItems.length - 1) {
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
                        setIsLiveMode(false);
                        setReplayStep(prev => Math.min(replayItems.length - 1, (prev < 0 ? replayItems.length - 1 : prev) + 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="Step forward"
                    >▶</button>
                    <button
                      onClick={() => { setIsLiveMode(false); setReplayStep(-1); setIsAutoPlaying(false); }}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-white/80 text-arena-muted hover:text-arena-text border border-arena-border-light/40 shadow-sm flex items-center justify-center transition-all text-sm"
                      title="End"
                    >⏭</button>
                  </div>

                  {/* Move counter + info */}
                  <div className="flex-1 text-center min-w-0">
                    <div className="text-arena-text text-xs font-mono font-semibold">
                      {replayLabel} {replayStep >= 0 ? replayStep + 1 : replayItems.length} / {replayItems.length}
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
            );
            })()}

            {/* Match Info Below Board */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {match.gameType === "rps" ? (() => {
                // Compute scores at current replay step
                const viewIdx = (!isLiveMode && replayStep >= 0) ? Math.min(replayStep, rpsRounds.length - 1) : rpsRounds.length - 1;
                const roundsUpTo = rpsRounds.slice(0, viewIdx + 1);
                const replayScoreA = roundsUpTo.filter(r => r.winner === "a").length;
                const replayScoreB = roundsUpTo.filter(r => r.winner === "b").length;
                const displayRound = viewIdx >= 0 ? roundsUpTo.length : 0;
                const displayScoreA = isLiveMode || replayStep < 0 ? rpsScoreA : replayScoreA;
                const displayScoreB = isLiveMode || replayStep < 0 ? rpsScoreB : replayScoreB;
                return (
                  <>
                    <div className="bg-arena-bg rounded-lg p-2 text-center">
                      <div className="text-arena-muted text-xs">Round</div>
                      <div className="text-arena-text font-medium">
                        {displayRound} / {rpsTotalRounds}
                      </div>
                    </div>
                    <div className="bg-arena-bg rounded-lg p-2 text-center">
                      <div className="text-arena-muted text-xs">Score</div>
                      <div className="text-arena-primary font-medium">
                        {displayScoreA} — {displayScoreB}
                      </div>
                    </div>
                    <div className="bg-arena-bg rounded-lg p-2 text-center">
                      <div className="text-arena-muted text-xs">Best Of</div>
                      <div className="text-arena-text font-medium">{rpsTotalRounds}</div>
                    </div>
                    <div className="bg-arena-bg rounded-lg p-2 text-center">
                      <div className="text-arena-muted text-xs">Status</div>
                      <div className="text-arena-primary font-medium capitalize">
                        {match.status === "completed" ? "Finished" : rpsPhase === "waiting" ? "Choosing" : rpsPhase}
                      </div>
                    </div>
                  </>
                );
              })() : match.gameType === "poker" ? (
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
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Match ID</div>
                    <div className="text-arena-text font-medium font-mono text-[11px]">{(matchId || "unknown").slice(0, 12)}...</div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Game</div>
                    <div className="text-arena-text font-medium capitalize">{match.gameType}</div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Created</div>
                    <div className="text-arena-text font-medium text-[11px]">{formatDate(match.createdAt)}</div>
                  </div>
                  {(match.completedAt || (match as any).endedAt) && (
                    <div className="bg-arena-bg rounded-lg p-2 text-center">
                      <div className="text-arena-muted text-xs">Completed</div>
                      <div className="text-arena-text font-medium text-[11px]">{formatDate(match.completedAt || (match as any).endedAt)}</div>
                    </div>
                  )}
                </>
              ) : match.gameType === "uno" ? (
                <>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Turn</div>
                    <div className="text-arena-text font-medium capitalize">{unoCurrentTurn === "a" ? (agents[0]?.agentName || "A") : (agents[1]?.agentName || "B")}</div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Moves</div>
                    <div className="text-arena-text font-medium">{unoMoveCount || moves.length || 0}</div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Color</div>
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: unoCurrentColor === "RED" ? "#E63022" : unoCurrentColor === "BLUE" ? "#0F6EBD" : unoCurrentColor === "GREEN" ? "#1A9E4A" : unoCurrentColor === "YELLOW" ? "#F5C400" : "#666" }} />
                      <span className="text-arena-text font-medium text-xs">{unoCurrentColor}</span>
                    </div>
                  </div>
                  <div className="bg-arena-bg rounded-lg p-2 text-center">
                    <div className="text-arena-muted text-xs">Cards</div>
                    <div className="text-arena-text font-medium font-mono">{unoHandCounts?.a ?? "?"} vs {unoHandCounts?.b ?? "?"}</div>
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
        <div className="flex flex-col gap-4">
          {/* Players */}
          <div className="dash-glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">Players</h3>
            <div className="space-y-3">
              {agents.map((agent, idx) => {
                const side = String.fromCharCode(97 + idx);
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
                      {isThinking || (match.gameType === "rps" && rpsPhase === "waiting" && match.status !== "completed") ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-arena-primary animate-pulse">
                            {match.gameType === "rps" ? "Choosing..." : "Thinking..."}
                          </span>
                          {match.gameType === "rps" ? (
                            rpsSecondsLeft != null && (
                              <span className={`text-[11px] font-mono font-bold tabular-nums ${
                                rpsSecondsLeft <= 5 ? "text-red-500" : rpsSecondsLeft <= 10 ? "text-amber-500" : "text-arena-muted"
                              }`}>
                                {rpsSecondsLeft}s
                              </span>
                            )
                          ) : (
                            turnSecondsLeft != null && (
                              <span className={`text-[11px] font-mono font-bold tabular-nums ${
                                turnSecondsLeft <= 5 ? "text-red-500" : turnSecondsLeft <= 10 ? "text-amber-500" : "text-arena-muted"
                              }`}>
                                {turnSecondsLeft}s
                              </span>
                            )
                          )}
                        </div>
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
                    {/* Escrow TX for this agent */}
                    {(() => {
                      const escrow = (match as any).txHashes?.escrow;
                      if (!Array.isArray(escrow)) return null;
                      const agentTx = escrow.find((e: any) => e.agentId === agent.agentId);
                      if (!agentTx?.txSignature) return null;
                      return (
                        <a
                          href={`https://explorer.solana.com/tx/${agentTx.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[9px] font-mono text-blue-500 hover:text-blue-700 mt-1.5 transition-colors"
                        >
                          <span className="w-1 h-1 rounded-full bg-blue-400" />
                          Stake TX: {agentTx.txSignature.slice(0, 8)}...{agentTx.txSignature.slice(-4)}
                          <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                        </a>
                      );
                    })()}
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
                    {(() => {
                      const raw = typeof match.result === "string" ? match.result : (match.result as any)?.reason;
                      const labels: Record<string, string> = { max_hands: "Hand limit reached", timeout: "Time expired", score: "Score", draw: "Draw", checkmate: "Checkmate", stalemate: "Stalemate", forfeit: "Forfeit" };
                      return labels[raw] || raw || JSON.stringify(match.result);
                    })()}
                  </div>
                )}
                {/* On-chain TX links */}
                <div className="space-y-1 mt-2">
                  {(match as any).txHashes?.payout && (
                    <a href={`https://explorer.solana.com/tx/${(match as any).txHashes.payout}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 hover:text-emerald-800 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Payout TX: {(match as any).txHashes.payout.slice(0, 10)}...
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                    </a>
                  )}
                  {(match as any).txHashes?.fee && (
                    <a href={`https://explorer.solana.com/tx/${(match as any).txHashes.fee}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-mono text-amber-600 hover:text-amber-800 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Fee TX: {(match as any).txHashes.fee.slice(0, 10)}...
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="dash-glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-arena-text mb-3">
              {match.gameType === "poker" ? "Hand History" : match.gameType === "rps" ? "Round History" : "Move History"}
            </h3>
            <div data-move-list className="max-h-[422px] overflow-y-auto space-y-1.5 pr-1">
              {match.gameType === "rps" ? (() => {
                const visibleIdx = (!isLiveMode && replayStep >= 0) ? replayStep + 1 : rpsRounds.length;
                const visibleRounds = rpsRounds.slice(0, visibleIdx);
                return visibleRounds.length === 0 ? (
                  <div className="text-center text-sm text-arena-muted py-4">No rounds yet</div>
                ) : (
                  visibleRounds.map((round, idx) => {
                    const isWinA = round.winner === "a";
                    const isWinB = round.winner === "b";
                    const isDraw = round.winner === "draw";
                    const pAName = agents[0]?.agentName || "A";
                    const pBName = agents[1]?.agentName || "B";
                    const isActive = !isLiveMode && replayStep >= 0 && idx === replayStep;
                    return (
                      <div key={round.roundNumber} className={`flex items-center gap-2 text-sm px-2 py-2 rounded-lg border transition-all ${
                        isActive ? "bg-arena-primary/10 border-arena-primary/30 ring-1 ring-arena-primary/20" : "bg-white/5 border-white/5"
                      }`}>
                        <span className="text-[10px] text-arena-muted font-mono font-bold w-6 shrink-0">R{round.roundNumber}</span>
                        <span className={`flex items-center gap-1 ${isWinA ? "text-arena-primary" : isDraw ? "text-arena-muted" : "text-arena-muted/30"}`}>
                          <span className="text-[10px] font-mono truncate max-w-[60px]">{pAName}</span>
                          {round.throwA ? <RpsThrowIcon type={round.throwA} size={18} /> : <span>?</span>}
                        </span>
                        <span className="text-[9px] text-arena-muted/30 font-mono">vs</span>
                        <span className={`flex items-center gap-1 ${isWinB ? "text-arena-primary" : isDraw ? "text-arena-muted" : "text-arena-muted/30"}`}>
                          {round.throwB ? <RpsThrowIcon type={round.throwB} size={18} /> : <span>?</span>}
                          <span className="text-[10px] font-mono truncate max-w-[60px]">{pBName}</span>
                        </span>
                        <span className="ml-auto text-[10px] font-mono font-bold shrink-0">
                          {isDraw ? (
                            <span className="text-arena-muted">Draw</span>
                          ) : isWinA ? (
                            <span className="text-green-400">{pAName} wins</span>
                          ) : (
                            <span className="text-green-400">{pBName} wins</span>
                          )}
                        </span>
                      </div>
                    );
                  })
                );
              })() : loadingMoves ? (
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
                  const md = move.moveData as any;
                  const { text: display, phase } = formatMoveDisplay(move.moveData, match.gameType, boardBefore);
                  const isActiveReplayMove = (canReplay && replayStep === idx) || (!isLiveMode && replayStep === idx);

                  // Poker: detect hand/street boundaries
                  const isPoker = match.gameType === "poker";
                  const curHand = isPoker ? (md.pokerHandNumber ?? md.handNumber) : null;
                  const prevMd = idx > 0 ? (moves[idx - 1].moveData as any) : null;
                  const prevHand = prevMd ? (prevMd.pokerHandNumber ?? prevMd.handNumber) : null;
                  const isNewHand = isPoker && curHand != null && (idx === 0 || curHand !== prevHand);

                  const curStreet = isPoker ? (md.pokerStreet ?? md.street) : null;
                  const prevStreet = prevMd ? (prevMd.pokerStreet ?? prevMd.street) : null;
                  const isNewStreet = isPoker && !isNewHand && curStreet && curStreet !== prevStreet;

                  // Poker action styling
                  const rawAction = isPoker ? (md.pokerAction || md.action || "") : "";
                  const actionType = (typeof rawAction === "string" ? rawAction : (rawAction as any)?.type || String(rawAction)).toLowerCase();
                  const isFold = actionType === "fold";
                  const isAllIn = actionType === "all-in" || actionType === "allin" || actionType === "all_in";
                  const isRaise = actionType === "raise" || actionType === "bet";

                  const STREET_LABELS: Record<string, string> = { preflop: "Pre-Flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Showdown" };
                  const STREET_COLORS: Record<string, string> = { preflop: "text-blue-400", flop: "text-emerald-400", turn: "text-amber-400", river: "text-red-400", showdown: "text-purple-400" };

                  return (
                    <React.Fragment key={move.id || move._id || idx}>
                      {/* Hand separator */}
                      {isNewHand && (
                        <div className="flex items-center gap-2 py-1.5 mt-1">
                          <div className="h-px flex-1 bg-arena-border-light/50" />
                          <span className="text-[10px] font-mono font-bold text-arena-primary/70 uppercase tracking-wider">
                            Hand #{curHand}
                          </span>
                          <div className="h-px flex-1 bg-arena-border-light/50" />
                        </div>
                      )}
                      {/* Street separator */}
                      {isNewStreet && (
                        <div className="flex items-center gap-1.5 pl-7 py-0.5">
                          <span className={`text-[9px] font-mono font-semibold uppercase tracking-wider ${STREET_COLORS[curStreet] || "text-arena-muted"}`}>
                            {STREET_LABELS[curStreet] || curStreet}
                          </span>
                          <div className="h-px flex-1 bg-arena-border-light/30" />
                        </div>
                      )}
                      {/* Move row */}
                      <div
                        ref={(el) => { if (el) replayMoveRefs.current.set(idx, el); }}
                        className={`rounded-lg px-2.5 py-2 flex items-center gap-2 transition-all cursor-pointer ${
                          isActiveReplayMove
                            ? "bg-arena-primary/15 ring-1 ring-arena-primary/30"
                            : isFold ? "bg-arena-bg/50 opacity-60 hover:opacity-80" : "bg-arena-bg hover:bg-arena-bg/80"
                        }`}
                        onClick={() => {
                          if (canReplay) { setIsLiveMode(false); setReplayStep(idx); setIsAutoPlaying(false); }
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
                        <span className={`text-xs truncate flex-1 ${
                          isAllIn ? "text-red-500 font-bold" : isRaise ? "text-amber-600 font-semibold" : isFold ? "text-arena-muted italic" : "text-arena-text/70"
                        }`}>
                          {display}
                        </span>
                        {isPoker ? (
                          (move.thinkingTimeMs ?? 0) > 0 && (
                            <span className="text-[10px] text-arena-muted/60 font-mono flex-shrink-0">
                              {((move.thinkingTimeMs ?? 0) / 1000).toFixed(1)}s
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-arena-muted flex-shrink-0">
                            {(move.thinkingTimeMs ?? 0) > 0
                              ? `${((move.thinkingTimeMs ?? 0) / 1000).toFixed(1)}s`
                              : formatRelativeTime(move.timestamp)}
                          </span>
                        )}
                      </div>
                    </React.Fragment>
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
                  {formatEarnings(bettingPool.pool.totalPool)} USDC
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

        </div>
      </div>

    </div>
  );
}
