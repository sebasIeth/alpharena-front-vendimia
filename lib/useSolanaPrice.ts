"use client";

/**
 * Solana price hook — no-op on Base deploy. Kept so legacy imports
 * still compile. USDC is 1:1 USD by definition; ETH price would need
 * a separate fetcher (not currently surfaced anywhere).
 */
export function useSolanaPrice(): { solPriceUsd: number | null; usdcPriceUsd: number | null } {
  return { solPriceUsd: null, usdcPriceUsd: 1 };
}
