import type { PokerCard } from "@/lib/types";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

/** Numeric value for a rank string (2‑14, Ace = 14). */
export function rankValue(rank: string): number {
  const idx = RANKS.indexOf(rank as (typeof RANKS)[number]);
  return idx === -1 ? 0 : idx + 2;
}

/** Build a fresh 52‑card deck (unshuffled). */
export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Fisher‑Yates in‑place shuffle. Returns the same array. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Draw `count` cards from the top of the deck (mutates the deck array). */
export function draw(deck: PokerCard[], count: number): PokerCard[] {
  return deck.splice(0, count);
}
