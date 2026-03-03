import type { PokerCard } from "@/lib/types";
import { createDeck, shuffle, draw } from "./deck";
import { determineWinner, type EvalResult } from "./evaluator";

/* ───────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────── */
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export interface Player {
  id: string;
  name: string;
  stack: number;
  holeCards: PokerCard[];
  currentBet: number;      // amount wagered THIS street
  totalBetThisHand: number; // total wagered across all streets of current hand
  hasFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;        // acted this betting round?
}

export interface ActionRecord {
  type: string;
  amount?: number;
  playerSide: string; // "a" or "b"
  street: string;
}

export interface ShowdownResult {
  winner: number; // 0, 1, or -1 (split)
  hand0: EvalResult;
  hand1: EvalResult;
  pots: { amount: number; winner: number }[]; // main pot + side pots
}

export interface GameState {
  street: Street;
  deck: PokerCard[];
  communityCards: PokerCard[];
  burnCards: PokerCard[];
  pot: number;
  players: [Player, Player];
  currentPlayerIndex: number; // 0 or 1
  dealerIndex: number;        // 0 or 1 — the dealer/button (also SB in heads‑up)
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  lastRaiseSize: number;      // size of the last raise (for min‑raise calculation)
  actionHistory: ActionRecord[];
  showdownResult: ShowdownResult | null;
  handOver: boolean;
  gameOver: boolean;           // true when a player is busted
}

/* ───────────────────────────────────────────────────────
   Engine
   ─────────────────────────────────────────────────────── */
export function createInitialState(
  playerName: string,
  opponentName: string,
  startingStack: number,
  smallBlind: number,
  bigBlind: number,
): GameState {
  return {
    street: "preflop",
    deck: [],
    communityCards: [],
    burnCards: [],
    pot: 0,
    players: [
      { id: "human", name: playerName, stack: startingStack, holeCards: [], currentBet: 0, totalBetThisHand: 0, hasFolded: false, isAllIn: false, hasActed: false },
      { id: "ai", name: opponentName, stack: startingStack, holeCards: [], currentBet: 0, totalBetThisHand: 0, hasFolded: false, isAllIn: false, hasActed: false },
    ],
    currentPlayerIndex: 0,
    dealerIndex: 0, // human starts as dealer
    smallBlind,
    bigBlind,
    handNumber: 0,
    lastRaiseSize: bigBlind,
    actionHistory: [],
    showdownResult: null,
    handOver: false,
    gameOver: false,
  };
}

/** Start a new hand: shuffle, post blinds, deal hole cards. */
export function startHand(state: GameState): GameState {
  const s = { ...state };
  s.handNumber += 1;
  s.street = "preflop";
  s.deck = shuffle(createDeck());
  s.communityCards = [];
  s.burnCards = [];
  s.pot = 0;
  s.actionHistory = [];
  s.showdownResult = null;
  s.handOver = false;
  s.lastRaiseSize = s.bigBlind;

  // Reset players
  for (const p of s.players) {
    p.holeCards = [];
    p.currentBet = 0;
    p.totalBetThisHand = 0;
    p.hasFolded = false;
    p.isAllIn = false;
    p.hasActed = false;
  }

  // Rotate dealer
  if (s.handNumber > 1) {
    s.dealerIndex = s.dealerIndex === 0 ? 1 : 0;
  }

  // Post blinds — in heads‑up the dealer is SB
  const sbIdx = s.dealerIndex;
  const bbIdx = sbIdx === 0 ? 1 : 0;
  postBlind(s, sbIdx, s.smallBlind);
  postBlind(s, bbIdx, s.bigBlind);

  // Deal 2 hole cards to each player
  s.players[0].holeCards = draw(s.deck, 2);
  s.players[1].holeCards = draw(s.deck, 2);

  // Pre‑flop: dealer (SB) acts first in heads‑up
  s.currentPlayerIndex = sbIdx;
  s.players[0].hasActed = false;
  s.players[1].hasActed = false;

  return s;
}

function postBlind(s: GameState, playerIdx: number, amount: number) {
  const p = s.players[playerIdx];
  const actual = Math.min(amount, p.stack);
  p.stack -= actual;
  p.currentBet = actual;
  p.totalBetThisHand += actual;
  s.pot += actual;
  if (p.stack === 0) p.isAllIn = true;

  s.actionHistory.push({
    type: playerIdx === s.dealerIndex ? "sb" : "bb",
    amount: actual,
    playerSide: playerIdx === 0 ? "a" : "b",
    street: "preflop",
  });
}

