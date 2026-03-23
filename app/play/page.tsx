"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import ChessBoard from "@/components/game/ChessBoard";
import PokerBoard from "@/components/game/PokerBoard";
import type { PlayBalance, PokerCard, PokerLegalActions, Chain } from "@/lib/types";
import type { Socket } from "socket.io-client";
import { useLocalPoker } from "@/lib/poker/useLocalPoker";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import { formatUsdEquivalent } from "@/lib/utils";

type Phase = "lobby" | "queue" | "entering" | "playing" | "result" | "local-poker";

const TURN_TIMEOUT_S = 60;

/* ── Parse agent thinking raw text ── */
function parseAgentThinking(raw: string): { thinking: string; move: string | null } {
  // Try to extract JSON block from the text
  const jsonMatch = raw.match(/\{[\s\S]*"thinking"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Use the parsed thinking text; fall back to text before the JSON
      const before = raw.slice(0, raw.indexOf(jsonMatch[0])).trim();
      const thinkingText = parsed.thinking || before || raw;
      return { thinking: thinkingText, move: parsed.move || null };
    } catch {
      /* not valid JSON, fall through */
    }
  }

  // Try the whole string as JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.thinking) {
      return { thinking: parsed.thinking, move: parsed.move || null };
    }
  } catch {
    /* not JSON */
  }

  // Plain text — strip stray JSON-like artifacts
  const cleaned = raw
    .replace(/\{"thinking":[^}]*\}/g, "")
    .replace(/\{"move":[^}]*\}/g, "")
    .trim();

  return { thinking: cleaned || raw, move: null };
}

/* ── Pulsing ring ── */
function PulseRing() {
  return (
    <div className="relative w-20 h-20 mx-auto">
      <div className="absolute inset-0 rounded-full bg-arena-primary/10 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-arena-primary/20 animate-pulse" />
      <div className="absolute inset-4 rounded-full bg-arena-primary/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full bg-arena-primary animate-pulse" />
      </div>
    </div>
  );
}

function PlayContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const { priceUsd } = useAlphaPrice();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [error, setError] = useState("");

  // Lobby
  const [balance, setBalance] = useState<PlayBalance | null>(null);
  const [gameType, setGameType] = useState("chess");
  const [stakeToken, setStakeToken] = useState<"ALPHA" | "USDC">("ALPHA");
  const [stakeAmount, setStakeAmount] = useState("1");
  const selectedChain: Chain = "solana";
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Match state
  const [agentId, setAgentId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [boardState, setBoardState] = useState<unknown>(null);
  const [gameLegalMoves, setGameLegalMoves] = useState<unknown>([]);
  const [mySide, setMySide] = useState<"a" | "b" | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [turnExpired, setTurnExpired] = useState(false);
  const [matchClock, setMatchClock] = useState<number | null>(null);
  const [playerA, setPlayerA] = useState<string>("");
  const [playerB, setPlayerB] = useState<string>("");
  const [isCheck, setIsCheck] = useState(false);
  const [agentThinking, setAgentThinking] = useState<{ text: string; agentName: string } | null>(null);

  // Local poker (vs AI)
  const [localPokerState, localPokerControls] = useLocalPoker();

  // Poker-specific state (N-player)
  const [pokerHoleCards, setPokerHoleCards] = useState<PokerCard[]>([]);
  const [pokerCommunityCards, setPokerCommunityCards] = useState<PokerCard[]>([]);
  const [pokerPot, setPokerPot] = useState(0);
  const [pokerStreet, setPokerStreet] = useState("preflop");
  const [pokerHandNumber, setPokerHandNumber] = useState(0);
  const [pokerLegalActions, setPokerLegalActions] = useState<PokerLegalActions | null>(null);
  const [pokerSeatIndex, setPokerSeatIndex] = useState(0);
  const [pokerPlayers, setPokerPlayers] = useState<{
    seatIndex: number; stack: number; currentBet: number;
    hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean;
    playerId?: string; name?: string; isAgent?: boolean;
  }[]>([]);
  const [pokerCurrentPlayerIndex, setPokerCurrentPlayerIndex] = useState(0);
  const [pokerDealerIndex, setPokerDealerIndex] = useState(0);
  const [pokerActionHistory, setPokerActionHistory] = useState<{ type: string; amount?: number; playerIndex: number; street: string }[]>([]);
  const [pokerLobbyInfo, setPokerLobbyInfo] = useState<{
    playerCount: number; countdownMs: number | null; players: { name: string }[];
  } | null>(null);

  // Result
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "draw">("draw");
  const [viewers, setViewers] = useState(0);
  const [viewerFlash, setViewerFlash] = useState(false);
  const prevViewersRef = useRef(0);

  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const agentIdRef = useRef<string | null>(null);
  const mySideRef = useRef<"a" | "b" | null>(null);
  const pokerPlayersRef = useRef(pokerPlayers);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const balancePollRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { matchIdRef.current = matchId; }, [matchId]);
  useEffect(() => { agentIdRef.current = agentId; }, [agentId]);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);
  useEffect(() => { pokerPlayersRef.current = pokerPlayers; }, [pokerPlayers]);

  // Derive pokerSeatIndex from mySide for heads-up poker (side "a" = seat 0, "b" = seat 1)
  useEffect(() => {
    if (mySide === "a") setPokerSeatIndex(0);
    else if (mySide === "b") setPokerSeatIndex(1);
  }, [mySide]);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.playBalance(selectedChain);
      setBalance(data);
    } catch {
      /* no play wallet yet */
    }
  }, [selectedChain]);

  // Fetch match state via HTTP — used on restore and after socket switch
  const fetchMatchState = useCallback(async (mid: string, myAgentId?: string | null) => {
    try {
      const { match } = await api.getMatch(mid);
      const m = match as unknown as Record<string, unknown>;

      if (m.status === "completed" || m.status === "cancelled" || m.status === "error") {
        setPhase("lobby");
        return;
      }

      const board = (m.currentBoard ?? m.board) as unknown;
      if (board) {
        setBoardState(board);
        setPhase("playing");
      } else if (m.gameType === "poker" && m.pokerState) {
        // Poker doesn't use traditional board state
        setPhase("playing");
      }

      const agents = m.agents as Record<string, Record<string, unknown>> | undefined;
      const agent = myAgentId ?? agentIdRef.current;
      if (agents && agent) {
        if (agents.a?.agentId === agent) setMySide("a");
        else if (agents.b?.agentId === agent) setMySide("b");
      }

      if (agents?.a?.name) setPlayerA(agents.a.name as string);
      if (agents?.b?.name) setPlayerB(agents.b.name as string);

      const currentTurn = m.currentTurn as string | undefined;
      if (currentTurn && agent) {
        const myTurn =
          (currentTurn === "a" && agents?.a?.agentId === agent) ||
          (currentTurn === "b" && agents?.b?.agentId === agent);
        setIsMyTurn(myTurn);
      }

      // Restore poker state from HTTP
      if (m.gameType) setGameType(m.gameType as string);
      if (m.pokerState) {
        const ps = m.pokerState as Record<string, unknown>;
        if (ps.communityCards) setPokerCommunityCards(ps.communityCards as PokerCard[]);
        if (ps.pot != null) setPokerPot(ps.pot as number);
        if (ps.street) setPokerStreet(ps.street as string);
        if (ps.handNumber != null) setPokerHandNumber(ps.handNumber as number);
        if (ps.currentPlayerIndex != null) setPokerCurrentPlayerIndex(ps.currentPlayerIndex as number);
        if (ps.dealerIndex != null) setPokerDealerIndex(ps.dealerIndex as number);
        if (ps.actionHistory) setPokerActionHistory(ps.actionHistory as { type: string; amount?: number; playerIndex: number; street: string }[]);
        if (ps.players) {
          const players = ps.players as { seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string; name?: string; isAgent?: boolean; holeCards?: PokerCard[] }[];
          setPokerPlayers(players.map(p => ({
            seatIndex: p.seatIndex, stack: p.stack, currentBet: p.currentBet,
            hasFolded: p.hasFolded, isAllIn: p.isAllIn, isDealer: p.isDealer, isEliminated: p.isEliminated,
            playerId: p.playerId, name: p.name, isAgent: p.isAgent,
          })));
          // Find our seat and extract hole cards
          const ourAgent = myAgentId ?? agentIdRef.current;
          if (ourAgent) {
            const ourPlayer = players.find(p => p.playerId === ourAgent);
            if (ourPlayer) {
              setPokerSeatIndex(ourPlayer.seatIndex);
              if (ourPlayer.holeCards) setPokerHoleCards(ourPlayer.holeCards);
            }
          }
        }
      }
    } catch {
      /* fetch failed — WS will handle it */
    }
  }, []);

  // ── On mount: restore state from API ──
  useEffect(() => {
    async function restore() {
      try {
        const status = await api.playStatus();
        if (status.inMatch && status.matchId) {
          setMatchId(status.matchId);
          setAgentId(status.agentId || null);
          if (status.gameType) setGameType(status.gameType);
          await fetchMatchState(status.matchId, status.agentId);
          // fetchMatchState sets phase to "playing" if board is available
          // Otherwise stay in "entering" while on-chain tx completes
          setPhase((prev) => prev === "playing" ? "playing" : "entering");
        } else if (status.inQueue) {
          setAgentId(status.agentId || null);
          if (status.gameType) setGameType(status.gameType);
          setPhase("queue");
        }
      } catch {
        /* stay in lobby */
      }
    }
    restore();
  }, [fetchMatchState]);

  // ── Fetch balance on mount & when chain changes ──
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ── Fallback: if playing with no board data, re-check status ──
  useEffect(() => {
    if (phase !== "playing" || boardState !== null) return;
    const timeout = setTimeout(async () => {
      try {
        const status = await api.playStatus();
        if (!status.inMatch) {
          setPhase("lobby");
          setMatchId(null);
          setAgentId(null);
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [phase, boardState]);

  // ── Balance polling (30s) ──
  useEffect(() => {
    if (phase === "lobby") {
      balancePollRef.current = setInterval(fetchBalance, 30000);
      return () => {
        if (balancePollRef.current) clearInterval(balancePollRef.current);
      };
    }
  }, [phase, fetchBalance]);

  // ── Queue polling fallback (3s with ±500ms jitter) ──
  useEffect(() => {
    if (phase !== "queue") {
      if (queuePollRef.current) clearTimeout(queuePollRef.current);
      return;
    }
    const scheduleQueuePoll = () => {
      const jitter = Math.floor(Math.random() * 1000) - 500; // ±500ms
      queuePollRef.current = setTimeout(async () => {
        try {
          const status = await api.playStatus();
          if (status.inMatch && status.matchId) {
            setMatchId(status.matchId);
            setAgentId(status.agentId || null);
            if (status.gameType) setGameType(status.gameType);
            setPhase("entering");
            return; // Stop polling once matched
          } else if (!status.inQueue) {
            setPhase("lobby");
            return;
          }
        } catch {
          /* ignore */
        }
        scheduleQueuePoll(); // Schedule next poll
      }, 3000 + jitter);
    };
    scheduleQueuePoll();
    return () => {
      if (queuePollRef.current) clearTimeout(queuePollRef.current);
    };
  }, [phase]);

  // ── WebSocket: match event listeners ──
  const attachMatchListeners = useCallback((socket: Socket) => {
    socket.onAny((eventName: string, raw: unknown) => {
      if (eventName !== "message") return;
      let msg: Record<string, unknown>;
      try {
        msg = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      } catch (err) {
        console.error("[play:match] Failed to parse WebSocket message:", err, raw);
        return;
      }
      const type = msg?.type as string | undefined;
      const data = msg?.data as Record<string, unknown> | undefined;
      if (!type || !data) return;

      if (type === "match:start" || type === "match:started") {
        const boardData = (data.currentBoard ?? data.board) as unknown;
        const side = data.side as "a" | "b" | undefined;
        const pA = data.playerA as string | undefined;
        const pB = data.playerB as string | undefined;
        const gt = data.gameType as string | undefined;
        if (boardData) {
          setBoardState(boardData);
          setPhase("playing");
        }
        if (side) setMySide(side);
        if (pA) setPlayerA(pA);
        if (pB) setPlayerB(pB);
        if (gt) setGameType(gt);
        // N-player poker: capture initial player data
        if (data.pokerPlayers) {
          const players = data.pokerPlayers as { seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string; name?: string; isAgent?: boolean }[];
          setPokerPlayers(players);
          // Find our seat by matching agentId
          const myAgent = agentIdRef.current;
          if (myAgent) {
            const myPlayer = players.find(p => p.playerId === myAgent);
            if (myPlayer) setPokerSeatIndex(myPlayer.seatIndex);
          }
        }
        if (data.pokerHandNumber != null) setPokerHandNumber(data.pokerHandNumber as number);
      }

      if (type === "match:your_turn") {
        const moves = data.legalMoves as unknown;
        const boardData = (data.currentBoard ?? data.board) as unknown;
        const timeMs = (data.timeRemainingMs ?? data.timeLimit) as number | undefined;
        const side = data.side as "a" | "b" | undefined;
        const check = !!(data.isCheck ?? data.check ?? data.inCheck);

        // Always update shared board/phase state
        if (boardData) {
          setBoardState(boardData);
          setPhase("playing");
        }
        setPhase("playing");

        // Poker N-player: update shared state for ALL clients
        if (data.pokerCommunityCards) setPokerCommunityCards(data.pokerCommunityCards as PokerCard[]);
        if (data.pokerPot != null) setPokerPot(data.pokerPot as number);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet as string);
        if (data.pokerHandNumber != null) {
          setPokerHandNumber((prev: number) => {
            if ((data.pokerHandNumber as number) > prev) {
              // New hand: reset stale state
              setPokerHoleCards([]);
              setPokerActionHistory([]);
              setPokerCommunityCards(data.pokerCommunityCards as PokerCard[] ?? []);
              // Reset player fold/allIn/bet flags
              setPokerPlayers(cur => cur.map(p => ({
                ...p,
                hasFolded: false,
                isAllIn: false,
                currentBet: 0,
              })));
            }
            return data.pokerHandNumber as number;
          });
        }
        if (data.pokerActionHistory) setPokerActionHistory(data.pokerActionHistory as { type: string; amount?: number; playerIndex: number; street: string }[]);

        // Active player's seat (whose turn it is) — derive from side if not explicit
        const activeSeat = (data.pokerCurrentPlayerIndex ?? data.pokerSeatIndex ?? (side === "a" ? 0 : side === "b" ? 1 : undefined)) as number | undefined;
        if (activeSeat != null) setPokerCurrentPlayerIndex(activeSeat);

        // Update player list and determine our own seat via playerId match
        let mySeat: number | undefined;
        if (data.pokerPlayers) {
          const incoming = data.pokerPlayers as { seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string; name?: string; isAgent?: boolean }[];
          setPokerPlayers(prev => incoming.map(p => {
            const existing = prev.find(e => e.seatIndex === p.seatIndex);
            return { ...p, name: p.name ?? existing?.name, playerId: p.playerId ?? existing?.playerId };
          }));
          const dealer = incoming.findIndex(p => p.isDealer);
          if (dealer !== -1) setPokerDealerIndex(dealer);
          // Find our seat by matching agentId
          const myAgent = agentIdRef.current;
          if (myAgent) {
            const myPlayer = incoming.find(p => p.playerId === myAgent);
            if (myPlayer) {
              mySeat = myPlayer.seatIndex;
              setPokerSeatIndex(mySeat);
            }
          }
        }

        // Determine if this turn event is for US
        // For poker: try seat matching first (N-player), fall back to side matching (heads-up)
        // If mySide is not yet set (hand 1 race condition), accept the turn — the backend only sends
        // match:your_turn to the correct player via resendPendingTurn
        const isPoker = data.gameType === "poker" || (data.pokerPlayers && !boardData);
        const mySideUnknown = mySideRef.current == null;
        const isForMe = mySideUnknown
          ? true // Accept — backend verified it's our turn before sending
          : isPoker
          ? (mySeat != null && activeSeat != null && mySeat === activeSeat) || (side != null && side === mySideRef.current)
          : side != null && side === mySideRef.current;

        if (isForMe) {
          if (side) setMySide(side);
          setIsMyTurn(true);
          setTurnExpired(false);
          setIsCheck(check);
          setTurnTimer(TURN_TIMEOUT_S);
          setAgentThinking(null); // Clear agent reasoning when it's our turn
          if (timeMs) setMatchClock(Math.ceil(timeMs / 1000));
          if (moves) setGameLegalMoves(moves);
          if (data.pokerHoleCards) setPokerHoleCards(data.pokerHoleCards as PokerCard[]);
          // Extract poker legal actions from legalMoves[0]
          if (isPoker && Array.isArray(moves) && moves.length > 0) {
            setPokerLegalActions(moves[0] as PokerLegalActions);
          }
        } else {
          // Not our turn — clear turn-related state
          setIsMyTurn(false);
          setPokerLegalActions(null);
          setTurnTimer(null);
        }
      }

      if (type === "match:move") {
        const boardData = (data.currentBoard ?? data.boardState ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);

        const timeMs = (data.timeRemainingMs ?? data.timeLimit) as number | undefined;
        if (timeMs) setMatchClock(Math.ceil(timeMs / 1000));

        // Only clear turn state if this was MY move.
        const moveAgentId = (data.agentId ?? data.agent) as string | undefined;
        if (moveAgentId && moveAgentId === agentIdRef.current) {
          setIsMyTurn(false);
          setIsCheck(false);
          setGameLegalMoves([]);
          setPokerLegalActions(null);
          setTurnTimer(null);
        }
        // Poker: update shared state from any move (N-player)
        if (data.pokerCommunityCards) setPokerCommunityCards(data.pokerCommunityCards as PokerCard[]);
        if (data.pokerPot != null) setPokerPot(data.pokerPot as number);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet as string);
        if (data.pokerHandNumber != null) {
          setPokerHandNumber((prev: number) => {
            if ((data.pokerHandNumber as number) > prev) {
              setPokerHoleCards([]);
              setPokerActionHistory([]);
              setPokerCommunityCards(data.pokerCommunityCards as PokerCard[] ?? []);
              setPokerPlayers(cur => cur.map(p => ({
                ...p,
                hasFolded: false,
                isAllIn: false,
                currentBet: 0,
              })));
            }
            return data.pokerHandNumber as number;
          });
        }
        if (data.pokerPlayers) {
          const incoming = data.pokerPlayers as { seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string; name?: string; isAgent?: boolean }[];
          // Merge names/playerId/isAgent from existing state if missing in update
          setPokerPlayers(prev => incoming.map(p => {
            const existing = prev.find(e => e.seatIndex === p.seatIndex);
            return { ...p, name: p.name ?? existing?.name, playerId: p.playerId ?? existing?.playerId, isAgent: p.isAgent ?? existing?.isAgent };
          }));
          const dealer = incoming.findIndex(p => p.isDealer);
          if (dealer !== -1) setPokerDealerIndex(dealer);
        }
        if (data.pokerPlayerIndex != null) setPokerCurrentPlayerIndex(data.pokerPlayerIndex as number);
        if (data.pokerAction) {
          const action = data.pokerAction as { type: string; amount?: number };
          const side = data.side as string | undefined;
          const pIdx = (data.pokerPlayerIndex as number) ?? (side === "a" ? 0 : side === "b" ? 1 : 0);
          setPokerActionHistory((prev) => [...prev, {
            type: action.type,
            amount: action.amount,
            playerIndex: pIdx,
            street: (data.pokerStreet as string) || "preflop",
          }]);
        }
      }

      if (type === "match:viewers" || (type === "match:state" && data.viewers != null)) {
        setViewers(data.viewers as number);
      }

      if (type === "match:state") {
        // Sent on reconnect — restore full board + turn state
        const boardData = (data.currentBoard ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);
        const currentTurn = data.currentTurn as string | undefined;
        const agents = data.agents as Record<string, Record<string, unknown>> | undefined;
        const agent = agentIdRef.current;
        if (agents && agent) {
          if (agents.a?.agentId === agent) setMySide("a");
          else if (agents.b?.agentId === agent) setMySide("b");
        }
        if (currentTurn && agent && agents) {
          const myTurn =
            (currentTurn === "a" && agents.a?.agentId === agent) ||
            (currentTurn === "b" && agents.b?.agentId === agent);
          setIsMyTurn(myTurn);
        }
        // Poker state restoration on reconnect
        if (data.pokerPlayers) {
          const players = data.pokerPlayers as { seatIndex: number; stack: number; currentBet: number; hasFolded: boolean; isAllIn: boolean; isDealer: boolean; isEliminated: boolean; playerId?: string; name?: string; isAgent?: boolean }[];
          setPokerPlayers(players);
          const dealer = players.findIndex(p => p.isDealer);
          if (dealer !== -1) setPokerDealerIndex(dealer);
          // Find our seat by matching agentId
          const myAgent = agentIdRef.current;
          if (myAgent) {
            const myPlayer = players.find(p => p.playerId === myAgent);
            if (myPlayer) setPokerSeatIndex(myPlayer.seatIndex);
          }
        }
        if (data.pokerCommunityCards) setPokerCommunityCards(data.pokerCommunityCards as PokerCard[]);
        if (data.pokerPot != null) setPokerPot(data.pokerPot as number);
        if (data.pokerStreet) setPokerStreet(data.pokerStreet as string);
        if (data.pokerHoleCards) setPokerHoleCards(data.pokerHoleCards as PokerCard[]);
        // Don't overwrite pokerSeatIndex from event — we derive it from playerId above
        if (data.pokerHandNumber != null) setPokerHandNumber(data.pokerHandNumber as number);
        if (data.pokerCurrentPlayerIndex != null) setPokerCurrentPlayerIndex(data.pokerCurrentPlayerIndex as number);
        if (data.pokerActionHistory) setPokerActionHistory(data.pokerActionHistory as { type: string; amount?: number; playerIndex: number; street: string }[]);
        if (data.gameType) setGameType(data.gameType as string);
      }

      if (type === "agent:thinking") {
        // Update poker seat highlight
        if (data.pokerSeatIndex != null) {
          setPokerCurrentPlayerIndex(data.pokerSeatIndex as number);
        }
        const rawText = (data.raw ?? data.text ?? data.thinking ?? data.content ?? data.message) as string | undefined;
        if (rawText) {
          // Resolve agent name from poker players or fallback labels
          const agentId = data.agentId as string | undefined;
          const seatIdx = data.pokerSeatIndex as number | undefined;
          let agentName = "Agent";
          if (seatIdx != null) {
            const player = pokerPlayersRef.current.find(p => p.seatIndex === seatIdx);
            if (player?.name) agentName = player.name;
          }
          if (agentName === "Agent" && agentId) {
            const player = pokerPlayersRef.current.find(p => p.playerId === agentId);
            if (player?.name) agentName = player.name;
          }
          if (agentName === "Agent") {
            const side = data.side as string | undefined;
            if (side === "a" && playerA) agentName = playerA;
            else if (side === "b" && playerB) agentName = playerB;
          }
          setAgentThinking({ text: rawText, agentName });
        }
      }

      if (type === "match:end" || type === "match:ended") {
        const boardData = (data.currentBoard ?? data.boardState ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);
        setIsMyTurn(false);
        setIsCheck(false);
        setGameLegalMoves([]);
        setTurnTimer(null);
        setMatchClock(null);

        const result = data.result as Record<string, unknown> | undefined;
        const reason = (result?.reason ?? data.reason) as string | undefined;
        const outcome = data.outcome as string | undefined;
        const myAgent = agentIdRef.current;
        const side = mySideRef.current;

        // Extract winnerId — could be a string agentId, a side letter, or nested in an object
        let winnerId: string | undefined;
        for (const src of [result, data]) {
          if (!src) continue;
          const r = src as Record<string, unknown>;
          const w = r.winnerId ?? r.winner;
          if (typeof w === "string") { winnerId = w; break; }
          if (typeof w === "object" && w && (w as Record<string, unknown>).agentId) {
            winnerId = (w as Record<string, unknown>).agentId as string;
            break;
          }
        }

        const isDraw = !winnerId || winnerId === "draw" || reason === "draw" || outcome === "draw";
        const iWon = !isDraw && (
          winnerId === myAgent ||    // winnerId is my agentId
          winnerId === side ||       // winnerId is my side letter ("a"/"b")
          winnerId === "you" ||      // explicit "you"
          outcome === "win"          // outcome field says I won
        );

        if (isDraw) {
          setResultType("draw");
          setResultMessage(t.play.draw);
        } else if (iWon) {
          setResultType("win");
          setResultMessage(reason === "checkmate" ? t.play.checkmate : t.play.youWin);
        } else {
          setResultType("lose");
          setResultMessage(reason === "checkmate" ? t.play.checkmate : t.play.youLose);
        }
        setPhase("result");
      }
    });
  }, [t.play.draw, t.play.youWin, t.play.youLose, t.play.checkmate]);

  // Switch from queue socket to match socket — keep old socket alive until new one connects
  const switchToMatchSocket = useCallback((mid: string) => {
    const oldSocket = socketRef.current;
    const matchSocket = api.connectMatchSocket(mid, "player");
    if (!matchSocket) return;
    socketRef.current = matchSocket;
    attachMatchListeners(matchSocket);

    // Fetch initial state via HTTP since we likely missed match:start / match:your_turn
    matchSocket.on("connect", () => {
      // Now that the new socket is connected, disconnect the old one
      if (oldSocket) {
        oldSocket.disconnect();
      }
      fetchMatchState(mid);
    });
  }, [attachMatchListeners, fetchMatchState]);

  // ── WebSocket effect ──
  useEffect(() => {
    if (phase === "local-poker" || (phase !== "queue" && phase !== "entering" && phase !== "playing")) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) return;

    // Restoring mid-match — validate matchId is still active before connecting
    if (matchIdRef.current) {
      const mid = matchIdRef.current;
      api.playStatus().then((status) => {
        // If the match is no longer active, go back to lobby
        if (!status.inMatch || status.matchId !== mid) {
          setPhase("lobby");
          setMatchId(null);
          setAgentId(null);
          matchIdRef.current = null;
          return;
        }
        if (socketRef.current) return; // Socket already set up while we were checking
        const socket = api.connectMatchSocket(mid, "player");
        if (!socket) return;
        socketRef.current = socket;
        attachMatchListeners(socket);
      }).catch(() => {
        // On error, still try to connect (optimistic)
        if (socketRef.current) return;
        const socket = api.connectMatchSocket(mid, "player");
        if (!socket) return;
        socketRef.current = socket;
        attachMatchListeners(socket);
      });
      return;
    }

    // Queue → listen for matchmaking:matched
    const socket = api.connectSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.onAny((eventName: string, raw: unknown) => {
      if (eventName !== "message") return;
      let msg: Record<string, unknown>;
      try {
        msg = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      } catch (err) {
        console.error("[play:queue] Failed to parse WebSocket message:", err, raw);
        return;
      }
      const type = msg?.type as string | undefined;
      const data = msg?.data as Record<string, unknown> | undefined;
      if (!type || !data) return;

      if (type === "matchmaking:matched") {
        const mid = data.matchId as string;
        if (mid) {
          matchIdRef.current = mid;
          setMatchId(mid);
          if (data.gameType) setGameType(data.gameType as string);
          setPokerLobbyInfo(null);
          setPhase("entering");
          switchToMatchSocket(mid);
        }
      }

      if (type === "poker:lobby_update") {
        setPokerLobbyInfo({
          playerCount: data.playerCount as number,
          countdownMs: data.countdownMs as number | null,
          players: (data.players as { name: string }[]) ?? [],
        });
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, attachMatchListeners, switchToMatchSocket]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ── Turn timer countdown ──
  useEffect(() => {
    if (!isMyTurn || turnTimer === null || turnTimer <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isMyTurn && turnTimer === 0) setTurnExpired(true);
      return;
    }
    timerRef.current = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTurnExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, turnTimer !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const joiningRef = useRef(false);
  const handleJoinQueue = async () => {
    if (joiningRef.current) return; // Prevent duplicate clicks
    joiningRef.current = true;
    setError("");
    setJoining(true);
    try {
      await api.playCancel().catch(() => {});
      const result = await api.playJoin({ gameType, stakeAmount: parseFloat(stakeAmount) || 1, token: stakeToken });
      setAgentId(result.agentId);
      // Check if already matched (race condition: match may start during playJoin)
      const status = await api.playStatus().catch(() => null);
      if (status?.inMatch && status.matchId) {
        setMatchId(status.matchId);
        if (status.gameType) setGameType(status.gameType);
        setPhase("entering");
      } else {
        setPhase("queue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.play.joinFailed);
    } finally {
      setJoining(false);
      joiningRef.current = false;
    }
  };

  const handleCancelQueue = async () => {
    setCancelling(true);
    try {
      await api.playCancel();
      setPhase("lobby");
      setAgentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.play.cancelFailed);
    } finally {
      setCancelling(false);
    }
  };

  const handleGameMove = async (move: unknown) => {
    const mid = matchId || matchIdRef.current;
    if (!mid) return;
    setIsMyTurn(false);
    setGameLegalMoves([]);
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:move", { matchId: mid, move });
    } else {
      try {
        await api.playMove(mid, move);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.play.moveFailed);
        setIsMyTurn(true);
      }
    }
  };

  const handleChessMove = (move: string) => handleGameMove(move);
  const handlePokerAction = (action: { action: string; amount?: number }) => {
    setPokerLegalActions(null);
    handleGameMove(action);
  };

  const resetState = () => {
    setPhase("lobby");
    setMatchId(null);
    setAgentId(null);
    setBoardState(null);
    setGameLegalMoves([]);
    setMySide(null);
    setIsMyTurn(false);
    setIsCheck(false);
    setTurnTimer(null);
    setTurnExpired(false);
    setMatchClock(null);
    setResultMessage("");
    setPlayerA("");
    setPlayerB("");
    setAgentThinking(null);
    setPokerPlayers([]);
    setPokerActionHistory([]);
    setPokerSeatIndex(0);
    setPokerCurrentPlayerIndex(0);
    setPokerDealerIndex(0);
    setPokerLobbyInfo(null);
    fetchBalance();
  };

  const handlePlayAgain = async () => {
    await api.playCancel().catch(() => {});
    resetState();
  };

  const handleAbandonMatch = async () => {
    await api.playCancel().catch(() => {});
    resetState();
  };

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

  // ── Board renderer ──
  const renderBoard = (interactive: boolean) => {
    const canInteract = interactive && !turnExpired;
    if (gameType === "chess") {
      return (
        <ChessBoard
          board={boardState as number[][] | null}
          legalMoves={canInteract ? (gameLegalMoves as string[] || []) : []}
          mySide={mySide}
          isMyTurn={canInteract ? isMyTurn : false}
          isCheck={canInteract ? isCheck : false}
          onMove={canInteract ? handleChessMove : undefined}
        />
      );
    }
    if (gameType === "poker") {
      // Build players array from backend N-player data
      const seatNames: Record<number, string> = { 0: playerA, 1: playerB };
      const onlinePlayers = pokerPlayers.length > 0
        ? pokerPlayers.map((p, i) => ({
            id: p.playerId ?? `p${i}`,
            name: p.name || seatNames[p.seatIndex] || (p.seatIndex === pokerSeatIndex ? "YOU" : `Player ${p.seatIndex + 1}`),
            seatIndex: p.seatIndex,
            stack: p.stack,
            currentBet: p.currentBet,
            hasFolded: p.hasFolded,
            isAllIn: p.isAllIn,
            isEliminated: p.isEliminated,
            isDealer: p.isDealer,
            isHuman: p.seatIndex === pokerSeatIndex,
            isAgent: p.isAgent ?? false,
            holeCards: p.seatIndex === pokerSeatIndex ? pokerHoleCards : undefined,
          }))
        : [
            { id: "a", name: playerA || "Player A", seatIndex: 0, stack: 0, currentBet: 0, hasFolded: false, isAllIn: false, isEliminated: false, isDealer: false, isHuman: true, isAgent: false },
            { id: "b", name: playerB || "Player B", seatIndex: 1, stack: 0, currentBet: 0, hasFolded: false, isAllIn: false, isEliminated: false, isDealer: false, isHuman: false, isAgent: false },
          ];
      const humanIdx = onlinePlayers.findIndex(p => p.isHuman);
      return (
        <PokerBoard
          communityCards={pokerCommunityCards}
          pot={pokerPot}
          street={pokerStreet}
          handNumber={pokerHandNumber}
          players={onlinePlayers}
          humanPlayerIndex={humanIdx >= 0 ? humanIdx : 0}
          currentPlayerIndex={pokerCurrentPlayerIndex}
          dealerIndex={pokerDealerIndex}
          actionHistory={pokerActionHistory}
          isMyTurn={interactive ? isMyTurn : false}
          legalActions={interactive ? pokerLegalActions : null}
          onAction={interactive ? handlePokerAction : undefined}
        />
      );
    }
    return (
      <div className="text-center text-arena-muted py-8">Unsupported game type</div>
    );
  };

  // Player labels
  const isChess = gameType === "chess";
  const sideALabel = isChess ? t.play.white : t.play.black;
  const sideBLabel = isChess ? t.play.black : t.play.white;
  const sideAColor = isChess ? "#fff" : "#222";
  const sideBColor = isChess ? "#222" : "#fff";

  // ── Render ──
  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text mb-2">
            {t.play.title}
          </h1>
          <p className="text-arena-muted leading-relaxed">{t.play.subtitle}</p>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ════════ LOBBY ════════ */}
        {phase === "lobby" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <Card>
              <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30 flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-arena-text">{t.play.balance}</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Solana
                </span>
              </div>
              <div className="p-6">
                {balance ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {/* ALPHA */}
                      <div className="flex items-center gap-2.5 bg-arena-primary/5 border border-arena-primary/10 rounded-lg px-3 py-2">
                        <img src="/tokens/alpha.jpg" alt="ALPHA" className="w-7 h-7 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-extrabold font-mono tabular-nums text-arena-primary">{Number(balance.alpha).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] text-arena-muted font-mono">ALPHA</span>
                            {(() => { const usd = formatUsdEquivalent(parseFloat(balance.alpha) || 0, priceUsd); return usd ? <span className="text-[10px] text-arena-muted">({usd})</span> : null; })()}
                          </div>
                        </div>
                      </div>
                      {/* USDC */}
                      <div className="flex items-center gap-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-2">
                        <img src="/tokens/usdc.jpg" alt="USDC" className="w-7 h-7 rounded-full shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-extrabold font-mono tabular-nums text-emerald-600">{Number(balance.usdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-arena-muted font-mono">USDC</span>
                        </div>
                      </div>
                      {/* SOL */}
                      <div className="flex items-center gap-2.5 bg-purple-50/30 border border-purple-100/50 rounded-lg px-3 py-1.5">
                        <img src="/tokens/solana.jpg" alt="SOL" className="w-6 h-6 rounded-full shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold font-mono tabular-nums text-purple-600">{Number(balance.sol || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                          <span className="text-[10px] text-arena-muted font-mono">SOL</span>
                        </div>
                      </div>
                    </div>
                    {balance.walletAddress && (
                      <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2">
                        <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">
                          {t.play.depositAddress} (Solana)
                        </div>
                        <div className="text-xs font-mono text-arena-text break-all">{balance.walletAddress}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-arena-muted font-mono">{t.common.loading}</div>
                )}
              </div>
            </Card>

            <div className="dash-glass-card rounded-2xl overflow-hidden">
              {/* Header with gradient accent */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-arena-primary/5 via-transparent to-arena-accent/5">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-arena-primary via-arena-primary-light to-arena-accent" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-arena-primary/10 flex items-center justify-center ring-1 ring-inset ring-arena-primary/5">
                    <svg className="w-5 h-5 text-arena-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">{t.play.joinQueue}</h2>
                    <p className="text-[11px] text-arena-muted">Play against AI agents in real-time</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Game type selector */}
                <div>
                  <label className="block text-[10px] text-arena-muted uppercase tracking-widest font-mono font-semibold mb-2">{t.play.gameType}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "chess", label: "Chess", icon: "\u265F" },
                      { value: "poker", label: "Poker", icon: "\u2660" },
                    ].map((game) => (
                      <button
                        key={game.value}
                        onClick={() => setGameType(game.value)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                          gameType === game.value
                            ? "bg-arena-primary/10 text-arena-primary border-arena-primary/30 ring-1 ring-arena-primary/20 shadow-sm"
                            : "bg-white text-arena-muted border-arena-border-light hover:border-arena-primary/20 hover:text-arena-text"
                        }`}
                      >
                        <span className="text-lg">{game.icon}</span>
                        {game.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chain badge */}
                <div>
                  <label className="block text-[10px] text-arena-muted uppercase tracking-widest font-mono font-semibold mb-2">{t.common.chain}</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50/80 border border-purple-200/60">
                    <img src="/tokens/solana.jpg" alt="SOL" className="w-5 h-5 rounded-full" />
                    <span className="text-sm font-semibold text-purple-700">Solana</span>
                    <span className="ml-auto w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  </div>
                </div>

                {/* Stake token selector */}
                <div>
                  <label className="block text-[10px] text-arena-muted uppercase tracking-widest font-mono font-semibold mb-2">Stake Token</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "ALPHA" as const, icon: "/tokens/alpha.jpg", color: "text-arena-accent", bg: "bg-arena-accent/10", border: "border-arena-accent/30", ring: "ring-arena-accent/20" },
                      { value: "USDC" as const, icon: "/tokens/usdc.jpg", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-300", ring: "ring-emerald-200" },
                    ]).map((token) => (
                      <button
                        key={token.value}
                        onClick={() => setStakeToken(token.value)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                          stakeToken === token.value
                            ? `${token.bg} ${token.color} ${token.border} ring-1 ${token.ring} shadow-sm`
                            : "bg-white text-arena-muted border-arena-border-light hover:border-arena-primary/20 hover:text-arena-text"
                        }`}
                      >
                        <img src={token.icon} alt={token.value} className="w-5 h-5 rounded-full" />
                        {token.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake amount */}
                <div className="relative bg-gradient-to-br from-arena-bg/80 to-white border border-arena-border-light/60 rounded-xl px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-arena-muted font-mono font-semibold uppercase tracking-widest">{t.play.entryFee}</span>
                    <span className="text-[9px] text-arena-muted/60 font-mono">min: 1 · max: 1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src={stakeToken === "USDC" ? "/tokens/usdc.jpg" : "/tokens/alpha.jpg"} alt={stakeToken} className="w-6 h-6 rounded-full" />
                    <input
                      type="number"
                      min="1"
                      max="1"
                      step="1"
                      value={stakeAmount}
                      disabled
                      className="flex-1 text-xl font-extrabold font-mono tabular-nums text-arena-text-bright bg-transparent outline-none cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className={`text-xs font-mono font-semibold ${stakeToken === "USDC" ? "text-emerald-600" : "text-arena-accent"}`}>{stakeToken}</span>
                  </div>
                  {stakeToken === "USDC" && (
                    <p className="text-[10px] text-arena-muted/60 mt-1.5">~${parseFloat(stakeAmount || "0").toFixed(2)} USD</p>
                  )}
                  {stakeToken === "ALPHA" && (() => { const usd = formatUsdEquivalent(parseFloat(stakeAmount || "0"), priceUsd); return usd ? <p className="text-[10px] text-arena-muted/60 mt-1.5">{usd}</p> : null; })()}
                  <p className="text-[10px] text-arena-muted/60 mt-1">{t.play.entryFeeDesc}</p>
                </div>

                {/* Join button */}
                <button
                  onClick={handleJoinQueue}
                  disabled={joining}
                  className="w-full relative overflow-hidden px-6 py-4 rounded-xl font-display font-bold text-base text-white bg-gradient-to-r from-arena-primary via-arena-primary to-arena-primary-light shadow-lg shadow-arena-primary/20 hover:shadow-xl hover:shadow-arena-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {joining ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                    )}
                    {joining ? t.common.loading : t.play.joinQueue}
                  </span>
                </button>

                {/* Local poker vs AI */}
                {gameType === "poker" && (
                  <button
                    onClick={() => {
                      setPhase("local-poker");
                      localPokerControls.startMatchmaking();
                    }}
                    className="w-full px-5 py-3.5 rounded-xl border-2 border-dashed border-arena-primary/20 text-arena-primary font-display font-semibold text-sm hover:bg-arena-primary/5 hover:border-arena-primary/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                    Practice vs AI (Free)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ QUEUE ════════ */}
        {phase === "queue" && (
          <div
            className="bg-white border border-arena-primary/30 rounded-2xl p-8 shadow-arena relative overflow-hidden opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-primary via-arena-primary-light to-arena-primary rounded-l-2xl" />
            <div className="text-center space-y-5">
              <PulseRing />
              <h2 className="text-xl font-display font-bold text-arena-text">{t.play.waiting}</h2>
              <p className="text-sm text-arena-muted max-w-sm mx-auto">{t.play.waitingDesc}</p>

              {/* Poker lobby info */}
              {gameType === "poker" && pokerLobbyInfo && (
                <div className="space-y-3 max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-bold font-mono tabular-nums text-arena-primary">
                      {pokerLobbyInfo.playerCount}
                    </span>
                    <span className="text-sm text-arena-muted">/9 players</span>
                    {pokerLobbyInfo.countdownMs != null && pokerLobbyInfo.countdownMs > 0 && (
                      <>
                        <span className="text-arena-border-light">|</span>
                        <span className="text-lg font-bold font-mono tabular-nums text-arena-accent">
                          {Math.ceil(pokerLobbyInfo.countdownMs / 1000)}s
                        </span>
                      </>
                    )}
                  </div>
                  {pokerLobbyInfo.players.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {pokerLobbyInfo.players.map((p, i) => (
                        <span key={i} className="text-xs bg-arena-primary/10 text-arena-primary px-2 py-1 rounded-full font-medium">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button variant="danger" onClick={handleCancelQueue} isLoading={cancelling}>
                {t.play.cancelQueue}
              </Button>
            </div>
          </div>
        )}

        {/* ════════ ENTERING MATCH ════════ */}
        {phase === "entering" && (
          <div
            className="bg-white border border-arena-accent/30 rounded-2xl p-10 shadow-arena relative overflow-hidden opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-accent via-arena-primary to-arena-accent rounded-l-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-arena-primary/[0.02] via-transparent to-arena-accent/[0.03]" />
            <div className="relative text-center space-y-6">
              {/* Animated chess/game icon */}
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-arena-primary/10 animate-pulse" />
                <div className="absolute inset-2 rounded-xl bg-arena-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">
                    {gameType === "chess" ? "\u265A" : "\u{1F0CF}"}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-display font-bold text-arena-text mb-2">
                  {t.play.enteringMatch}
                </h2>
                <p className="text-sm text-arena-muted max-w-sm mx-auto">
                  {t.play.enteringMatchDesc}
                </p>
              </div>

              {/* Progress steps */}
              <div className="flex items-center justify-center gap-3 text-xs text-arena-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-arena-success" />
                  <span>Matched</span>
                </span>
                <div className="w-6 border-t border-arena-border-light" />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-arena-primary animate-pulse" />
                  <span>On-chain setup</span>
                </span>
                <div className="w-6 border-t border-dashed border-arena-border-light" />
                <span className="flex items-center gap-1.5 opacity-40">
                  <span className="w-2 h-2 rounded-full bg-arena-muted/40" />
                  <span>Game start</span>
                </span>
              </div>

              {matchId && (
                <div className="text-[10px] text-arena-muted/50 font-mono">
                  Match: {matchId}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ PLAYING ════════ */}
        {phase === "playing" && (
          <div className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Board */}
              <div className="lg:col-span-2 relative">
                <Card>
                  <div className="flex items-center justify-end px-4 pt-3 sm:px-6 sm:pt-4">
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
                  </div>
                  <div className="p-4 sm:p-6 pt-2 sm:pt-2">{renderBoard(true)}</div>
                </Card>
                {turnExpired && phase === "playing" && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-14 h-14 rounded-full bg-arena-danger/20 border-2 border-arena-danger/40 flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-arena-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-white font-display font-bold text-lg">{t.play.turnExpired}</p>
                      <p className="text-white/60 text-sm">{t.play.turnExpiredDesc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-3">
                {/* Check warning */}
                {isCheck && isMyTurn && gameType === "chess" && (
                  <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-2.5 animate-pulse">
                    <span className="text-red-500 text-lg">&#9888;</span>
                    <span className="text-sm font-display font-bold text-red-600">{t.play.check}!</span>
                  </div>
                )}

                {/* Turn indicator + Timer */}
                <Card>
                  <div className="p-5 space-y-3">
                    <div className={`flex items-center justify-between ${isMyTurn ? "text-arena-primary" : "text-arena-muted"}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isMyTurn ? "bg-arena-primary animate-pulse" : "bg-arena-muted/40"}`} />
                        <span className="text-base font-display font-bold">
                          {isMyTurn ? t.play.yourTurn : t.play.opponentTurn}
                        </span>
                      </div>
                      {turnTimer !== null && isMyTurn && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-2xl font-bold font-mono tabular-nums ${turnTimer <= 5 ? "text-arena-danger animate-pulse" : turnTimer <= 10 ? "text-arena-accent" : "text-arena-primary"}`}>{turnTimer}</span>
                          <span className="text-[10px] text-arena-muted">s</span>
                        </div>
                      )}
                    </div>
                    {matchClock !== null && (
                      <div className="flex items-center justify-between pt-2 border-t border-arena-border-light/60">
                        <span className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">{t.play.matchClock}</span>
                        <span className="text-sm font-mono tabular-nums text-arena-muted">
                          {Math.floor(matchClock / 60)}:{(matchClock % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Players */}
                <Card>
                  <div className="p-4">
                    {gameType === "poker" && pokerPlayers.length > 0 ? (
                      <>
                        <h3 className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-3">
                          Players ({pokerPlayers.filter(p => !p.isEliminated).length} active)
                        </h3>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {pokerPlayers.map((player, idx) => (
                            <div key={player.playerId ?? `p${idx}`} className={`
                              flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-sm
                              ${idx === pokerCurrentPlayerIndex ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""}
                              ${player.isEliminated ? "opacity-30" : ""}
                              ${player.hasFolded && !player.isEliminated ? "opacity-50" : ""}
                            `}>
                              <div className="w-2 h-2 rounded-full shrink-0" style={{
                                backgroundColor: player.isEliminated ? "#666" :
                                  player.hasFolded ? "#999" :
                                  player.isAgent ? "#F59E0B" :
                                  player.seatIndex === pokerSeatIndex ? "#10B981" : "#8B5CF6"
                              }} />
                              <span className={`truncate flex-1 ${player.isEliminated ? "line-through" : ""}`}>
                                {player.name ?? `Player ${idx + 1}`}{player.isAgent ? "(A)" : ""}
                              </span>
                              {player.seatIndex === pokerSeatIndex && (
                                <span className="text-[8px] bg-arena-primary/10 text-arena-primary px-1 py-0.5 rounded-full uppercase tracking-wider font-bold">YOU</span>
                              )}
                              {player.isDealer && (
                                <span className="w-4 h-4 rounded-full bg-yellow-400 text-black text-[7px] font-extrabold flex items-center justify-center">D</span>
                              )}
                              <span className="text-xs font-mono text-arena-muted/60 tabular-nums">{player.stack}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2.5">
                        <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                          !isMyTurn && mySide !== "a" ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""
                        }`}>
                          <div
                            className="w-5 h-5 rounded-full shadow-sm border border-black/10 shrink-0"
                            style={{ backgroundColor: sideAColor }}
                          />
                          <span className="text-sm text-arena-text font-medium truncate">{playerA || sideALabel}</span>
                          {mySide === "a" && (
                            <span className="text-[9px] bg-arena-primary/10 text-arena-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ml-auto">
                              {t.play.you}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 px-3">
                          <div className="flex-1 border-t border-arena-border-light/60" />
                          <span className="text-[10px] text-arena-muted font-mono">VS</span>
                          <div className="flex-1 border-t border-arena-border-light/60" />
                        </div>
                        <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                          !isMyTurn && mySide !== "b" ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""
                        }`}>
                          <div
                            className="w-5 h-5 rounded-full shadow-sm border border-black/10 shrink-0"
                            style={{ backgroundColor: sideBColor }}
                          />
                          <span className="text-sm text-arena-text font-medium truncate">{playerB || sideBLabel}</span>
                          {mySide === "b" && (
                            <span className="text-[9px] bg-arena-primary/10 text-arena-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ml-auto">
                              {t.play.you}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Match info + Abandon */}
                <div className="pt-1 space-y-2">
                  {matchId && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-arena-muted/60 font-mono uppercase tracking-wider">Match</span>
                      <span className="text-[10px] font-mono text-arena-muted/60 truncate">{matchId}</span>
                    </div>
                  )}
                  <button
                    onClick={handleAbandonMatch}
                    className="w-full text-xs text-arena-danger/70 hover:text-arena-danger hover:bg-arena-danger/5 rounded-lg py-2 transition-colors font-medium"
                  >
                    {t.play.abandonMatch}
                  </button>
                </div>
              </div>
            </div>

            {/* Agent Reasoning — full width below the board */}
            {agentThinking && (() => {
              const parsed = parseAgentThinking(agentThinking.text);
              return (
                <Card>
                  <div className="p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-arena-primary/15 to-arena-accent/15 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-arena-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                      </div>
                      <span className="text-sm font-display font-semibold text-arena-text">{agentThinking.agentName}</span>
                      {parsed.move && (
                        <span className="ml-auto text-[10px] font-mono font-bold bg-arena-primary/10 text-arena-primary px-2 py-1 rounded-md">
                          {parsed.move}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-arena-primary/30 via-arena-accent/20 to-transparent rounded-full" />
                      <div className="pl-4">
                        <p className="text-sm text-arena-text/80 leading-relaxed">
                          {parsed.thinking}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {/* ════════ RESULT ════════ */}
        {phase === "result" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className={`rounded-2xl border-2 p-8 text-center ${
              resultType === "win"
                ? "border-arena-success/40 bg-arena-success/5"
                : resultType === "lose"
                ? "border-arena-danger/40 bg-arena-danger/5"
                : "border-arena-border-light bg-arena-bg/30"
            }`}>
              <div className={`text-4xl font-display font-bold mb-2 ${
                resultType === "win"
                  ? "text-arena-success"
                  : resultType === "lose"
                  ? "text-arena-danger"
                  : "text-arena-text"
              }`}>
                {resultMessage}
              </div>
            </div>

            <Card>
              <div className="p-4 sm:p-6">{renderBoard(false)}</div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handlePlayAgain} size="lg">{t.play.playAgain}</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/dashboard")}>
                {t.play.backToDashboard}
              </Button>
            </div>
          </div>
        )}

        {/* ════════ LOCAL POKER (vs AI) ════════ */}
        {phase === "local-poker" && (
          <div className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>

            {/* ── Matchmaking Countdown ── */}
            {localPokerState.matchmakingPhase === "countdown" && (
              <div className="rounded-2xl border-2 border-arena-primary/20 p-8 text-center space-y-5">
                <h2 className="text-xl font-display font-bold text-arena-text">Finding Opponents...</h2>
                <div className="text-4xl font-mono font-bold text-arena-primary">{localPokerState.countdown}s</div>

                {/* Player slots grid */}
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  {localPokerState.playerSlots.map((slot, i) => (
                    <div key={i} className={`rounded-lg p-3 transition-all ${
                      slot.filled
                        ? "bg-emerald-400/10 border border-emerald-400/30"
                        : "bg-white/5 border border-dashed border-arena-border-light"
                    }`}>
                      {slot.filled ? (
                        <>
                          <div className="text-sm font-semibold text-arena-text truncate">{slot.name}</div>
                          <div className="text-[10px] text-arena-muted">{slot.isHuman ? "Human" : slot.aiProfile ?? "AI"}</div>
                        </>
                      ) : (
                        <div className="text-xs text-arena-muted/40 py-1">Empty</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-arena-muted">
                  {localPokerState.playerSlots.filter(s => s.filled).length}/9 players
                </div>

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={localPokerControls.startNow}
                    size="lg"
                    disabled={localPokerState.playerSlots.filter(s => s.filled).length < 2}
                  >
                    Start Now ({localPokerState.playerSlots.filter(s => s.filled).length} players)
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => {
                    localPokerControls.resetGame();
                    setPhase("lobby");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* ── Game Over ── */}
            {localPokerState.gameOver && (
              <div className={`rounded-2xl border-2 p-8 text-center ${
                localPokerState.gameWinner === "YOU"
                  ? "border-arena-success/40 bg-arena-success/5"
                  : "border-arena-danger/40 bg-arena-danger/5"
              }`}>
                <div className={`text-3xl font-display font-bold mb-2 ${
                  localPokerState.gameWinner === "YOU" ? "text-arena-success" : "text-arena-danger"
                }`}>
                  {localPokerState.gameWinner === "YOU" ? t.play.youWin : t.play.youLose}
                </div>
                <p className="text-arena-muted text-sm mt-1">
                  {localPokerState.gameWinner === "YOU"
                    ? "All opponents have been eliminated!"
                    : `${localPokerState.gameWinner ?? "An opponent"} wins the tournament.`}
                </p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button onClick={() => {
                    localPokerControls.resetGame();
                    localPokerControls.startMatchmaking();
                  }} size="lg">
                    Play Again
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => {
                    localPokerControls.resetGame();
                    setPhase("lobby");
                  }}>
                    Back to Lobby
                  </Button>
                </div>
              </div>
            )}

            {/* ── Playing ── */}
            {localPokerState.matchmakingPhase === "playing" && !localPokerState.gameOver && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Board */}
                <div className="lg:col-span-2">
                  <Card>
                    <div className="p-4 sm:p-6">
                      <PokerBoard
                        communityCards={localPokerState.communityCards}
                        pot={localPokerState.pot}
                        street={localPokerState.street}
                        handNumber={localPokerState.handNumber}
                        players={localPokerState.players}
                        humanPlayerIndex={localPokerState.humanPlayerIndex}
                        currentPlayerIndex={localPokerState.currentPlayerIndex}
                        dealerIndex={localPokerState.dealerIndex}
                        sidePots={localPokerState.sidePots}
                        actionHistory={localPokerState.actionHistory}
                        isMyTurn={localPokerState.isMyTurn}
                        legalActions={localPokerState.legalActions}
                        onAction={localPokerControls.performAction}
                        showdownResult={localPokerState.showdownResult}
                      />
                    </div>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-3">
                  {/* Turn indicator */}
                  <Card>
                    <div className="p-5 space-y-3">
                      <div className={`flex items-center gap-2.5 ${localPokerState.isMyTurn ? "text-arena-primary" : "text-arena-muted"}`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${localPokerState.isMyTurn ? "bg-arena-primary animate-pulse" : "bg-arena-muted/40"}`} />
                        <span className="text-base font-display font-bold">
                          {localPokerState.isMyTurn ? t.play.yourTurn : t.play.opponentTurn}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-arena-border-light/60">
                        <span className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">Blinds</span>
                        <span className="text-sm font-mono tabular-nums text-arena-muted">10 / 20</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">Mode</span>
                        <span className="text-xs font-mono text-arena-primary">Practice vs AI</span>
                      </div>
                    </div>
                  </Card>

                  {/* Players list */}
                  <Card>
                    <div className="p-4">
                      <h3 className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-3">
                        Players ({localPokerState.players.filter(p => !p.isEliminated).length} active)
                      </h3>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {localPokerState.players.map((player, idx) => (
                          <div key={player.id} className={`
                            flex items-center gap-2 rounded-lg px-3 py-2 transition-colors text-sm
                            ${idx === localPokerState.currentPlayerIndex && !localPokerState.showdownResult ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""}
                            ${player.isEliminated ? "opacity-30" : ""}
                            ${player.hasFolded && !player.isEliminated ? "opacity-50" : ""}
                          `}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{
                              backgroundColor: player.isEliminated ? "#666" :
                                player.hasFolded ? "#999" :
                                player.isHuman ? "#10B981" : "#8B5CF6"
                            }} />
                            <span className={`truncate flex-1 ${player.isEliminated ? "line-through" : ""}`}>
                              {player.name}
                            </span>
                            {player.isHuman && (
                              <span className="text-[8px] bg-arena-primary/10 text-arena-primary px-1 py-0.5 rounded-full uppercase tracking-wider font-bold">YOU</span>
                            )}
                            {player.isDealer && (
                              <span className="w-4 h-4 rounded-full bg-yellow-400 text-black text-[7px] font-extrabold flex items-center justify-center">D</span>
                            )}
                            {player.aiProfile && !player.isEliminated && (
                              <span className="text-[7px] text-arena-muted font-mono">{player.aiProfile}</span>
                            )}
                            <span className="text-xs font-mono text-arena-muted/60 tabular-nums">{player.stack}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Agent thinking */}
                  {localPokerState.agentThinking && (
                    <Card>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-arena-primary/15 to-arena-accent/15 flex items-center justify-center">
                            <svg className="w-3 h-3 text-arena-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                          </div>
                          <span className="text-xs font-display font-semibold text-arena-text">AI Thinking</span>
                        </div>
                        <p className="text-xs text-arena-text/70 leading-relaxed pl-7">
                          {localPokerState.agentThinking}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Abandon */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        localPokerControls.resetGame();
                        setPhase("lobby");
                      }}
                      className="w-full text-xs text-arena-danger/70 hover:text-arena-danger hover:bg-arena-danger/5 rounded-lg py-2 transition-colors font-medium"
                    >
                      {t.play.abandonMatch}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <AuthGuard>
      <PlayContent />
    </AuthGuard>
  );
}
