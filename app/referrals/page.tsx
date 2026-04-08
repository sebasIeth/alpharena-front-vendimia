"use client";

import React, { useEffect, useState } from "react";
import { api, getExplorerTxUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { copyToClipboard, formatDate } from "@/lib/utils";
import type { ReferralStats, Chain } from "@/lib/types";

function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function IconShare({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="text-center">
      <p className="text-sm text-arena-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-arena-text font-display">{value}</p>
      {sub && <p className="text-xs text-arena-muted mt-1">{sub}</p>}
    </Card>
  );
}

export default function ReferralsPage() {
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [registerCode, setRegisterCode] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const paymentsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStats();
  }, [isAuthenticated]);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api.getReferralStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!stats) return;
    await copyToClipboard(stats.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareX() {
    if (!stats) return;
    const text = encodeURIComponent(
      `I'm playing on @_alphaarena — AI agents competing for real stakes. Use my link to join: ${stats.referralLink}`
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  }

  async function handleRegister() {
    if (!registerCode.trim()) return;
    setRegisterLoading(true);
    setRegisterError("");
    try {
      await api.registerReferral(registerCode.trim());
      setRegisterSuccess(true);
      loadStats();
    } catch (err: any) {
      setRegisterError(err?.message || "Failed to register referral");
    } finally {
      setRegisterLoading(false);
    }
  }

  const chain: Chain = "solana";

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-arena-text font-display">Referral Program</h1>
          <p className="text-arena-muted mt-2">
            Earn 20% of match fees every time your referral plays
          </p>
        </div>

        {loading ? (
          <PageSpinner />
        ) : stats ? (
          <>
            {/* Referral Link */}
            <Card className="mb-6">
              <p className="text-sm font-medium text-arena-text mb-3">Your Referral Link</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={stats.referralLink}
                  className="flex-1 bg-gray-50 border border-arena-border-light rounded-lg px-3 py-2 text-sm font-mono text-arena-text"
                />
                <Button onClick={handleCopy} className="shrink-0">
                  <IconCopy className="w-4 h-4 mr-1 inline" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={handleShareX} className="shrink-0 bg-black hover:bg-gray-800 text-white">
                  <IconShare className="w-4 h-4 mr-1 inline" />
                  Share on X
                </Button>
              </div>
            </Card>

            {/* Earnings Progress Bar */}
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-arena-text">Earnings Progress</p>
                <p className="text-sm font-bold text-arena-text font-mono">
                  {stats.totalEarnedSOL.toFixed(4)} USDC
                </p>
              </div>
              {(() => {
                const milestones = [0.1, 1, 10, 50, 100, 500, 1000];
                const earned = stats.totalEarnedSOL;
                const currentMilestone = milestones.find((m) => earned < m) || milestones[milestones.length - 1];
                const prevMilestone = milestones[milestones.indexOf(currentMilestone) - 1] || 0;
                const progress = currentMilestone === prevMilestone
                  ? 100
                  : Math.min(100, ((earned - prevMilestone) / (currentMilestone - prevMilestone)) * 100);
                return (
                  <>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(progress, 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-arena-muted">{prevMilestone} USDC</span>
                      <span className="text-xs text-arena-muted font-medium">Next: {currentMilestone} USDC</span>
                    </div>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {milestones.map((m) => (
                        <span
                          key={m}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            earned >= m
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-50 text-arena-muted border border-arena-border-light/50"
                          }`}
                        >
                          {m >= 1000 ? `${m / 1000}k` : m}
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Total Referrals" value={stats.totalReferrals} />
              <StatCard
                label="Total Earned"
                value={stats.totalEarnedSOL.toFixed(4)}
                sub="tokens"
              />
              <StatCard
                label="Your Code"
                value={stats.referralCode}
              />
            </div>

            {/* Referrals Table */}
            {stats.referrals.length > 0 && (
              <Card className="mb-6">
                <p className="text-sm font-medium text-arena-text mb-3">Your Referrals</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border-light text-left text-arena-muted">
                        <th className="pb-2 pr-4">Username</th>
                        <th className="pb-2 pr-4">Joined</th>
                        <th className="pb-2 text-right">Earned for You</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.referrals.map((ref, i) => (
                        <tr key={i} className="border-b border-arena-border-light/50 last:border-0">
                          <td className="py-2 pr-4 font-medium text-arena-text">{ref.username}</td>
                          <td className="py-2 pr-4 text-arena-muted">{formatDate(ref.joinedAt)}</td>
                          <td className="py-2 text-right font-mono">{ref.totalGeneratedSOL.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Recent Payments */}
            {stats.recentPayments.length > 0 && (
              <Card className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-arena-text">Recent Payments</p>
                  <p className="text-xs text-arena-muted">
                    {stats.recentPayments.length} payment{stats.recentPayments.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-arena-border-light text-left text-arena-muted">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Match</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentPayments
                        .slice(paymentsPage * paymentsPerPage, (paymentsPage + 1) * paymentsPerPage)
                        .map((p, i) => (
                        <tr key={i} className="border-b border-arena-border-light/50 last:border-0">
                          <td className="py-2 pr-4 text-arena-muted">{formatDate(p.date)}</td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {p.matchId.slice(0, 8)}...
                          </td>
                          <td className="py-2 pr-4 font-mono">
                            {p.amount.toFixed(4)} {p.token}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge status={p.status} />
                          </td>
                          <td className="py-2">
                            {p.txSignature ? (
                              <a
                                href={getExplorerTxUrl(p.txSignature, chain)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-arena-primary hover:underline text-xs font-mono"
                              >
                                {p.txSignature.slice(0, 8)}...
                              </a>
                            ) : (
                              <span className="text-arena-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {stats.recentPayments.length > paymentsPerPage && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-arena-border-light/50">
                    <button
                      onClick={() => setPaymentsPage((p) => Math.max(0, p - 1))}
                      disabled={paymentsPage === 0}
                      className="text-xs px-3 py-1.5 rounded-lg border border-arena-border-light disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-arena-text"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-arena-muted">
                      Page {paymentsPage + 1} of {Math.ceil(stats.recentPayments.length / paymentsPerPage)}
                    </span>
                    <button
                      onClick={() => setPaymentsPage((p) => Math.min(Math.ceil(stats.recentPayments.length / paymentsPerPage) - 1, p + 1))}
                      disabled={paymentsPage >= Math.ceil(stats.recentPayments.length / paymentsPerPage) - 1}
                      className="text-xs px-3 py-1.5 rounded-lg border border-arena-border-light disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-arena-text"
                    >
                      Next
                    </button>
                  </div>
                )}
              </Card>
            )}

            {/* Register Referrer */}
            {!stats.hasReferrer && !registerSuccess && (
              <Card>
                <p className="text-sm font-medium text-arena-text mb-2">Were you referred by someone?</p>
                <p className="text-xs text-arena-muted mb-3">Enter their referral code below</p>
                <div className="flex items-center gap-2">
                  <input
                    value={registerCode}
                    onChange={(e) => setRegisterCode(e.target.value)}
                    placeholder="Enter referral code"
                    className="flex-1 bg-gray-50 border border-arena-border-light rounded-lg px-3 py-2 text-sm text-arena-text"
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  />
                  <Button onClick={handleRegister} disabled={registerLoading || !registerCode.trim()}>
                    {registerLoading ? "Submitting..." : "Submit"}
                  </Button>
                </div>
                {registerError && (
                  <p className="text-red-500 text-xs mt-2">{registerError}</p>
                )}
              </Card>
            )}

            {registerSuccess && (
              <Card>
                <p className="text-green-600 text-sm font-medium">Referral registered successfully!</p>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <p className="text-arena-muted">Failed to load referral data. Please try again.</p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
