"use client";

import { useState, useEffect, useCallback } from "react";

const SOL_TOKEN = "So11111111111111111111111111111111111111112";
const SOL_DEX_URL = `https://api.dexscreener.com/latest/dex/tokens/${SOL_TOKEN}`;
const POLL_INTERVAL = 60_000;

let cachedSolPrice: number | null = null;
let lastSolFetch = 0;

async function fetchSolPrice(): Promise<number | null> {
  if (cachedSolPrice !== null && Date.now() - lastSolFetch < POLL_INTERVAL) {
    return cachedSolPrice;
  }
  try {
    const res = await fetch(SOL_DEX_URL);
    if (!res.ok) return cachedSolPrice;
    const data = await res.json();
    // Find a SOL/stablecoin pair (not a random token paired with SOL)
    const solPair = data?.pairs?.find((p: any) => {
      const base = p.baseToken?.symbol?.toUpperCase();
      const quote = p.quoteToken?.symbol?.toUpperCase();
      return (
        (base === "SOL" && (quote === "USDC" || quote === "USDT")) ||
        ((base === "USDC" || base === "USDT") && quote === "SOL")
      );
    });
    const pair = solPair || data?.pairs?.[0];
    const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
    if (price !== null && !isNaN(price) && price > 1) {
      cachedSolPrice = price;
      lastSolFetch = Date.now();
    }
    return cachedSolPrice;
  } catch {
    return cachedSolPrice;
  }
}

export function useSolanaPrice(): { solPriceUsd: number | null; usdcPriceUsd: number } {
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(cachedSolPrice);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const price = await fetchSolPrice();
      if (!cancelled) setSolPriceUsd(price);
    }
    load();
    const interval = setInterval(async () => {
      const price = await fetchSolPrice();
      if (!cancelled) setSolPriceUsd(price);
    }, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // USDC is always ~$1
  return { solPriceUsd, usdcPriceUsd: 1 };
}
