"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PokerCard, PokerLegalActions } from "@/lib/types";
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
} from "./engine";
import { getAIAction, getAIThinking } from "./ai";
import { HAND_NAMES } from "./evaluator";

/* ───────────────────────────────────────────────────────
   Config
   ─────────────────────────────────────────────────────── */
const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const AI_DELAY_MS = 1200;     // delay before AI acts (feel natural)
const SHOWDOWN_DELAY_MS = 2500; // time to show showdown before next hand
const DEAL_DELAY_MS = 800;     // delay after starting hand before enabling actions

export interface LocalPokerState {
  // Board props compatible with PokerBoard
  communityCards: PokerCard[];
  pot: number;
  street: string;
  handNumber: number;
  playerA: {
    name: string;
    stack: number;
    currentBet: number;
    hasFolded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    holeCards?: PokerCard[];
  };
  playerB: {
    name: string;
    stack: number;
    currentBet: number;
    hasFolded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    holeCards?: PokerCard[];
  };
  actionHistory: { type: string; amount?: number; playerSide: string; street: string }[];
  mySide: "a";
  isMyTurn: boolean;
  legalActions: PokerLegalActions | null;
  agentThinking: string | null;
  showdownResult: ShowdownResult | null;
  // Game‑level state
  isActive: boolean;
  gameOver: boolean;
  gameWinner: string | null; // "human" | "ai" | null
}

export interface LocalPokerControls {
  startGame: () => void;
  performAction: (action: { action: string; amount?: number }) => void;
  nextHand: () => void;
  resetGame: () => void;
}

export function useLocalPoker(): [LocalPokerState, LocalPokerControls] {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [dealing, setDealing] = useState(false);

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<GameState | null>(null);

  // Keep ref in sync
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    };
  }, []);

  const processAITurn = useCallback((state: GameState) => {
    if (!isAITurn(state) || state.handOver) return;

    setAgentThinking("Thinking...");
    setIsMyTurn(false);

    aiTimerRef.current = setTimeout(() => {
      const action = getAIAction(state);
      const thinking = getAIThinking(state, action);
      setAgentThinking(thinking);

      // Map AI action to engine action
      const engineAction: Action = action;
      const newState = applyAction(state, engineAction);
      setGameState(newState);

      // After a brief moment, clear thinking and check next turn
      setTimeout(() => {
        setAgentThinking(null);

        if (newState.handOver) {
          // Hand is done
          setIsMyTurn(false);
          // Auto-advance if game not over
          if (!newState.gameOver) {
            showdownTimerRef.current = setTimeout(() => {
              // Auto start next hand
              const s = stateRef.current;
              if (s && !s.gameOver) {
                const next = startHand(s);
                setGameState(next);
                setDealing(true);
                setTimeout(() => {
                  setDealing(false);
                  if (isHumanTurn(next)) {
                    setIsMyTurn(true);
                  } else {
                    processAITurn(next);
                  }
                }, DEAL_DELAY_MS);
              }
            }, SHOWDOWN_DELAY_MS);
          }
        } else if (isHumanTurn(newState)) {
          setIsMyTurn(true);
        } else if (isAITurn(newState)) {
          // AI acts again (e.g., re-raise scenario — very unlikely but handle it)
          processAITurn(newState);
        }
      }, 500);
    }, AI_DELAY_MS);
  }, []);

  const startGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);

    const initial = createInitialState("YOU", "AI Agent", STARTING_STACK, SMALL_BLIND, BIG_BLIND);
    const hand1 = startHand(initial);
    setGameState(hand1);
    setIsActive(true);
    setDealing(true);
    setAgentThinking(null);

    setTimeout(() => {
      setDealing(false);
      if (isHumanTurn(hand1)) {
        setIsMyTurn(true);
      } else {
        processAITurn(hand1);
      }
    }, DEAL_DELAY_MS);
  }, [processAITurn]);

  const performAction = useCallback((action: { action: string; amount?: number }) => {
    const state = stateRef.current;
    if (!state || !isHumanTurn(state) || state.handOver) return;

    setIsMyTurn(false);

    // Convert UI action to engine action
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

    if (newState.handOver) {
      // Hand done
      if (!newState.gameOver) {
        showdownTimerRef.current = setTimeout(() => {
          const s = stateRef.current;
          if (s && !s.gameOver) {
            const next = startHand(s);
            setGameState(next);
            setDealing(true);
            setTimeout(() => {
              setDealing(false);
              if (isHumanTurn(next)) {
                setIsMyTurn(true);
              } else {
                processAITurn(next);
              }
            }, DEAL_DELAY_MS);
          }
        }, SHOWDOWN_DELAY_MS);
      }
    } else if (isAITurn(newState)) {
      processAITurn(newState);
    } else if (isHumanTurn(newState)) {
      setIsMyTurn(true);
    }
  }, [processAITurn]);

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
      if (isHumanTurn(next)) {
        setIsMyTurn(true);
      } else {
        processAITurn(next);
      }
    }, DEAL_DELAY_MS);
  }, [processAITurn]);

  const resetGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    setGameState(null);
    setIsActive(false);
    setIsMyTurn(false);
    setAgentThinking(null);
    setDealing(false);
  }, []);

  // Build output state
  const legalActions: PokerLegalActions | null =
    gameState && isMyTurn && !dealing && !gameState.handOver
      ? getLegalActions(gameState)
      : null;

  const gs = gameState;
  const outputState: LocalPokerState = {
    communityCards: gs?.communityCards ?? [],
    pot: gs?.pot ?? 0,
    street: gs?.street ?? "preflop",
    handNumber: gs?.handNumber ?? 0,
    playerA: {
      name: gs?.players[0].name ?? "YOU",
      stack: gs?.players[0].stack ?? STARTING_STACK,
      currentBet: gs?.players[0].currentBet ?? 0,
      hasFolded: gs?.players[0].hasFolded ?? false,
      isAllIn: gs?.players[0].isAllIn ?? false,
      isDealer: gs ? gs.dealerIndex === 0 : false,
      holeCards: gs?.players[0].holeCards,
    },
    playerB: {
      name: gs?.players[1].name ?? "AI Agent",
      stack: gs?.players[1].stack ?? STARTING_STACK,
      currentBet: gs?.players[1].currentBet ?? 0,
      hasFolded: gs?.players[1].hasFolded ?? false,
      isAllIn: gs?.players[1].isAllIn ?? false,
      isDealer: gs ? gs.dealerIndex === 1 : false,
      // Show AI cards only during showdown
      holeCards: gs?.showdownResult ? gs.players[1].holeCards : undefined,
    },
    actionHistory: gs?.actionHistory ?? [],
    mySide: "a",
    isMyTurn: isMyTurn && !dealing,
    legalActions,
    agentThinking,
    showdownResult: gs?.showdownResult ?? null,
    isActive,
    gameOver: gs?.gameOver ?? false,
    gameWinner: gs?.gameOver
      ? (gs.players[0].stack <= 0 ? "ai" : "human")
      : null,
  };

  return [outputState, { startGame, performAction, nextHand, resetGame }];
}
