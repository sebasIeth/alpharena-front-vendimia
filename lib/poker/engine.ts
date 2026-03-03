import type { PokerCard, AIProfileType, SidePot } from "@/lib/types";
import { createDeck, shuffle, draw } from "./deck";
import { determineWinnerMulti, type EvalResult } from "./evaluator";

/* ───────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────── */
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export interface Player {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  holeCards: PokerCard[];
  currentBet: number;
  totalBetThisHand: number;
  hasFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
  isEliminated: boolean;
  isHuman: boolean;
  aiProfile?: AIProfileType;
}

export interface ActionRecord {
  type: string;
  amount?: number;
  playerIndex: number;
  playerId: string;
  street: string;
}

export interface ShowdownResult {
  winners: { playerIndex: number; handEval: EvalResult }[];
  pots: { amount: number; winnerIndices: number[]; splitAmounts?: number[] }[];
  playerHands: Map<number, EvalResult>;
}

export interface GameState {
  street: Street;
  deck: PokerCard[];
  communityCards: PokerCard[];
  burnCards: PokerCard[];
  pot: number;
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  lastRaiseSize: number;
  actionHistory: ActionRecord[];
  showdownResult: ShowdownResult | null;
  handOver: boolean;
  gameOver: boolean;
  sidePots: SidePot[];
  isHeadsUp: boolean;
}

/* ───────────────────────────────────────────────────────
   Circular seat helpers
   ─────────────────────────────────────────────────────── */
function nextActivePlayer(
  players: Player[],
  fromIndex: number,
  includeAllIn = false,
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    const p = players[idx];
    if (p.isEliminated || p.hasFolded) continue;
    if (!includeAllIn && p.isAllIn) continue;
    return idx;
  }
  return -1;
}

function nextInHandPlayer(
  players: Player[],
  fromIndex: number,
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    const p = players[idx];
    if (!p.isEliminated && !p.hasFolded) return idx;
  }
  return -1;
}

function activePlayerCount(players: Player[]): number {
  return players.filter(p => !p.hasFolded && !p.isEliminated).length;
}

function actingPlayerCount(players: Player[]): number {
  return players.filter(p => !p.hasFolded && !p.isAllIn && !p.isEliminated).length;
}

/* ───────────────────────────────────────────────────────
   Engine
   ─────────────────────────────────────────────────────── */
export interface PlayerConfig {
  id: string;
  name: string;
  stack: number;
  isHuman: boolean;
  aiProfile?: AIProfileType;
  seatIndex: number;
}

export function createInitialState(
  playerConfigs: PlayerConfig[],
  smallBlind: number,
  bigBlind: number,
): GameState {
  const players: Player[] = playerConfigs.map(cfg => ({
    id: cfg.id,
    name: cfg.name,
    seatIndex: cfg.seatIndex,
    stack: cfg.stack,
    holeCards: [],
    currentBet: 0,
    totalBetThisHand: 0,
    hasFolded: false,
    isAllIn: false,
    hasActed: false,
    isEliminated: false,
    isHuman: cfg.isHuman,
    aiProfile: cfg.aiProfile,
  }));

  return {
    street: "preflop",
    deck: [],
    communityCards: [],
    burnCards: [],
    pot: 0,
    players,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind,
    bigBlind,
    handNumber: 0,
    lastRaiseSize: bigBlind,
    actionHistory: [],
    showdownResult: null,
    handOver: false,
    gameOver: false,
    sidePots: [],
    isHeadsUp: players.length === 2,
  };
}

