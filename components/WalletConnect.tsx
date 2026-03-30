"use client";

import React, { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton as _WalletMultiButton } from "@solana/wallet-adapter-react-ui";
const WalletMultiButton = _WalletMultiButton as any;
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { truncateAddress } from "@/lib/utils";
import * as bs58 from "bs58";

export default function WalletConnect() {
  const { user, setUser } = useAuthStore();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLinked = !!user?.externalWalletAddress;
  const isExternal = user?.walletType === "external";

  const handleLinkWallet = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Get nonce from backend
      const { message } = await api.getWalletNonce();

      // 2. Sign the message with wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.default.encode(signatureBytes);

      // 3. Send to backend for verification
      const result = await api.connectWallet(publicKey.toBase58(), signature);
      setUser(result.user);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage, setUser]);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.disconnectWallet();
      setUser(result.user);
      disconnect();
    } catch (err: any) {
      setError(err?.message || "Failed to disconnect wallet");
    } finally {
      setLoading(false);
    }
  }, [setUser, disconnect]);

  const handleSwitch = useCallback(async (walletType: "custodial" | "external") => {
    setLoading(true);
    setError("");
    try {
      const result = await api.switchWallet(walletType);
      setUser(result.user);
    } catch (err: any) {
      setError(err?.message || "Failed to switch wallet");
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  return (
    <div className="dash-glass-card rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center ring-1 ring-inset ring-violet-500/5">
          <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">
          External Wallet
        </h3>
      </div>

      {!isLinked ? (
        /* Not linked yet */
        <div className="space-y-4">
          <p className="text-xs text-arena-muted">
            Connect your Solana wallet (Phantom, Solflare) to sign transactions yourself instead of using the custodial wallet.
          </p>

          {!connected ? (
            <div className="flex justify-center"><WalletMultiButton className="!bg-violet-600 hover:!bg-violet-700 !rounded-xl !text-sm !font-mono !h-10" /></div>
          ) : (
            <div className="space-y-3">
              <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">Connected Wallet</div>
                <span className="text-xs font-mono text-arena-text">{publicKey?.toBase58()}</span>
              </div>
              <button
                onClick={handleLinkWallet}
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm font-mono font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing..." : "Sign & Link Wallet"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Already linked */
        <div className="space-y-4">
          {/* Wallet addresses */}
          <div className="space-y-2">
            <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${isExternal ? 'bg-violet-50/50 border-violet-200' : 'bg-arena-bg/50 border-arena-border-light'}`}>
              <div className={`w-2 h-2 rounded-full ${isExternal ? 'bg-violet-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">External Wallet</div>
                <span className="text-xs font-mono text-arena-text">{truncateAddress(user!.externalWalletAddress!, 8)}</span>
              </div>
              {isExternal && <span className="text-[10px] font-mono font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">ACTIVE</span>}
            </div>

            <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${!isExternal ? 'bg-emerald-50/50 border-emerald-200' : 'bg-arena-bg/50 border-arena-border-light'}`}>
              <div className={`w-2 h-2 rounded-full ${!isExternal ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">Custodial Wallet</div>
                <span className="text-xs font-mono text-arena-text">{truncateAddress(user!.walletAddress, 8)}</span>
              </div>
              {!isExternal && <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">ACTIVE</span>}
            </div>
          </div>

          {/* Switch & Disconnect buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSwitch(isExternal ? "custodial" : "external")}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs font-mono font-semibold rounded-lg bg-arena-bg border border-arena-border-light text-arena-text hover:border-arena-primary/30 disabled:opacity-50 transition-all"
            >
              {loading ? "..." : `Switch to ${isExternal ? "Custodial" : "External"}`}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-3 py-2 text-xs font-mono font-semibold rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-all"
            >
              {loading ? "..." : "Unlink"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
