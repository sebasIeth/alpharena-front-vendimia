"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PokerCard, PokerLegalActions, AIProfileType, SidePot } from "@/lib/types";
import {
  createInitialState,
  startHand,
  applyAction,
  getLegalActions,
  isHumanTurn,
  isAITurn,
  type GameState,
  type Action,
  type ShowdownResult,
  type PlayerConfig,
} from "./engine";
import { getAIAction, getAIThinking } from "./ai";

/* ───────────────────────────────────────────────────────
   Config
   ─────────────────────────────────────────────────────── */
const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const AI_DELAY_MS = 1200;
const SHOWDOWN_DELAY_MS = 2500;
const DEAL_DELAY_MS = 800;
const MATCHMAKING_DURATION = 30;

const AI_NAMES = [
  "Ace", "Blaze", "Cobra", "Dice", "Echo",
  "Frost", "Ghost", "Hawk", "Iron", "Jade",
  "Knox", "Luna", "Maverick", "Nova", "Onyx",
  "Phoenix", "Quinn", "Razor", "Shadow", "Titan",
];

const AI_PROFILE_TYPES: AIProfileType[] = ["TAG", "LAG", "Rock", "CallingStation"];

/* ───────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────── */
export interface PlayerViewInfo {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  currentBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isEliminated: boolean;
  isDealer: boolean;
  isHuman: boolean;
  aiProfile?: AIProfileType;
  holeCards?: PokerCard[];
}

export interface PlayerSlotInfo {
  filled: boolean;
  name: string;
  aiProfile?: AIProfileType;
  isHuman: boolean;
}

export interface LocalPokerState {
  communityCards: PokerCard[];
  pot: number;
  street: string;
  handNumber: number;
  players: PlayerViewInfo[];
  humanPlayerIndex: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  sidePots: SidePot[];
  actionHistory: { type: string; amount?: number; playerIndex: number; street: string }[];
  isMyTurn: boolean;
  legalActions: PokerLegalActions | null;
  agentThinking: string | null;
  showdownResult: ShowdownResult | null;
  isActive: boolean;
  gameOver: boolean;
  gameWinner: string | null;
  // Matchmaking
  matchmakingPhase: "idle" | "countdown" | "playing";
  countdown: number;
  playerSlots: PlayerSlotInfo[];
}

export interface LocalPokerControls {
  startMatchmaking: () => void;
  startNow: () => void;
  performAction: (action: { action: string; amount?: number }) => void;
  nextHand: () => void;
  resetGame: () => void;
}

/* ───────────────────────────────────────────────────────
   Hook
   ─────────────────────────────────────────────────────── */
