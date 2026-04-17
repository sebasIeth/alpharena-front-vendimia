"use client";

import React, { useMemo } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Wraps the app with wagmi + react-query so EVM wallet interaction hooks
 * (useAccount, useConnect, useDisconnect, useSignMessage, useWriteContract,
 * etc.) work anywhere under the tree.
 *
 * Chains: Base mainnet (8453) and Base Sepolia (84532). The default chain
 * follows NEXT_PUBLIC_CHAIN_ENV — 'mainnet' picks Base mainnet, anything
 * else picks Sepolia.
 *
 * Connectors: `injected()` catches any EIP-1193 provider that the browser
 * exposes — MetaMask, Rabby, Brave, Coinbase extension, etc. WalletConnect
 * is intentionally not wired until we have a project ID.
 */

const preferMainnet = process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet";
const chains = preferMainnet
  ? ([base, baseSepolia] as const)
  : ([baseSepolia, base] as const);

const rpcBase = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const rpcBaseSepolia =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected({
      shimDisconnect: true,
      target() {
        // Expose itself as "Browser Wallet" rather than "Injected" so the
        // UI copy is user-friendly when MetaMask / Rabby / Coinbase
        // announces itself via EIP-6963.
        return {
          id: "browserWallet",
          name: "Browser Wallet",
          provider: typeof window !== "undefined" ? (window as any).ethereum : undefined,
        };
      },
    }),
  ],
  transports: {
    [base.id]: http(rpcBase),
    [baseSepolia.id]: http(rpcBaseSepolia),
  },
  ssr: true,
});

export default function BaseWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
