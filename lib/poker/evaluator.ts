import type { PokerCard } from "@/lib/types";
import { rankValue } from "./deck";

/* ───────────────────────────────────────────────────────
   Hand ranking constants (higher = better)
   ─────────────────────────────────────────────────────── */
export const HandRank = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
} as const;

export type HandRankValue = (typeof HandRank)[keyof typeof HandRank];

export const HAND_NAMES: Record<number, string> = {
  [HandRank.HIGH_CARD]: "High Card",
  [HandRank.ONE_PAIR]: "One Pair",
  [HandRank.TWO_PAIR]: "Two Pair",
  [HandRank.THREE_OF_A_KIND]: "Three of a Kind",
  [HandRank.STRAIGHT]: "Straight",
  [HandRank.FLUSH]: "Flush",
  [HandRank.FULL_HOUSE]: "Full House",
  [HandRank.FOUR_OF_A_KIND]: "Four of a Kind",
  [HandRank.STRAIGHT_FLUSH]: "Straight Flush",
  [HandRank.ROYAL_FLUSH]: "Royal Flush",
};

/* ───────────────────────────────────────────────────────
   Evaluation result
   ─────────────────────────────────────────────────────── */
export interface EvalResult {
  rank: HandRankValue;
  /** Tie‑breaking values, most significant first.
   *  e.g. for a pair of Kings with A‑Q‑J kickers → [13, 14, 12, 11] */
  tiebreakers: number[];
  /** Human‑readable name, e.g. "Full House" */
  name: string;
  /** The 5 cards that form the best hand */
  bestCards: PokerCard[];
}

/* ───────────────────────────────────────────────────────
   Internal helpers
   ─────────────────────────────────────────────────────── */
function val(c: PokerCard): number {
  return rankValue(c.rank);
}

/** Generate all C(n,5) 5‑card combinations from an array. */
function combinations5(cards: PokerCard[]): PokerCard[][] {
  const result: PokerCard[][] = [];
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++)
            result.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
  return result;
}

/** Evaluate exactly 5 cards and return an EvalResult. */
function evaluate5(cards: PokerCard[]): EvalResult {
  const vals = cards.map(val).sort((a, b) => b - a); // descending
  const suits = cards.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight (including A‑low: A‑2‑3‑4‑5)
  let isStraight = false;
  let straightHigh = 0;
  // Normal straight
  if (vals[0] - vals[4] === 4 && new Set(vals).size === 5) {
    isStraight = true;
    straightHigh = vals[0];
  }
  // Wheel (A‑2‑3‑4‑5): vals sorted desc would be [14,5,4,3,2]
  if (!isStraight && vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2) {
    isStraight = true;
    straightHigh = 5; // 5‑high straight
  }

  // Count ranks
  const counts: Map<number, number> = new Map();
  for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
  const groups = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // Determine hand rank
  if (isStraight && isFlush) {
    if (straightHigh === 14) {
      return { rank: HandRank.ROYAL_FLUSH, tiebreakers: [14], name: HAND_NAMES[HandRank.ROYAL_FLUSH], bestCards: cards };
    }
    return { rank: HandRank.STRAIGHT_FLUSH, tiebreakers: [straightHigh], name: HAND_NAMES[HandRank.STRAIGHT_FLUSH], bestCards: cards };
  }

  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups[1][0];
    return { rank: HandRank.FOUR_OF_A_KIND, tiebreakers: [quad, kicker], name: HAND_NAMES[HandRank.FOUR_OF_A_KIND], bestCards: cards };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { rank: HandRank.FULL_HOUSE, tiebreakers: [groups[0][0], groups[1][0]], name: HAND_NAMES[HandRank.FULL_HOUSE], bestCards: cards };
  }

  if (isFlush) {
    return { rank: HandRank.FLUSH, tiebreakers: vals, name: HAND_NAMES[HandRank.FLUSH], bestCards: cards };
  }

  if (isStraight) {
    return { rank: HandRank.STRAIGHT, tiebreakers: [straightHigh], name: HAND_NAMES[HandRank.STRAIGHT], bestCards: cards };
  }

  if (groups[0][1] === 3) {
    const trip = groups[0][0];
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { rank: HandRank.THREE_OF_A_KIND, tiebreakers: [trip, ...kickers], name: HAND_NAMES[HandRank.THREE_OF_A_KIND], bestCards: cards };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups[2][0];
    return { rank: HandRank.TWO_PAIR, tiebreakers: [highPair, lowPair, kicker], name: HAND_NAMES[HandRank.TWO_PAIR], bestCards: cards };
  }

  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { rank: HandRank.ONE_PAIR, tiebreakers: [pair, ...kickers], name: HAND_NAMES[HandRank.ONE_PAIR], bestCards: cards };
  }

  return { rank: HandRank.HIGH_CARD, tiebreakers: vals, name: HAND_NAMES[HandRank.HIGH_CARD], bestCards: cards };
}