/** Start a new hand: shuffle, post blinds, deal hole cards. */
export function startHand(state: GameState): GameState {
  const s: GameState = {
    ...state,
    players: state.players.map(p => ({ ...p })),
  };
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
  s.sidePots = [];

  // Check eliminations from previous hand
  for (const p of s.players) {
    if (p.stack <= 0 && !p.isEliminated) p.isEliminated = true;
  }

  const remaining = s.players.filter(p => !p.isEliminated);
  if (remaining.length <= 1) {
    s.gameOver = true;
    s.handOver = true;
    return s;
  }
  s.isHeadsUp = remaining.length === 2;

  // Reset players
  for (const p of s.players) {
    p.holeCards = [];
    p.currentBet = 0;
    p.totalBetThisHand = 0;
    p.hasFolded = false;
    p.isAllIn = false;
    p.hasActed = false;
  }

  // Rotate dealer (among non-eliminated players)
  if (s.handNumber > 1) {
    s.dealerIndex = nextInHandPlayer(s.players, s.dealerIndex);
  } else {
    // First hand: find first non-eliminated player
    const first = s.players.findIndex(p => !p.isEliminated);
    s.dealerIndex = first >= 0 ? first : 0;
  }

  // Post blinds
  let sbIdx: number;
  let bbIdx: number;

  if (s.isHeadsUp) {
    // Heads-up: dealer = SB, other = BB
    sbIdx = s.dealerIndex;
    bbIdx = nextInHandPlayer(s.players, sbIdx);
  } else {
    // Multi-player: SB = left of dealer, BB = left of SB
    sbIdx = nextInHandPlayer(s.players, s.dealerIndex);
    bbIdx = nextInHandPlayer(s.players, sbIdx);
  }

  postBlind(s, sbIdx, s.smallBlind, "sb");
  postBlind(s, bbIdx, s.bigBlind, "bb");

  // Deal 2 hole cards to each non-eliminated player
  for (const p of s.players) {
    if (!p.isEliminated) {
      p.holeCards = draw(s.deck, 2);
    }
  }

  // Pre-flop first actor
  if (s.isHeadsUp) {
    // Heads-up: dealer (SB) acts first pre-flop
    s.currentPlayerIndex = sbIdx;
  } else {
    // Multi-player: UTG (left of BB) acts first pre-flop
    s.currentPlayerIndex = nextActivePlayer(s.players, bbIdx);
  }

  // Reset hasActed for all
  for (const p of s.players) {
    p.hasActed = false;
  }

  return s;
}

