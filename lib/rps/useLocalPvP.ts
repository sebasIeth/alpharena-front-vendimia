"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Throw = "rock" | "paper" | "scissors";
type PvPPhase = "idle" | "searching" | "matched" | "playing" | "game_over";

interface PvPMsg {
  type: "searching" | "matched" | "throw" | "leave" | "rematch";
  id: string;
  round?: number;
  choice?: Throw;
  targetId?: string;
}

function determineWinner(a: Throw, b: Throw): "a" | "b" | "draw" {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  )
    return "a";
  return "b";
}

const CHANNEL_NAME = "alpharena-rps-pvp";
const WINS_NEEDED = 2;
const REVEAL_DURATION = 1500;
const ROUND_PAUSE = 2000;

export interface RpsRoundPvP {
  roundNumber: number;
  throwA?: Throw;
  throwB?: Throw;
  winner?: "a" | "b" | "draw";
}

export interface UseLocalPvPReturn {
  phase: PvPPhase;
  mySide: "a" | "b" | null;
  rounds: RpsRoundPvP[];
  currentRound: number;
  scoreA: number;
  scoreB: number;
  boardPhase: "thinking" | "waiting" | "revealing" | "round_complete" | "game_over";
  opponentDisconnected: boolean;
  startSearching: () => void;
  cancelSearch: () => void;
  submitThrow: (choice: Throw) => void;
  resetToLobby: () => void;
  playAgain: () => void;
}

