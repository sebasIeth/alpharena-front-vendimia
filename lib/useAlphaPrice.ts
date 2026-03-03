"use client";

import { useState, useEffect } from "react";

const ALPHA_TOKEN = "0x324f2BD09e908f28217CC19Bb9599b199c736bA3";
const DEX_URL = `https://api.dexscreener.com/latest/dex/tokens/${ALPHA_TOKEN}`;
const POLL_INTERVAL = 60_000; // 60 seconds

// Module-level cache shared across all hook instances
let cachedPrice: number | null = null;
let lastFetchTime = 0;

async function fetchPrice(): Promise<number | null> {
  // Return cache if fresh
  if (cachedPrice !== null && Date.now() - lastFetchTime < POLL_INTERVAL) {
    return cachedPrice;
  }
  try {
    const res = await fetch(DEX_URL);
    if (!res.ok) return cachedPrice;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
    if (price !== null && !isNaN(price)) {
      cachedPrice = price;
      lastFetchTime = Date.now();
    }
    return cachedPrice;
  } catch {
    return cachedPrice;
  }
}

export function useAlphaPrice(): { priceUsd: number | null; loading: boolean } {
  const [priceUsd, setPriceUsd] = useState<number | null>(cachedPrice);
  const [loading, setLoading] = useState(cachedPrice === null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const price = await fetchPrice();
      if (!cancelled) {
        setPriceUsd(price);
        setLoading(false);
      }
    }

    load();

    const interval = setInterval(async () => {
      const price = await fetchPrice();
      if (!cancelled) setPriceUsd(price);
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { priceUsd, loading };
}