function postBlind(s: GameState, playerIdx: number, amount: number, blindType: "sb" | "bb") {
  const p = s.players[playerIdx];
  const actual = Math.min(amount, p.stack);
  p.stack -= actual;
  p.currentBet = actual;
  p.totalBetThisHand += actual;
  s.pot += actual;
  if (p.stack === 0) p.isAllIn = true;

  s.actionHistory.push({
    type: blindType,
    amount: actual,
    playerIndex: playerIdx,
    playerId: p.id,
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

  // Find highest current bet among all non-folded, non-eliminated players
  const maxBet = Math.max(
    0,
    ...state.players
      .filter(pl => !pl.hasFolded && !pl.isEliminated)
      .map(pl => pl.currentBet),
  );

  const toCall = Math.max(0, maxBet - p.currentBet);
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
    const minRaiseTotal = maxBet + Math.max(state.lastRaiseSize, state.bigBlind);
    const minRaiseAmount = minRaiseTotal - p.currentBet;
    if (p.stack >= minRaiseAmount) {
      result.canRaise = true;
      result.minRaise = minRaiseAmount;
      result.maxRaise = p.stack; // no-limit
    }
  }

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
  const s: GameState = {
    ...state,
    players: state.players.map(p => ({ ...p })),
    actionHistory: [...state.actionHistory],
  };
  const p = s.players[s.currentPlayerIndex];
  const pIdx = s.currentPlayerIndex;

  // Find highest current bet
  const maxBet = Math.max(
    0,
    ...s.players
      .filter(pl => !pl.hasFolded && !pl.isEliminated)
      .map(pl => pl.currentBet),
  );

  switch (action.type) {
    case "fold": {
      p.hasFolded = true;
      p.hasActed = true;
      s.actionHistory.push({ type: "fold", playerIndex: pIdx, playerId: p.id, street: s.street });

      // Check if only 1 player remains
      if (activePlayerCount(s.players) <= 1) {
        return resolveHandEnd(s);
      }
      break;
    }

    case "check": {
      p.hasActed = true;
      s.actionHistory.push({ type: "check", playerIndex: pIdx, playerId: p.id, street: s.street });
      break;
    }

    case "call": {
      const toCall = Math.min(maxBet - p.currentBet, p.stack);
      p.stack -= toCall;
      p.currentBet += toCall;
      p.totalBetThisHand += toCall;
      s.pot += toCall;
      if (p.stack === 0) p.isAllIn = true;
      p.hasActed = true;
      s.actionHistory.push({ type: "call", amount: toCall, playerIndex: pIdx, playerId: p.id, street: s.street });
      break;
    }

    case "raise": {
      const totalPutIn = action.amount;
      const additional = totalPutIn - p.currentBet;
      const raiseSize = totalPutIn - maxBet;
      p.stack -= additional;
      s.pot += additional;
      p.totalBetThisHand += additional;
      s.lastRaiseSize = Math.max(raiseSize, s.lastRaiseSize);
      p.currentBet = totalPutIn;
      if (p.stack === 0) p.isAllIn = true;
      p.hasActed = true;
      // All other non-folded, non-all-in players must act again
      for (const other of s.players) {
        if (other.id !== p.id && !other.hasFolded && !other.isAllIn && !other.isEliminated) {
          other.hasActed = false;
        }
      }
      s.actionHistory.push({ type: "raise", amount: totalPutIn, playerIndex: pIdx, playerId: p.id, street: s.street });
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
      // If this raises above max bet, others must act again
      if (p.currentBet > maxBet) {
        const raiseSize = p.currentBet - maxBet;
        if (prevBet < maxBet || raiseSize >= s.lastRaiseSize) {
          for (const other of s.players) {
            if (other.id !== p.id && !other.hasFolded && !other.isAllIn && !other.isEliminated) {
              other.hasActed = false;
            }
          }
          s.lastRaiseSize = Math.max(raiseSize, s.lastRaiseSize);
        }
      }
      s.actionHistory.push({ type: "all_in", amount: allInAmt, playerIndex: pIdx, playerId: p.id, street: s.street });
      break;
    }
  }

  // Check if betting round is complete
  if (isBettingRoundComplete(s)) {
    return advanceStreet(s);
  }

  // Advance to next active player
  const nextIdx = nextActivePlayer(s.players, s.currentPlayerIndex);
  if (nextIdx === -1) {
    // No one can act - advance street
    return advanceStreet(s);
  }
  s.currentPlayerIndex = nextIdx;
  return s;
}

function isBettingRoundComplete(s: GameState): boolean {
  const active = s.players.filter(p => !p.hasFolded && !p.isEliminated);

  // Only one player left
  if (active.length <= 1) return true;

  // All remaining are all-in
  if (active.every(p => p.isAllIn)) return true;

  // All non-all-in active players have acted and bets match
  const acting = active.filter(p => !p.isAllIn);
  if (acting.length === 0) return true;

  const targetBet = Math.max(...active.map(p => p.currentBet));
  return acting.every(p => p.hasActed && p.currentBet === targetBet);
}

function advanceStreet(s: GameState): GameState {
  // If only 1 non-folded player, resolve
  if (activePlayerCount(s.players) <= 1) {
    return resolveHandEnd(s);
  }

  // Check if all non-folded are all-in (or only 1 can still bet)
  const allInOrFolded = actingPlayerCount(s.players) <= 1;

  // Reset per-street state
  for (const p of s.players) {
    p.currentBet = 0;
    p.hasActed = false;
  }
  s.lastRaiseSize = s.bigBlind;

  // Determine next street
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

  // Post-flop first actor
  if (s.isHeadsUp) {
    // Heads-up: non-dealer acts first post-flop
    const firstActor = nextActivePlayer(s.players, s.dealerIndex);
    s.currentPlayerIndex = firstActor !== -1 ? firstActor : s.dealerIndex;
  } else {
    // Multi-player: first active player left of dealer
    const firstActor = nextActivePlayer(s.players, s.dealerIndex);
    s.currentPlayerIndex = firstActor !== -1 ? firstActor : s.dealerIndex;
  }

  // If everyone is all-in or only 1 can act, skip betting and advance
  if (allInOrFolded) {
    return advanceStreet(s);
  }

  return s;
}

function resolveHandEnd(s: GameState): GameState {
  // Find the single remaining non-folded player
  const remaining = s.players.filter(p => !p.hasFolded && !p.isEliminated);
  if (remaining.length === 1) {
    remaining[0].stack += s.pot;
  }
  s.showdownResult = null;
  s.pot = 0;
  s.handOver = true;
  s.street = "showdown";

  // Check eliminations
  checkEliminations(s);

  return s;
}

/* ───────────────────────────────────────────────────────
   Side pots & showdown
   ─────────────────────────────────────────────────────── */
export function calculateSidePots(players: Player[]): SidePot[] {
  // Get all players who contributed (including folded - they contributed but can't win)
  const contributors = players.filter(p => !p.isEliminated && p.totalBetThisHand > 0);
  if (contributors.length === 0) return [];

  // Get unique bet levels from non-folded players (sorted ascending)
  const nonFolded = players.filter(p => !p.hasFolded && !p.isEliminated);
  const betLevels = Array.from(new Set(nonFolded.map(p => p.totalBetThisHand))).sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let previousLevel = 0;

  for (const level of betLevels) {
    if (level <= previousLevel) continue;

    const segmentPerPlayer = level - previousLevel;
    let potAmount = 0;

    // All contributors pay into this segment (up to segmentPerPlayer)
    for (const p of contributors) {
      const contribution = Math.min(
        Math.max(0, p.totalBetThisHand - previousLevel),
        segmentPerPlayer,
      );
      potAmount += contribution;
    }

    // Only non-folded players with totalBet >= level are eligible
    const eligible = nonFolded
      .filter(p => p.totalBetThisHand >= level)
      .map(p => p.id);

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
    }

    previousLevel = level;
  }

  return pots;
}

