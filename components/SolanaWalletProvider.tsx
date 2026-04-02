"use client";

import { useMemo } from "react";
import {
  ConnectionProvider as _ConnectionProvider,
  WalletProvider as _WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as _WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

import "@solana/wallet-adapter-react-ui/styles.css";

// Cast to any to fix React 18/19 JSX type incompatibility
const ConnectionProvider = _ConnectionProvider as any;
const WalletProvider = _WalletProvider as any;
const WalletModalProvider = _WalletModalProvider as any;

// Use local proxy to avoid exposing Helius API key in the browser bundle
const RPC_ENDPOINT =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/rpc`
    : (process.env.SOLANA_RPC_INTERNAL || "https://api.mainnet-beta.solana.com");

export default function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