/* ───────────────────────────────────────────────────────
   Legal actions for the current player
   ─────────────────────────────────────────────────────── */
export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
  canAllIn: boolean;
  allInAmount: number;
}

export function getLegalActions(state: GameState): LegalActions {
  const p = state.players[state.currentPlayerIndex];
  const opp = state.players[state.currentPlayerIndex === 0 ? 1 : 0];
  const toCall = Math.max(0, opp.currentBet - p.currentBet);
  const canAffordCall = p.stack >= toCall;

  const result: LegalActions = {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && canAffordCall,
    callAmount: Math.min(toCall, p.stack),
    canRaise: false,
    minRaise: 0,
    maxRaise: 0,
    canAllIn: p.stack > 0 && !p.isAllIn,
    allInAmount: p.stack,
  };

  // Raise: must be at least the size of the last raise on top of the call
  if (p.stack > toCall && !p.isAllIn) {
    const minRaiseTotal = opp.currentBet + Math.max(state.lastRaiseSize, state.bigBlind);
    const minRaiseAmount = minRaiseTotal - p.currentBet; // what the player needs to put in
    if (p.stack >= minRaiseAmount) {
      result.canRaise = true;
      result.minRaise = minRaiseAmount;
      result.maxRaise = p.stack; // no‑limit
    }
  }

  // Can't fold if can check (optional but good UX — disable fold when check available)
  // Actually in poker you can always fold, but we'll keep it available

  return result;
}

/* ───────────────────────────────────────────────────────
   Apply an action
   ─────────────────────────────────────────────────────── */
export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number }
  | { type: "all_in" };

export function applyAction(state: GameState, action: Action): GameState {
  const s = { ...state, players: [{ ...state.players[0] }, { ...state.players[1] }] as [Player, Player] };
  const p = s.players[s.currentPlayerIndex];
  const oppIdx = s.currentPlayerIndex === 0 ? 1 : 0;
  const opp = s.players[oppIdx];
  const side = s.currentPlayerIndex === 0 ? "a" : "b";

  switch (action.type) {
    case "fold": {
      p.hasFolded = true;
      p.hasActed = true;
      s.actionHistory = [...s.actionHistory, { type: "fold", playerSide: side, street: s.street }];
      // Hand is over — opponent wins
      return resolveHandEnd(s);
    }

    case "check": {
      p.hasActed = true;
      s.actionHistory = [...s.actionHistory, { type: "check", playerSide: side, street: s.street }];
      break;
    }

    case "call": {
      const toCall = Math.min(opp.currentBet - p.currentBet, p.stack);
      p.stack -= toCall;
      p.currentBet += toCall;
      p.totalBetThisHand += toCall;
      s.pot += toCall;
      if (p.stack === 0) p.isAllIn = true;
      p.hasActed = true;
      s.actionHistory = [...s.actionHistory, { type: "call", amount: toCall, playerSide: side, street: s.street }];
      break;
    }

    case "raise": {
      const totalPutIn = action.amount; // total chips the player puts in this street
      const additional = totalPutIn - p.currentBet;
      const raiseSize = totalPutIn - opp.currentBet; // the raise above opponent's bet
      p.stack -= additional;
      s.pot += additional;
      p.totalBetThisHand += additional;
      s.lastRaiseSize = Math.max(raiseSize, s.lastRaiseSize);
      p.currentBet = totalPutIn;
      if (p.stack === 0) p.isAllIn = true;
      p.hasActed = true;
      // Opponent must act again
      opp.hasActed = false;
      s.actionHistory = [...s.actionHistory, { type: "raise", amount: totalPutIn, playerSide: side, street: s.street }];
      break;
    }

    case "all_in": {
      const allInAmt = p.stack;
      const prevBet = p.currentBet;
      p.currentBet += allInAmt;
      p.totalBetThisHand += allInAmt;
      s.pot += allInAmt;
      p.stack = 0;
      p.isAllIn = true;
      p.hasActed = true;
      // If this is a raise (putting in more than opponent), opponent must act again
      if (p.currentBet > opp.currentBet) {
        const raiseSize = p.currentBet - opp.currentBet;
        if (prevBet < opp.currentBet || raiseSize >= s.lastRaiseSize) {
          opp.hasActed = false;
          s.lastRaiseSize = Math.max(raiseSize, s.lastRaiseSize);
        }
      }
      s.actionHistory = [...s.actionHistory, { type: "all_in", amount: allInAmt, playerSide: side, street: s.street }];
      break;
    }
  }

  // Check if betting round is complete
  if (isBettingRoundComplete(s)) {
    return advanceStreet(s);
  }

  // Switch to next player
  s.currentPlayerIndex = oppIdx;
  return s;
}