/* ───────────────────────────────────────────────────────
   Public API
   ─────────────────────────────────────────────────────── */

/**
 * Given 5‑7 cards (hole + community), find the best possible 5‑card hand.
 */
export function evaluateHand(cards: PokerCard[]): EvalResult {
  if (cards.length < 5) throw new Error("Need at least 5 cards to evaluate");
  if (cards.length === 5) return evaluate5(cards);

  const combos = combinations5(cards);
  let best: EvalResult | null = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || compareEval(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

/**
 * Compare two EvalResults. Returns:
 *   > 0 if a wins, < 0 if b wins, 0 if tie
 */
export function compareEval(a: EvalResult, b: EvalResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  }
  return 0;
}

/**
 * Determine the winner(s) between two players given their hole cards and community cards.
 * Returns 0 (player 0 wins), 1 (player 1 wins), or -1 (split pot).
 */
export function determineWinner(
  holeCards0: PokerCard[],
  holeCards1: PokerCard[],
  community: PokerCard[],
): { winner: number; hand0: EvalResult; hand1: EvalResult } {
  const hand0 = evaluateHand([...holeCards0, ...community]);
  const hand1 = evaluateHand([...holeCards1, ...community]);
  const cmp = compareEval(hand0, hand1);
  return {
    winner: cmp > 0 ? 0 : cmp < 0 ? 1 : -1,
    hand0,
    hand1,
  };
}

/**
 * Quick hand‑strength score (0‑1) for AI usage.
 * Evaluates current best hand relative to all possible hands.
 */
export function handStrengthScore(holeCards: PokerCard[], community: PokerCard[]): number {
  if (community.length === 0) {
    // Pre‑flop: use Chen formula simplified
    return preflopStrength(holeCards);
  }
  const hand = evaluateHand([...holeCards, ...community]);
  // Map rank 1‑10 to 0‑1 with a curve that separates weak from strong
  const base = (hand.rank - 1) / 9; // 0 to 1
  // Add kicker bonus (first tiebreaker normalized)
  const kickerBonus = hand.tiebreakers.length > 0 ? (hand.tiebreakers[0] - 2) / 12 * 0.1 : 0;
  return Math.min(1, base + kickerBonus);
}

/** Simplified pre‑flop hand strength (0‑1). */
function preflopStrength(holeCards: PokerCard[]): number {
  const v1 = val(holeCards[0]);
  const v2 = val(holeCards[1]);
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const suited = holeCards[0].suit === holeCards[1].suit;
  const pair = v1 === v2;

  let score = 0;
  if (pair) {
    score = 0.5 + (high - 2) / 24; // pairs: 0.5 - 1.0
  } else {
    score = (high - 2) / 24 + (low - 2) / 48; // high card weight
    if (suited) score += 0.05;
    if (high - low === 1) score += 0.03; // connectors
    if (high - low <= 3) score += 0.02; // near connectors
  }
  return Math.min(1, Math.max(0, score));
}
