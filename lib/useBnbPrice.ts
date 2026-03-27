"use client";

import { useState, useEffect } from "react";

// WBNB on BSC
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const DEX_URL = `https://api.dexscreener.com/latest/dex/tokens/${WBNB}`;
const POLL_INTERVAL = 60_000;

let cachedBnbPrice: number | null = null;
let lastBnbFetch = 0;

async function fetchBnbPrice(): Promise<number | null> {
  if (cachedBnbPrice !== null && Date.now() - lastBnbFetch < POLL_INTERVAL) {
    return cachedBnbPrice;
  }
  try {
    const res = await fetch(DEX_URL);
    if (!res.ok) return cachedBnbPrice;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
    if (price !== null && !isNaN(price)) {
      cachedBnbPrice = price;
      lastBnbFetch = Date.now();
    }
    return cachedBnbPrice;
  } catch {
    return cachedBnbPrice;
  }
}

export function useBnbPrice(): { bnbPriceUsd: number | null; usdcPriceUsd: number } {
  const [bnbPriceUsd, setBnbPriceUsd] = useState<number | null>(cachedBnbPrice);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const price = await fetchBnbPrice();
      if (!cancelled) setBnbPriceUsd(price);
    }
    load();
    const interval = setInterval(async () => {
      const price = await fetchBnbPrice();
      if (!cancelled) setBnbPriceUsd(price);
    }, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { bnbPriceUsd, usdcPriceUsd: 1 };
}
