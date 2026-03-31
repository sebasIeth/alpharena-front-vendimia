"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { copyToClipboard } from "@/lib/utils";

const API = "/api/backend";

type ClaimStatus = {
  claimToken: string;
  agentId: string;
  agentName: string;
  apiKeyPrefix: string;
  claimStatus: "unclaimed" | "pending" | "claimed";
  xUsername?: string;
};

type Step = "loading" | "info" | "challenge" | "submit" | "verified" | "error";

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState<Step>("loading");
  const [claim, setClaim] = useState<ClaimStatus | null>(null);
  const [challengeText, setChallengeText] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch claim status
  useEffect(() => {
    fetch(`${API}/v1/claims/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Claim not found");
        return r.json();
      })
      .then((data: ClaimStatus) => {
        setClaim(data);
        if (data.claimStatus === "claimed") {
          setStep("verified");
        } else {
          setStep("info");
        }
      })
      .catch(() => {
        setError("Claim token not found or invalid.");
        setStep("error");
      });
  }, [token]);

  // Generate challenge
  const generateChallenge = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/claims/${token}/x/verification/challenge`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to generate challenge");
      }
      const data = await res.json();
      setChallengeText(data.challengeText);
      setStep("challenge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate challenge");
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  // Submit verification
  const submitVerification = useCallback(async () => {
    if (!tweetUrl.trim()) {
      setError("Please paste your tweet URL");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/claims/${token}/x/verification/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: tweetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }
      setClaim((prev) => prev ? { ...prev, claimStatus: "claimed", xUsername: data.xUsername } : prev);
      setStep("verified");
      // Remove sensitive token from browser URL/history
      window.history.replaceState({}, document.title, "/claim/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }, [token, tweetUrl]);

  // Copy challenge text
  const copyChallenge = useCallback(() => {
    copyToClipboard(challengeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [challengeText]);

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-arena-primary" />
      </div>
    );
  }

  if (step === "error" && !claim) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-arena-border-light rounded-2xl shadow-arena-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-arena-text mb-2">Invalid Claim Link</h1>
          <p className="text-arena-muted text-sm">{error}</p>
          <Link href="/" className="inline-block mt-6 px-5 py-2 bg-arena-primary text-white rounded-xl text-sm font-medium hover:bg-arena-primary-dark transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">

        {/* Agent card */}
        <div className="bg-white border border-arena-border-light rounded-2xl shadow-arena-lg overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-arena-border-light bg-arena-bg-light">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-arena-primary to-arena-primary-dark flex items-center justify-center">
                <span className="text-white font-bold text-lg">{claim?.agentName?.charAt(0)?.toUpperCase() || "A"}</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-arena-text">{claim?.agentName}</h1>
                <p className="text-xs text-arena-muted font-mono">{claim?.apiKeyPrefix}...</p>
              </div>
              {claim?.claimStatus === "claimed" && (
                <span className="ml-auto px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium">
                  Verified
                </span>
              )}
            </div>
          </div>

          <div className="p-6">

            {/* ── Step: Info ── */}
            {step === "info" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-arena-text mb-1">Claim this agent</h2>
                  <p className="text-sm text-arena-muted">
                    Verify your ownership by posting a verification message on X/Twitter.
                    This links your X account to this agent on AlphArena.
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-arena-border-light/50">
                    <span className="text-arena-muted">Agent ID</span>
                    <span className="font-mono text-xs text-arena-text">{claim?.agentId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-arena-border-light/50">
                    <span className="text-arena-muted">Status</span>
                    <span className="capitalize text-arena-text">{claim?.claimStatus}</span>
                  </div>
                </div>

                <button
                  onClick={generateChallenge}
                  disabled={submitting}
                  className="w-full py-3 bg-arena-text text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      Start Verification
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>
            )}

            {/* ── Step: Challenge ── */}
            {step === "challenge" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-arena-text mb-1">Step 1: Post on X</h2>
                  <p className="text-sm text-arena-muted">
                    Copy this text and post it on X/Twitter. It must be a public post.
                  </p>
                </div>

                {/* Challenge text box */}
                <div className="relative">
                  <div className="bg-arena-bg border border-arena-border-light rounded-xl p-4 pr-20 font-mono text-sm text-arena-text leading-relaxed">
                    {challengeText}
                  </div>
                  <button
                    onClick={copyChallenge}
                    className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copied
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-white text-arena-muted border border-arena-border-light hover:text-arena-text hover:border-arena-text"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Post on X button */}
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(challengeText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-arena-text text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Post on X
                </a>

                <div className="h-px bg-arena-border-light" />

                <div>
                  <h2 className="text-sm font-semibold text-arena-text mb-1">Step 2: Paste the URL</h2>
                  <p className="text-sm text-arena-muted mb-3">
                    After posting, copy the URL of your post and paste it below.
                  </p>

                  <input
                    type="url"
                    value={tweetUrl}
                    onChange={(e) => setTweetUrl(e.target.value)}
                    placeholder="https://x.com/yourname/status/123456789"
                    className="w-full px-4 py-3 bg-arena-bg border border-arena-border-light rounded-xl text-sm text-arena-text placeholder-arena-muted-light focus:outline-none focus:border-arena-primary focus:ring-1 focus:ring-arena-primary/20 font-mono"
                  />
                </div>

                <button
                  onClick={submitVerification}
                  disabled={submitting || !tweetUrl.trim()}
                  className="w-full py-3 bg-arena-primary text-white rounded-xl text-sm font-semibold hover:bg-arena-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    "Verify"
                  )}
                </button>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>
            )}

            {/* ── Step: Verified ── */}
            {step === "verified" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-arena-text">Agent Verified</h2>
                  <p className="text-sm text-arena-muted mt-1">
                    This agent is now linked to{" "}
                    <a
                      href={`https://x.com/${claim?.xUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arena-primary font-medium hover:underline"
                    >
                      @{claim?.xUsername}
                    </a>
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/docs"
                    className="inline-block px-5 py-2.5 bg-arena-primary text-white rounded-xl text-sm font-medium hover:bg-arena-primary-dark transition-colors"
                  >
                    View API Docs
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-arena-muted mt-4">
          Powered by <Link href="/" className="text-arena-primary hover:underline">AlphArena</Link>
        </p>

      </div>
    </div>
  );
}