function resolveShowdown(s: GameState): GameState {
  const sidePots = calculateSidePots(s.players);
  s.sidePots = sidePots;

  const allHands = new Map<number, EvalResult>();
  const potResults: ShowdownResult["pots"] = [];

  // Resolve each pot
  for (const pot of sidePots) {
    // Find eligible player indices and their hands
    const eligible = pot.eligiblePlayerIds
      .map(id => s.players.findIndex(p => p.id === id))
      .filter(idx => idx !== -1 && !s.players[idx].hasFolded);

    const playerHands = eligible.map(idx => ({
      playerIndex: idx,
      holeCards: s.players[idx].holeCards,
    }));

    const result = determineWinnerMulti(playerHands, s.communityCards);

    // Store all evaluated hands
    for (const [idx, ev] of Array.from(result.hands.entries())) {
      allHands.set(idx, ev);
    }

    // Distribute pot
    if (result.winnerIndices.length === 1) {
      s.players[result.winnerIndices[0]].stack += pot.amount;
      potResults.push({
        amount: pot.amount,
        winnerIndices: result.winnerIndices,
      });
    } else if (result.winnerIndices.length > 1) {
      // Split pot
      const share = Math.floor(pot.amount / result.winnerIndices.length);
      const remainder = pot.amount - share * result.winnerIndices.length;
      const splitAmounts: number[] = [];
      result.winnerIndices.forEach((idx, i) => {
        const amt = share + (i === 0 ? remainder : 0); // odd chips to first position
        s.players[idx].stack += amt;
        splitAmounts.push(amt);
      });
      potResults.push({
        amount: pot.amount,
        winnerIndices: result.winnerIndices,
        splitAmounts,
      });
    }
  }

  // Build winners list (unique winners across all pots)
  const winnerSet = new Set<number>();
  for (const pr of potResults) {
    for (const idx of pr.winnerIndices) winnerSet.add(idx);
  }
  const winners = Array.from(winnerSet).map(idx => ({
    playerIndex: idx,
    handEval: allHands.get(idx)!,
  }));

  s.showdownResult = {
    winners,
    pots: potResults,
    playerHands: allHands,
  };

  s.pot = 0;
  s.handOver = true;

  checkEliminations(s);

  return s;
}

function checkEliminations(s: GameState): void {
  for (const p of s.players) {
    if (p.stack <= 0 && !p.isEliminated) {
      p.isEliminated = true;
    }
  }
  const remaining = s.players.filter(p => !p.isEliminated);
  if (remaining.length <= 1) {
    s.gameOver = true;
  }
  s.isHeadsUp = remaining.length === 2;
}

/* ───────────────────────────────────────────────────────
   Utility: check who is the active player
   ─────────────────────────────────────────────────────── */
export function isHumanTurn(state: GameState): boolean {
  return state.players[state.currentPlayerIndex]?.isHuman === true && !state.handOver;
}

export function isAITurn(state: GameState): boolean {
  return state.players[state.currentPlayerIndex]?.isHuman === false && !state.handOver;
}

export function getCurrentPlayer(state: GameState): Player | undefined {
  return state.players[state.currentPlayerIndex];
}
