"use client";

/**
 * ALPHA was a Solana SPL token. On the Base deploy there is no ALPHA,
 * so this hook is a no-op that returns null. Kept as an exported name
 * so existing imports compile without having to touch every caller.
 */
export function useAlphaPrice(): { priceUsd: number | null; loading: boolean } {
  return { priceUsd: null, loading: false };
}