export function useLocalPoker(): [LocalPokerState, LocalPokerControls] {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [dealing, setDealing] = useState(false);

  // Matchmaking state
  const [matchmakingPhase, setMatchmakingPhase] = useState<"idle" | "countdown" | "playing">("idle");
  const [countdown, setCountdown] = useState(MATCHMAKING_DURATION);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlotInfo[]>([]);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const usedNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /* ── Helpers ── */
  const getRandomAIName = useCallback((): string => {
    const available = AI_NAMES.filter(n => !usedNamesRef.current.has(n));
    if (available.length === 0) return `Bot-${Math.floor(Math.random() * 999)}`;
    const name = available[Math.floor(Math.random() * available.length)];
    usedNamesRef.current.add(name);
    return name;
  }, []);

  const getRandomProfile = useCallback((): AIProfileType => {
    return AI_PROFILE_TYPES[Math.floor(Math.random() * AI_PROFILE_TYPES.length)];
  }, []);

  /* ── AI Turn Processing ── */
  const processNextTurn = useCallback((state: GameState) => {
    if (state.handOver) {
      setIsMyTurn(false);
      if (!state.gameOver) {
        showdownTimerRef.current = setTimeout(() => {
          const s = stateRef.current;
          if (s && !s.gameOver) {
            const next = startHand(s);
            setGameState(next);
            setDealing(true);
            setTimeout(() => {
              setDealing(false);
              if (next.handOver || next.gameOver) {
                setIsMyTurn(false);
                return;
              }
              if (isHumanTurn(next)) {
                setIsMyTurn(true);
              } else {
                processNextTurn(next);
              }
            }, DEAL_DELAY_MS);
          }
        }, SHOWDOWN_DELAY_MS);
      }
      return;
    }

    if (isHumanTurn(state)) {
      setIsMyTurn(true);
      setAgentThinking(null);
      return;
    }

    if (isAITurn(state)) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      setAgentThinking(`${currentPlayer.name} is thinking...`);
      setIsMyTurn(false);

      aiTimerRef.current = setTimeout(() => {
        const action = getAIAction(state, state.currentPlayerIndex);
        const thinking = getAIThinking(state, action, state.currentPlayerIndex);
        setAgentThinking(thinking);

        const newState = applyAction(state, action);
        setGameState(newState);

        setTimeout(() => {
          setAgentThinking(null);
          processNextTurn(newState);
        }, 500);
      }, AI_DELAY_MS);
    }
  }, []);

  /* ── Matchmaking ── */
  const startMatchmaking = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    usedNamesRef.current = new Set(["YOU"]);

    // Start with human + 1 AI
    const initialSlots: PlayerSlotInfo[] = [
      { filled: true, name: "YOU", isHuman: true },
      { filled: true, name: getRandomAIName(), aiProfile: getRandomProfile(), isHuman: false },
    ];
    // Fill remaining 7 slots as empty
    for (let i = initialSlots.length; i < 9; i++) {
      initialSlots.push({ filled: false, name: "", isHuman: false });
    }

    setPlayerSlots(initialSlots);
    setCountdown(MATCHMAKING_DURATION);
    setMatchmakingPhase("countdown");
    setGameState(null);
    setIsActive(false);

    // Countdown timer
    let timeLeft = MATCHMAKING_DURATION;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);

      // Progressively add AI players
      if (timeLeft === 25 || timeLeft === 20 || timeLeft === 15 || timeLeft === 10 || timeLeft === 5) {
        setPlayerSlots(prev => {
          const next = [...prev];
          const emptyIdx = next.findIndex(s => !s.filled);
          if (emptyIdx !== -1) {
            const name = getRandomAIName();
            next[emptyIdx] = { filled: true, name, aiProfile: getRandomProfile(), isHuman: false };
          }
          // Sometimes add 2 at once
          if (Math.random() < 0.5) {
            const emptyIdx2 = next.findIndex(s => !s.filled);
            if (emptyIdx2 !== -1) {
              const name2 = getRandomAIName();
              next[emptyIdx2] = { filled: true, name: name2, aiProfile: getRandomProfile(), isHuman: false };
            }
          }
          return next;
        });
      }

      if (timeLeft <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        // Auto-start
        setPlayerSlots(prev => {
          launchGame(prev);
          return prev;
        });
      }
    }, 1000);
  }, [getRandomAIName, getRandomProfile]);

  const launchGame = useCallback((slots: PlayerSlotInfo[]) => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    const filledSlots = slots.filter(s => s.filled);
    if (filledSlots.length < 2) return;

    const configs: PlayerConfig[] = filledSlots.map((s, i) => ({
      id: s.isHuman ? "human" : `ai-${i}`,
      name: s.name,
      stack: STARTING_STACK,
      isHuman: s.isHuman,
      aiProfile: s.aiProfile,
      seatIndex: i,
    }));

    const initial = createInitialState(configs, SMALL_BLIND, BIG_BLIND);
    const hand1 = startHand(initial);
    setGameState(hand1);
    setIsActive(true);
    setMatchmakingPhase("playing");
    setDealing(true);
    setAgentThinking(null);

    setTimeout(() => {
      setDealing(false);
      if (hand1.handOver || hand1.gameOver) {
        setIsMyTurn(false);
        return;
      }
      if (isHumanTurn(hand1)) {
        setIsMyTurn(true);
      } else {
        processNextTurn(hand1);
      }
    }, DEAL_DELAY_MS);
  }, [processNextTurn]);

  const startNow = useCallback(() => {
    setPlayerSlots(prev => {
      const filled = prev.filter(s => s.filled);
      if (filled.length < 2) return prev;
      launchGame(prev);
      return prev;
    });
  }, [launchGame]);

  /* ── Player actions ── */
  const performAction = useCallback((action: { action: string; amount?: number }) => {
    const state = stateRef.current;
    if (!state || !isHumanTurn(state) || state.handOver) return;

    setIsMyTurn(false);

    let engineAction: Action;
    switch (action.action) {
      case "fold":
        engineAction = { type: "fold" };
        break;
      case "check":
        engineAction = { type: "check" };
        break;
      case "call":
        engineAction = { type: "call" };
        break;
      case "raise":
        engineAction = { type: "raise", amount: action.amount ?? 0 };
        break;
      case "all_in":
        engineAction = { type: "all_in" };
        break;
      default:
        return;
    }

    const newState = applyAction(state, engineAction);
    setGameState(newState);
    processNextTurn(newState);
  }, [processNextTurn]);

  const nextHand = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.gameOver) return;
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);

    const next = startHand(state);
    setGameState(next);
    setDealing(true);
    setAgentThinking(null);

    setTimeout(() => {
      setDealing(false);
      if (next.handOver || next.gameOver) {
        setIsMyTurn(false);
        return;
      }
      if (isHumanTurn(next)) {
        setIsMyTurn(true);
      } else {
        processNextTurn(next);
      }
    }, DEAL_DELAY_MS);
  }, [processNextTurn]);

  const resetGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setGameState(null);
    setIsActive(false);
    setIsMyTurn(false);
    setAgentThinking(null);
    setDealing(false);
    setMatchmakingPhase("idle");
    setCountdown(MATCHMAKING_DURATION);
    setPlayerSlots([]);
    usedNamesRef.current = new Set();
  }, []);

  /* ── Build output ── */
  const legalActions: PokerLegalActions | null =
    gameState && isMyTurn && !dealing && !gameState.handOver
      ? getLegalActions(gameState)
      : null;

  const gs = gameState;
  const humanIdx = gs?.players.findIndex(p => p.isHuman) ?? 0;

  const players: PlayerViewInfo[] = gs
    ? gs.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        stack: p.stack,
        currentBet: p.currentBet,
        hasFolded: p.hasFolded,
        isAllIn: p.isAllIn,
        isEliminated: p.isEliminated,
        isDealer: i === gs.dealerIndex,
        isHuman: p.isHuman,
        aiProfile: p.aiProfile,
        // Show human cards always; AI cards only at showdown
        holeCards: p.isHuman ? p.holeCards : (gs.showdownResult && !p.hasFolded ? p.holeCards : undefined),
      }))
    : [];

  const outputState: LocalPokerState = {
    communityCards: gs?.communityCards ?? [],
    pot: gs?.pot ?? 0,
    street: gs?.street ?? "preflop",
    handNumber: gs?.handNumber ?? 0,
    players,
    humanPlayerIndex: humanIdx,
    currentPlayerIndex: gs?.currentPlayerIndex ?? 0,
    dealerIndex: gs?.dealerIndex ?? 0,
    sidePots: gs?.sidePots ?? [],
    actionHistory: gs?.actionHistory ?? [],
    isMyTurn: isMyTurn && !dealing,
    legalActions,
    agentThinking,
    showdownResult: gs?.showdownResult ?? null,
    isActive,
    gameOver: gs?.gameOver ?? false,
    gameWinner: gs?.gameOver
      ? (gs.players.find(p => !p.isEliminated)?.name ?? null)
      : null,
    matchmakingPhase,
    countdown,
    playerSlots,
  };

  return [outputState, { startMatchmaking, startNow, performAction, nextHand, resetGame }];
}
