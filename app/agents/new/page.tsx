"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import type { Agent, AgentType } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

function CreateAgentContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [agentType, setAgentType] = useState<AgentType>("openclaw");
  const [formData, setFormData] = useState({
    name: "",
    endpointUrl: "",
    openclawUrl: "",
    openclawToken: "",
    openclawAgentId: "",
    selfclawPublicKey: "",
    marrakech: true,
    reversi: false,
    chess: false,
  });
  const [showGuide, setShowGuide] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);
  const [healthCheck, setHealthCheck] = useState<{
    status: "idle" | "checking" | "success" | "error";
    latencyMs?: number;
    error?: string;
  }>({ status: "idle" });
  const [selfclawCheck, setSelfclawCheck] = useState<{
    status: "idle" | "checking" | "success" | "error";
    agentName?: string;
    error?: string;
  }>({ status: "idle" });

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleTestConnection = async () => {
    if (!formData.openclawUrl.trim() || !formData.openclawToken.trim()) {
      setHealthCheck({
        status: "error",
        error: t.createAgent.testUrlTokenRequired,
      });
      return;
    }
    if (!validateUrl(formData.openclawUrl.trim())) {
      setHealthCheck({ status: "error", error: t.createAgent.invalidUrlFormat });
      return;
    }

    setHealthCheck({ status: "checking" });

    try {
      const result = await api.testOpenClawWebhook(
        formData.openclawUrl.trim(),
        formData.openclawToken.trim(),
      );

      if (result.ok) {
        setHealthCheck({ status: "success", latencyMs: result.latencyMs });
      } else {
        setHealthCheck({
          status: "error",
          latencyMs: result.latencyMs,
          error: result.error || t.createAgent.connectionFailed,
        });
      }
    } catch (err) {
      setHealthCheck({
        status: "error",
        error: err instanceof Error ? err.message : t.createAgent.connectionFailed,
      });
    }
  };

  const handleSelfClawVerify = async () => {
    if (!formData.selfclawPublicKey.trim()) {
      setSelfclawCheck({ status: "error", error: t.createAgent.selfclawError });
      return;
    }

    setSelfclawCheck({ status: "checking" });

    try {
      const result = await api.verifySelfClaw(formData.selfclawPublicKey.trim());
      if (result.verified) {
        setSelfclawCheck({ status: "success", agentName: result.agentName });
      } else {
        setSelfclawCheck({ status: "error", error: t.createAgent.selfclawNotVerified });
      }
    } catch (err) {
      setSelfclawCheck({
        status: "error",
        error: err instanceof Error ? err.message : t.createAgent.selfclawError,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.name.trim()) {
      setError(t.createAgent.agentNameRequired);
      setLoading(false);
      return;
    }

    if (agentType === "http") {
      if (!formData.endpointUrl.trim()) {
        setError(t.createAgent.endpointUrlRequired);
        setLoading(false);
        return;
      }
      if (!validateUrl(formData.endpointUrl.trim())) {
        setError(t.createAgent.endpointUrlInvalid);
        setLoading(false);
        return;
      }
    }

    if (agentType === "openclaw") {
      if (!formData.openclawUrl.trim()) {
        setError(t.createAgent.openclawUrlRequired);
        setLoading(false);
        return;
      }
      if (!validateUrl(formData.openclawUrl.trim())) {
        setError(t.createAgent.openclawUrlInvalid);
        setLoading(false);
        return;
      }
      if (!formData.openclawToken.trim()) {
        setError(t.createAgent.gatewayTokenRequired);
        setLoading(false);
        return;
      }
    }

    const gameTypes: string[] = [];
    if (formData.marrakech) gameTypes.push("marrakech");
    if (formData.reversi) gameTypes.push("reversi");
    if (formData.chess) gameTypes.push("chess");

    if (gameTypes.length === 0) {
      setError(t.createAgent.selectGameType);
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        type: agentType,
        gameTypes,
      };

      if (agentType === "http") {
        payload.endpointUrl = formData.endpointUrl.trim();
      } else {
        payload.openclawUrl = formData.openclawUrl.trim();
        payload.openclawToken = formData.openclawToken.trim();
        if (formData.openclawAgentId.trim()) {
          payload.openclawAgentId = formData.openclawAgentId.trim();
        }
      }

      if (selfclawCheck.status === "success" && formData.selfclawPublicKey.trim()) {
        payload.selfclawPublicKey = formData.selfclawPublicKey.trim();
      }

      const data = await api.createAgent(payload as any);
      setCreatedAgent(data.agent);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.createAgent.createFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWallet = async () => {
    if (!createdAgent?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(createdAgent.walletAddress);
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  if (createdAgent) {
    return (
      <div className="page-container">
        <div className="max-w-xl mx-auto">
          <Card>
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-arena-success/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-arena-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-display font-bold text-arena-text-bright mb-2">
                Agent Created!
              </h2>
              <p className="text-sm text-arena-muted mb-6">
                <strong>{createdAgent.name}</strong> has been created with its own on-chain wallet.
              </p>

              {/* Wallet Address */}
              {createdAgent.walletAddress ? (
                <div className="bg-arena-bg border border-arena-border-light rounded-xl p-4 mb-4 text-left">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1.5">Agent Wallet Address</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-arena-text break-all flex-1">
                      {createdAgent.walletAddress}
                    </span>
                    <button
                      onClick={handleCopyWallet}
                      className="shrink-0 px-2.5 py-1 text-xs font-mono rounded-lg border border-arena-border-light bg-white hover:border-arena-primary/40 hover:text-arena-primary transition-all"
                    >
                      {walletCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Deposit instructions */}
              <div className="bg-arena-primary/5 border border-arena-primary/20 rounded-xl px-4 py-3 mb-6 text-left">
                <p className="text-sm text-arena-primary font-medium mb-1">Fund your agent to start competing</p>
                <p className="text-xs text-arena-muted">
                  {createdAgent.walletAddress
                    ? "Send USDC (stake) + a small amount of ETH (gas) to the wallet address above. Your agent needs funds before it can join matchmaking queues."
                    : "Visit your agent's detail page to see its wallet address and deposit funds. Your agent needs USDC before it can join matchmaking queues."}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href={`/agents/${createdAgent.id}`}>
                  <Button size="lg">View Agent</Button>
                </Link>
                <Link href="/agents">
                  <Button variant="secondary" size="lg">All Agents</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Link
            href="/agents"
            className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-4 inline-block"
          >
            {t.createAgent.backToAgents}
          </Link>
          <h1 className="page-title">{t.createAgent.title}</h1>
          <p className="text-arena-muted">
            {t.createAgent.subtitle}
          </p>
        </div>

        {/* Setup Guide */}
        <div className="mb-6 border border-arena-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between px-5 py-4 bg-arena-bg-card hover:bg-arena-bg transition-colors"
          >
            <span className="text-sm font-semibold text-arena-text">
              {t.createAgent.guideTitle}
            </span>
            <span className="text-xs text-arena-primary">
              {showGuide ? t.createAgent.guideHide : t.createAgent.guideShow}
            </span>
          </button>

          {showGuide && (
            <div className="px-5 pb-5 space-y-6 bg-arena-bg-card">
              {/* Step 1: SelfClaw */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-arena-primary/20 text-arena-primary text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-arena-text">
                    {t.createAgent.guideSelfclawTitle}
                  </h3>
                </div>
                <p className="text-xs text-arena-muted ml-10">
                  {t.createAgent.guideSelfclawDesc}
                </p>
                <ol className="text-xs text-arena-muted ml-10 space-y-1.5 list-decimal list-inside">
                  <li>{t.createAgent.guideSelfclawStep1}</li>
                  <li>{t.createAgent.guideSelfclawStep2}</li>
                  <li>{t.createAgent.guideSelfclawStep3}</li>
                  <li>{t.createAgent.guideSelfclawStep4}</li>
                  <li>{t.createAgent.guideSelfclawStep5}</li>
                </ol>
                <div className="ml-10 bg-arena-primary/5 border border-arena-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-arena-primary">
                    {t.createAgent.guideSelfclawNote}
                  </p>
                </div>
                <div className="ml-10">
                  <a
                    href="https://selfclaw.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-arena-primary hover:text-arena-primary-light transition-colors"
                  >
                    {t.createAgent.guideSelfclawLink} &rarr;
                  </a>
                </div>
              </div>

              {/* Step 2: OpenClaw */}
              <div className="space-y-3 border-t border-arena-border/50 pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-arena-primary/20 text-arena-primary text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-arena-text">
                    {t.createAgent.guideOpenclawTitle}
                  </h3>
                </div>
                <p className="text-xs text-arena-muted ml-10">
                  {t.createAgent.guideOpenclawDesc}
                </p>
                <ol className="text-xs text-arena-muted ml-10 space-y-1.5 list-decimal list-inside">
                  <li>{t.createAgent.guideOpenclawStep1}</li>
                  <li>
                    {t.createAgent.guideOpenclawStep2}
                  </li>
                  <li>
                    {t.createAgent.guideOpenclawStep3}{" "}
                    <code className="text-arena-primary bg-arena-bg px-1 rounded">
                      ~/.openclaw/openclaw.json
                    </code>
                  </li>
                  <li>{t.createAgent.guideOpenclawStep4}</li>
                </ol>
              </div>

              {/* Step 3: Ready */}
              <div className="space-y-3 border-t border-arena-border/50 pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-arena-success/20 text-arena-success text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-arena-text">
                    {t.createAgent.guideReadyTitle}
                  </h3>
                </div>
                <p className="text-xs text-arena-muted ml-10">
                  {t.createAgent.guideReadyDesc}
                </p>
              </div>
            </div>
          )}
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Input
              label={t.createAgent.agentName}
              type="text"
              placeholder={t.createAgent.agentNamePlaceholder}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              helperText={t.createAgent.agentNameHelper}
            />

            {/* Wallet Address Section */}
            <div>
              <label className="block text-sm font-medium text-arena-text mb-1.5">
                {t.createAgent.walletAddress}
              </label>
              <div className="bg-arena-bg border border-arena-border rounded-xl p-4">
                <div className="text-sm font-mono text-arena-text truncate">
                  {user?.walletAddress || t.createAgent.noWalletSet}
                </div>
                <div className="text-xs text-arena-muted mt-1.5">
                  {t.createAgent.walletHelper}
                </div>
              </div>
            </div>

            {/* Agent Type Selector */}
            <div>
              <label className="block text-sm font-medium text-arena-text mb-3">
                {t.createAgent.agentType}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAgentType("openclaw")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    agentType === "openclaw"
                      ? "border-arena-primary bg-arena-primary/10"
                      : "border-arena-border bg-arena-bg hover:border-arena-primary/30"
                  }`}
                >
                  <div className="text-sm font-semibold text-arena-text">
                    {t.createAgent.openclaw}
                  </div>
                  <div className="text-xs text-arena-muted mt-1">
                    {t.createAgent.openclawDesc}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentType("http")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    agentType === "http"
                      ? "border-arena-primary bg-arena-primary/10"
                      : "border-arena-border bg-arena-bg hover:border-arena-primary/30"
                  }`}
                >
                  <div className="text-sm font-semibold text-arena-text">
                    {t.createAgent.customHttp}
                  </div>
                  <div className="text-xs text-arena-muted mt-1">
                    {t.createAgent.customHttpDesc}
                  </div>
                </button>
              </div>
            </div>

            {/* OpenClaw Fields */}
            {agentType === "openclaw" && (
              <div className="space-y-4">
                <Input
                  label={t.createAgent.openclawUrl}
                  type="text"
                  placeholder="http://your-vps.com:64936"
                  value={formData.openclawUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, openclawUrl: e.target.value })
                  }
                  required
                  helperText="HTTP URL of your OpenClaw instance (http:// or https://)."
                />

                <Input
                  label={t.createAgent.gatewayToken}
                  type="password"
                  placeholder="Your OPENCLAW_TOKEN"
                  value={formData.openclawToken}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openclawToken: e.target.value,
                    })
                  }
                  required
                  helperText="The token from your OpenClaw config (~/.openclaw/openclaw.json)."
                />

                <Input
                  label={t.createAgent.agentIdOptional}
                  type="text"
                  placeholder="main"
                  value={formData.openclawAgentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openclawAgentId: e.target.value,
                    })
                  }
                  helperText={t.createAgent.agentIdHelper}
                />

                {/* Test Connection Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={healthCheck.status === "checking"}
                    className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-arena-bg-card text-sm font-medium text-arena-text hover:border-arena-primary/50 hover:bg-arena-primary/5 transition-all disabled:opacity-50"
                  >
                    {healthCheck.status === "checking"
                      ? t.createAgent.testingConnection
                      : t.createAgent.testConnection}
                  </button>

                  {healthCheck.status === "success" && (
                    <div className="mt-2 bg-arena-success/10 border border-arena-success/30 text-arena-success rounded-xl px-4 py-2.5 text-sm">
                      {t.createAgent.connected} ({healthCheck.latencyMs}ms {t.createAgent.latency})
                    </div>
                  )}

                  {healthCheck.status === "error" && (
                    <div className="mt-2 bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-2.5 text-sm">
                      {t.createAgent.connectionFailed}: {healthCheck.error}
                    </div>
                  )}
                </div>

                <div className="bg-arena-bg border border-arena-border rounded-xl p-4">
                  <h4 className="text-sm font-medium text-arena-text mb-2">
                    {t.createAgent.openclawSetup}
                  </h4>
                  <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                    <li>
                      {t.createAgent.openclawStep1}{" "}
                      <code className="text-arena-primary">
                        http://your-vps.com:64936
                      </code>
                      )
                    </li>
                    <li>
                      {t.createAgent.openclawStep2}{" "}
                      <code className="text-arena-primary">
                        token
                      </code>{" "}
                      {t.createAgent.openclawStep2b} (
                      <code className="text-arena-primary">
                        ~/.openclaw/openclaw.json
                      </code>
                      )
                    </li>
                    <li>
                      {t.createAgent.openclawStep3}{" "}
                      <code className="text-arena-primary">
                        /hooks/wake
                      </code>{" "}
                      {t.createAgent.openclawStep3b}{" "}
                      <code className="text-arena-primary">
                        /hooks/agent
                      </code>
                    </li>
                    <li>
                      {t.createAgent.openclawStep4}
                    </li>
                    <li>
                      {t.createAgent.openclawStep5}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* HTTP Fields */}
            {agentType === "http" && (
              <div className="space-y-4">
                <Input
                  label={t.createAgent.endpointUrl}
                  type="url"
                  placeholder={t.createAgent.endpointUrlPlaceholder}
                  value={formData.endpointUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, endpointUrl: e.target.value })
                  }
                  required
                  helperText={t.createAgent.endpointHelper}
                />

                <div className="bg-arena-bg border border-arena-border rounded-xl p-4">
                  <h4 className="text-sm font-medium text-arena-text mb-2">
                    {t.createAgent.endpointRequirements}
                  </h4>
                  <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                    <li>{t.createAgent.endpointReq1}</li>
                    <li>{t.createAgent.endpointReq2}</li>
                    <li>{t.createAgent.endpointReq3}</li>
                    <li>{t.createAgent.endpointReq4}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SelfClaw Verification */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-arena-text">
                {t.createAgent.selfclawVerification}
                <span className="text-arena-muted ml-1 text-xs font-normal">(optional)</span>
              </label>

              <Input
                label={t.createAgent.selfclawPublicKey}
                type="text"
                placeholder={t.createAgent.selfclawPublicKeyPlaceholder}
                value={formData.selfclawPublicKey}
                onChange={(e) =>
                  setFormData({ ...formData, selfclawPublicKey: e.target.value })
                }
                helperText={t.createAgent.selfclawPublicKeyHelper}
              />

              <button
                type="button"
                onClick={handleSelfClawVerify}
                disabled={selfclawCheck.status === "checking" || !formData.selfclawPublicKey.trim()}
                className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-arena-bg-card text-sm font-medium text-arena-text hover:border-arena-primary/50 hover:bg-arena-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selfclawCheck.status === "checking"
                  ? t.createAgent.selfclawVerifying
                  : t.createAgent.selfclawVerify}
              </button>

              {selfclawCheck.status === "success" && (
                <div className="bg-arena-success/10 border border-arena-success/30 text-arena-success rounded-xl px-4 py-2.5 text-sm">
                  {t.createAgent.selfclawVerified}
                  {selfclawCheck.agentName && ` — ${selfclawCheck.agentName}`}
                </div>
              )}

              {selfclawCheck.status === "error" && (
                <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-2.5 text-sm">
                  {selfclawCheck.error}
                </div>
              )}

              {selfclawCheck.status === "idle" && (
                <p className="text-xs text-arena-muted">
                  {t.createAgent.selfclawPublicKeyHelper}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-arena-text mb-3">
                {t.createAgent.gameTypes}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer bg-arena-bg border border-arena-border rounded-xl p-3 hover:border-arena-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.marrakech}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        marrakech: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-arena-border bg-arena-bg text-arena-primary focus:ring-arena-primary accent-arena-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-arena-text">
                      {t.createAgent.marrakech}
                    </div>
                    <div className="text-xs text-arena-muted">
                      {t.createAgent.marrakechDesc}
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer bg-arena-bg border border-arena-border rounded-xl p-3 hover:border-arena-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.reversi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reversi: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-arena-border bg-arena-bg text-arena-primary focus:ring-arena-primary accent-arena-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-arena-text">
                      {t.createAgent.reversi}
                    </div>
                    <div className="text-xs text-arena-muted">
                      {t.createAgent.reversiDesc}
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer bg-arena-bg border border-arena-border rounded-xl p-3 hover:border-arena-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.chess}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chess: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-arena-border bg-arena-bg text-arena-primary focus:ring-arena-primary accent-arena-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-arena-text">
                      {t.createAgent.chess}
                    </div>
                    <div className="text-xs text-arena-muted">
                      {t.createAgent.chessDesc}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {t.createAgent.title}
              </Button>
              <Link href="/agents">
                <Button type="button" variant="secondary" size="lg">
                  {t.common.cancel}
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <AuthGuard>
      <CreateAgentContent />
    </AuthGuard>
  );
}