function isBettingRoundComplete(s: GameState): boolean {
  const [p0, p1] = s.players;

  // If someone folded, hand is over (handled in fold case already)
  if (p0.hasFolded || p1.hasFolded) return true;

  // Both all‑in → advance immediately
  if (p0.isAllIn && p1.isAllIn) return true;

  // One all‑in, the other has acted → done
  if ((p0.isAllIn && p1.hasActed) || (p1.isAllIn && p0.hasActed)) return true;

  // Both have acted and bets match
  if (p0.hasActed && p1.hasActed && p0.currentBet === p1.currentBet) return true;

  return false;
}

function advanceStreet(s: GameState): GameState {
  // If someone folded, resolve
  if (s.players[0].hasFolded || s.players[1].hasFolded) {
    return resolveHandEnd(s);
  }

  // If both all‑in, run out remaining streets automatically
  const bothAllIn = s.players[0].isAllIn && s.players[1].isAllIn;

  // Reset per‑street state
  for (const p of s.players) {
    p.currentBet = 0;
    p.hasActed = false;
  }
  s.lastRaiseSize = s.bigBlind;

  // Post‑flop: BB (non‑dealer) acts first in heads‑up
  const bbIdx = s.dealerIndex === 0 ? 1 : 0;
  s.currentPlayerIndex = bbIdx;

  const nextStreet = (): Street => {
    switch (s.street) {
      case "preflop": return "flop";
      case "flop": return "turn";
      case "turn": return "river";
      case "river": return "showdown";
      default: return "showdown";
    }
  };

  s.street = nextStreet();

  if (s.street === "flop") {
    s.burnCards = [...s.burnCards, ...draw(s.deck, 1)];
    s.communityCards = [...s.communityCards, ...draw(s.deck, 3)];
  } else if (s.street === "turn") {
    s.burnCards = [...s.burnCards, ...draw(s.deck, 1)];
    s.communityCards = [...s.communityCards, ...draw(s.deck, 1)];
  } else if (s.street === "river") {
    s.burnCards = [...s.burnCards, ...draw(s.deck, 1)];
    s.communityCards = [...s.communityCards, ...draw(s.deck, 1)];
  } else if (s.street === "showdown") {
    return resolveShowdown(s);
  }

  // If both all‑in, skip betting and advance again
  if (bothAllIn) {
    return advanceStreet(s);
  }

  // If one player is all‑in, the other doesn't need to bet, advance
  if (s.players[0].isAllIn || s.players[1].isAllIn) {
    return advanceStreet(s);
  }

  return s;
}

function resolveHandEnd(s: GameState): GameState {
  if (s.players[0].hasFolded) {
    // Player 1 wins
    s.players[1].stack += s.pot;
    s.showdownResult = null; // no showdown
    s.pot = 0;
  } else if (s.players[1].hasFolded) {
    // Player 0 wins
    s.players[0].stack += s.pot;
    s.showdownResult = null;
    s.pot = 0;
  }
  s.handOver = true;
  s.street = "showdown";

  // Check if game over
  if (s.players[0].stack <= 0 || s.players[1].stack <= 0) {
    s.gameOver = true;
  }

  return s;
}

function resolveShowdown(s: GameState): GameState {
  const result = determineWinner(
    s.players[0].holeCards,
    s.players[1].holeCards,
    s.communityCards,
  );

  if (result.winner === -1) {
    // Split pot
    const half = Math.floor(s.pot / 2);
    s.players[0].stack += half;
    s.players[1].stack += s.pot - half; // handle odd chip
  } else {
    s.players[result.winner].stack += s.pot;
  }

  s.showdownResult = {
    winner: result.winner,
    hand0: result.hand0,
    hand1: result.hand1,
    pots: [{ amount: s.pot, winner: result.winner }],
  };

  s.pot = 0;
  s.handOver = true;

  if (s.players[0].stack <= 0 || s.players[1].stack <= 0) {
    s.gameOver = true;
  }

  return s;
}

/* ───────────────────────────────────────────────────────
   Utility: check who is the active player (human or AI)
   ─────────────────────────────────────────────────────── */
export function isHumanTurn(state: GameState): boolean {
  return state.currentPlayerIndex === 0 && !state.handOver;
}

export function isAITurn(state: GameState): boolean {
  return state.currentPlayerIndex === 1 && !state.handOver;
}