export function useLocalPvP(): UseLocalPvPReturn {
  const [phase, setPhase] = useState<PvPPhase>("idle");
  const [mySide, setMySide] = useState<"a" | "b" | null>(null);
  const [rounds, setRounds] = useState<RpsRoundPvP[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [boardPhase, setBoardPhase] = useState<"thinking" | "waiting" | "revealing" | "round_complete" | "game_over">("thinking");
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const myIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const channelRef = useRef<BroadcastChannel | null>(null);
  const opponentIdRef = useRef<string | null>(null);
  const mySideRef = useRef<"a" | "b" | null>(null);
  const myThrowRef = useRef<Throw | null>(null);
  const opponentThrowRef = useRef<Throw | null>(null);
  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);
  const currentRoundRef = useRef(1);
  const phaseRef = useRef<PvPPhase>("idle");
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      // Notify opponent before closing
      try {
        channelRef.current.postMessage({ type: "leave", id: myIdRef.current });
      } catch { /* channel may already be closed */ }
      channelRef.current.close();
      channelRef.current = null;
    }
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const resolveRound = useCallback(() => {
    const myThrow = myThrowRef.current;
    const oppThrow = opponentThrowRef.current;
    const side = mySideRef.current;
    if (!myThrow || !oppThrow || !side) return;

    const throwA = side === "a" ? myThrow : oppThrow;
    const throwB = side === "a" ? oppThrow : myThrow;
    const winner = determineWinner(throwA, throwB);
    const round = currentRoundRef.current;

    const newRound: RpsRoundPvP = { roundNumber: round, throwA, throwB, winner };

    setBoardPhase("revealing");

    revealTimerRef.current = setTimeout(() => {
      const newScoreA = scoreARef.current + (winner === "a" ? 1 : 0);
      const newScoreB = scoreBRef.current + (winner === "b" ? 1 : 0);
      scoreARef.current = newScoreA;
      scoreBRef.current = newScoreB;
      setScoreA(newScoreA);
      setScoreB(newScoreB);
      setRounds((prev) => [...prev, newRound]);

      const gameOver = newScoreA >= WINS_NEEDED || newScoreB >= WINS_NEEDED;

      if (gameOver) {
        setBoardPhase("game_over");
        setPhase("game_over");
      } else {
        setBoardPhase("round_complete");
        roundTimerRef.current = setTimeout(() => {
          const next = currentRoundRef.current + 1;
          currentRoundRef.current = next;
          setCurrentRound(next);
          myThrowRef.current = null;
          opponentThrowRef.current = null;
          setBoardPhase("thinking");
        }, ROUND_PAUSE);
      }
    }, REVEAL_DURATION);
  }, []);

  const handleMessage = useCallback(
    (ev: MessageEvent<PvPMsg>) => {
      const msg = ev.data;
      if (!msg || !msg.type || msg.id === myIdRef.current) return;

      switch (msg.type) {
        case "searching": {
          if (phaseRef.current !== "searching") return;
          // I was searching too — match! Lower ID is side A (host)
          const iAmHost = myIdRef.current < msg.id;
          opponentIdRef.current = msg.id;
          mySideRef.current = iAmHost ? "a" : "b";
          setMySide(iAmHost ? "a" : "b");
          setPhase("playing");
          setBoardPhase("thinking");
          // Tell the other tab we matched
          channelRef.current?.postMessage({
            type: "matched",
            id: myIdRef.current,
            targetId: msg.id,
          });
          break;
        }
        case "matched": {
          if (msg.targetId !== myIdRef.current) return;
          if (phaseRef.current !== "searching") return;
          opponentIdRef.current = msg.id;
          const iAmHost = myIdRef.current < msg.id;
          mySideRef.current = iAmHost ? "a" : "b";
          setMySide(iAmHost ? "a" : "b");
          setPhase("playing");
          setBoardPhase("thinking");
          break;
        }
        case "throw": {
          if (msg.id !== opponentIdRef.current) return;
          if (msg.round !== currentRoundRef.current) return;
          opponentThrowRef.current = msg.choice!;
          // If I already threw, resolve
          if (myThrowRef.current) {
            resolveRound();
          }
          break;
        }
        case "leave": {
          if (msg.id !== opponentIdRef.current) return;
          setOpponentDisconnected(true);
          break;
        }
        case "rematch": {
          if (msg.id !== opponentIdRef.current) return;
          // Reset game state for rematch
          scoreARef.current = 0;
          scoreBRef.current = 0;
          currentRoundRef.current = 1;
          myThrowRef.current = null;
          opponentThrowRef.current = null;
          setScoreA(0);
          setScoreB(0);
          setCurrentRound(1);
          setRounds([]);
          setPhase("playing");
          setBoardPhase("thinking");
          setOpponentDisconnected(false);
          break;
        }
      }
    },
    [resolveRound]
  );

  const startSearching = useCallback(() => {
    cleanup();
    // Reset all state
    myIdRef.current = Math.random().toString(36).slice(2, 10);
    opponentIdRef.current = null;
    mySideRef.current = null;
    myThrowRef.current = null;
    opponentThrowRef.current = null;
    scoreARef.current = 0;
    scoreBRef.current = 0;
    currentRoundRef.current = 1;
    setMySide(null);
    setRounds([]);
    setCurrentRound(1);
    setScoreA(0);
    setScoreB(0);
    setOpponentDisconnected(false);
    setBoardPhase("thinking");

    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;
    ch.onmessage = handleMessage;
    setPhase("searching");
    // Broadcast that we're looking
    ch.postMessage({ type: "searching", id: myIdRef.current });
    // Re-broadcast periodically in case the other tab opens later
    const interval = setInterval(() => {
      if (phaseRef.current === "searching") {
        ch.postMessage({ type: "searching", id: myIdRef.current });
      } else {
        clearInterval(interval);
      }
    }, 1000);
    // Store cleanup
    const origClose = ch.close.bind(ch);
    ch.close = () => {
      clearInterval(interval);
      origClose();
    };
  }, [cleanup, handleMessage]);

  const cancelSearch = useCallback(() => {
    cleanup();
    setPhase("idle");
  }, [cleanup]);

  const submitThrow = useCallback(
    (choice: Throw) => {
      if (myThrowRef.current) return; // already threw
      myThrowRef.current = choice;
      setBoardPhase("waiting");
      channelRef.current?.postMessage({
        type: "throw",
        id: myIdRef.current,
        round: currentRoundRef.current,
        choice,
      });
      // If opponent already threw, resolve
      if (opponentThrowRef.current) {
        resolveRound();
      }
    },
    [resolveRound]
  );

  const resetToLobby = useCallback(() => {
    cleanup();
    setPhase("idle");
    setMySide(null);
    setRounds([]);
    setCurrentRound(1);
    setScoreA(0);
    setScoreB(0);
    setBoardPhase("thinking");
    setOpponentDisconnected(false);
  }, [cleanup]);

  const playAgain = useCallback(() => {
    scoreARef.current = 0;
    scoreBRef.current = 0;
    currentRoundRef.current = 1;
    myThrowRef.current = null;
    opponentThrowRef.current = null;
    setScoreA(0);
    setScoreB(0);
    setCurrentRound(1);
    setRounds([]);
    setPhase("playing");
    setBoardPhase("thinking");
    setOpponentDisconnected(false);
    channelRef.current?.postMessage({ type: "rematch", id: myIdRef.current });
  }, []);

  return {
    phase,
    mySide,
    rounds,
    currentRound,
    scoreA,
    scoreB,
    boardPhase,
    opponentDisconnected,
    startSearching,
    cancelSearch,
    submitThrow,
    resetToLobby,
    playAgain,
  };
}
