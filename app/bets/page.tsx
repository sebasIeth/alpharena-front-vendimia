"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, getExplorerTxUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import ScheduledMatches from "@/components/scheduled/ScheduledMatches";
import Button from "@/components/ui/Button";
import type { PendingClaim, Chain } from "@/lib/types";

/* ── Icons ── */
function IconCoin({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export default function BetsPage() {
  const { t } = useLanguage();
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ type: "success" | "error"; text: string; txHash?: string; chain?: Chain } | null>(null);

  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("arena_token");

  const fetchClaims = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await api.getMyPendingClaims();
      setPendingClaims(res.claims || []);
    } catch {
      setPendingClaims([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleClaimBet = async (matchId: string, chain: Chain) => {
    setClaimingId(matchId);
    setClaimMsg(null);
    try {
      const res = await api.claimBet(matchId);
      setClaimMsg({ type: "success", text: t.betting.claimSuccess, txHash: res.txHash, chain });
      fetchClaims();
    } catch (err) {
      setClaimMsg({ type: "error", text: err instanceof Error ? err.message : t.betting.claimFailed });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Page Header ── */}
        <div
          className="mb-10 opacity-0 animate-fade-up"
          style={{ animationDelay: "0.05s", animationFillMode: "both" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-arena-accent/10 flex items-center justify-center">
              <IconCoin className="w-5 h-5 text-arena-accent" />
            </div>
            <h1 className="text-3xl font-display font-bold text-arena-text-bright tracking-tight">
              {t.betting.agentMatches}
            </h1>
          </div>
          <p className="text-sm text-arena-muted ml-[52px]">
            {t.betting.agentMatchesDesc}
          </p>
        </div>

        {/* ── Pending Claims (logged-in users only) ── */}
        {isLoggedIn && pendingClaims.length > 0 && (
          <div
            className="dash-glass-card rounded-2xl p-6 mb-8 opacity-0 animate-fade-up ring-1 ring-arena-accent/20"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-arena-accent/10 flex items-center justify-center ring-1 ring-inset ring-arena-accent/5">
                <IconCoin className="w-5 h-5 text-arena-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arena-text-bright uppercase tracking-wider font-mono">
                  {t.betting.pendingClaims}
                </h3>
                <p className="text-xs text-arena-muted">{pendingClaims.length} {t.betting.unclaimedBets}</p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.matchId}
                  className="flex items-center justify-between gap-4 p-4 bg-white/50 border border-arena-border-light/40 rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-arena-text-bright capitalize">
                        {claim.gameType}
                      </span>
                      <span className="text-[10px] font-mono text-arena-muted px-1.5 py-0.5 bg-arena-bg/50 rounded">
                        {claim.matchId.slice(0, 8)}...
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        claim.chain === "celo"
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {claim.chain === "celo" ? "Celo" : "Base"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-arena-muted font-mono">
                        {t.betting.yourTotal}: {Object.values(claim.betsByAgent || {}).reduce((s, v) => s + v, 0).toFixed(2)} ALPHA
                      </span>
                      {claim.winnings > 0 && (
                        <span className="text-xs font-semibold text-arena-success font-mono">
                          +{(Number(claim.winnings) * 0.95).toFixed(2)} ALPHA
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                        claim.outcome === "won" ? "bg-arena-success/10 text-arena-success" :
                        claim.outcome === "refund" ? "bg-arena-muted/10 text-arena-muted" :
                        "bg-arena-accent/10 text-arena-accent"
                      }`}>
                        {claim.outcome === "won" ? t.common.won : claim.outcome === "refund" ? t.betting.refunded : claim.outcome}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/matches/${claim.matchId}`}>
                      <Button variant="ghost" size="sm">
                        <IconArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => handleClaimBet(claim.matchId, claim.chain)}
                      disabled={claimingId === claim.matchId}
                      isLoading={claimingId === claim.matchId}
                    >
                      {claimingId === claim.matchId ? t.betting.claiming : claim.outcome === "refund" ? t.betting.claimRefund : t.betting.claimWinnings}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {claimMsg && (
              <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                claimMsg.type === "success" ? "bg-arena-success/10 text-arena-success" : "bg-arena-danger/10 text-arena-danger"
              }`}>
                {claimMsg.text}
                {claimMsg.txHash && claimMsg.chain && (
                  <a
                    href={getExplorerTxUrl(claimMsg.txHash, claimMsg.chain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 underline text-xs"
                  >
                    {t.common.viewOnExplorer}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Scheduled Matches with Betting ── */}
        <ScheduledMatches />
      </div>
    </div>
  );
}
