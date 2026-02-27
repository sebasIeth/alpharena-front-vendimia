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

/* ── Step indicator ── */
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: string[];
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-arena-primary text-white"
                    : isCurrent
                    ? "border-2 border-arena-primary text-arena-primary bg-arena-primary/5"
                    : "border-2 border-arena-border-light text-arena-muted"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide hidden sm:block ${
                  isCurrent ? "text-arena-primary" : isCompleted ? "text-arena-text" : "text-arena-muted"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-18px] sm:mt-[-10px] rounded-full transition-all duration-300 ${
                stepNum < currentStep ? "bg-arena-primary" : "bg-arena-border-light"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CreateAgentContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuthStore();

  // Wizard step
  const [step, setStep] = useState(1);

  // Form data
  const [agentType, setAgentType] = useState<AgentType>("openclaw");
  const [formData, setFormData] = useState({
    name: "",
    endpointUrl: "",
    openclawUrl: "",
    openclawToken: "",
    openclawAgentId: "",
    selfclawPublicKey: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);

  // Health check
  const [healthCheck, setHealthCheck] = useState<{
    status: "idle" | "checking" | "success" | "error";
    latencyMs?: number;
    error?: string;
  }>({ status: "idle" });

  // SelfClaw check
  const [selfclawCheck, setSelfclawCheck] = useState<{
    status: "idle" | "checking" | "success" | "error";
    agentName?: string;
    error?: string;
  }>({ status: "idle" });

  const validateUrl = (url: string): boolean => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleTestConnection = async () => {
    if (!formData.openclawUrl.trim() || !formData.openclawToken.trim()) {
      setHealthCheck({ status: "error", error: t.createAgent.testUrlTokenRequired });
      return;
    }
    if (!validateUrl(formData.openclawUrl.trim())) {
      setHealthCheck({ status: "error", error: t.createAgent.invalidUrlFormat });
      return;
    }
    setHealthCheck({ status: "checking" });
    try {
      const result = await api.testOpenClawWebhook(formData.openclawUrl.trim(), formData.openclawToken.trim());
      if (result.ok) {
        setHealthCheck({ status: "success", latencyMs: result.latencyMs });
      } else {
        setHealthCheck({ status: "error", latencyMs: result.latencyMs, error: result.error || t.createAgent.connectionFailed });
      }
    } catch (err) {
      setHealthCheck({ status: "error", error: err instanceof Error ? err.message : t.createAgent.connectionFailed });
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
      setSelfclawCheck({ status: "error", error: err instanceof Error ? err.message : t.createAgent.selfclawError });
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (!formData.name.trim()) { setError(t.createAgent.agentNameRequired); setLoading(false); return; }

    if (agentType === "http") {
      if (!formData.endpointUrl.trim()) { setError(t.createAgent.endpointUrlRequired); setLoading(false); return; }
      if (!validateUrl(formData.endpointUrl.trim())) { setError(t.createAgent.endpointUrlInvalid); setLoading(false); return; }
    }

    if (agentType === "openclaw") {
      if (!formData.openclawUrl.trim()) { setError(t.createAgent.openclawUrlRequired); setLoading(false); return; }
      if (!validateUrl(formData.openclawUrl.trim())) { setError(t.createAgent.openclawUrlInvalid); setLoading(false); return; }
      if (!formData.openclawToken.trim()) { setError(t.createAgent.gatewayTokenRequired); setLoading(false); return; }
    }

    if (selfclawCheck.status !== "success") {
      setError(t.createAgent.selfclawRequired);
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        type: agentType,
        gameTypes: ["marrakech"],
        selfclawPublicKey: formData.selfclawPublicKey.trim(),
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
      const data = await api.createAgent(payload as any);
      setCreatedAgent(data.agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createAgent.createFailed);
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
    } catch { /* fallback ignored */ }
  };

  // Can advance from step 1?
  const canAdvanceStep1 = formData.name.trim().length > 0 && selfclawCheck.status === "success";

  // Can advance from step 2?
  const canAdvanceStep2 = agentType === "openclaw"
    ? formData.openclawUrl.trim().length > 0 && formData.openclawToken.trim().length > 0
    : formData.endpointUrl.trim().length > 0;

  const stepLabels = [
    t.createAgent.guideSelfclawTitle.replace("Step 1: ", "").replace("Paso 1: ", ""),
    t.createAgent.guideOpenclawTitle.replace("Step 2: ", "").replace("Paso 2: ", ""),
    t.createAgent.guideReadyTitle.replace("Step 3: ", "").replace("Paso 3: ", ""),
  ];

  /* ── Success Screen ── */
  if (createdAgent) {
    return (
      <div className="page-container">
        <div className="max-w-xl mx-auto">
          <div className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm p-8 opacity-0 animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-arena-success/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-arena-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-arena-text-bright mb-2">
                Agent Created!
              </h2>
              <p className="text-sm text-arena-muted mb-6">
                <strong>{createdAgent.name}</strong> has been created with its own on-chain wallet.
              </p>

              {createdAgent.walletAddress && (
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
              )}

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
          </div>
        </div>
      </div>
    );
  }

  /* ── Wizard Form ── */
  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/agents"
            className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-4 inline-block"
          >
            {t.createAgent.backToAgents}
          </Link>
          <h1 className="page-title">{t.createAgent.title}</h1>
          <p className="text-arena-muted text-sm">{t.createAgent.subtitle}</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} steps={stepLabels} />

        {/* Form Card */}
        <div className="bg-white border border-arena-border-light rounded-2xl shadow-arena-sm overflow-hidden">
          {error && (
            <div className="mx-6 mt-6 bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm animate-fade-down">
              {error}
            </div>
          )}

          <div className="p-6">
            {/* ════════════════════════════════════════════════ */}
            {/* STEP 1: Identity & Verification                */}
            {/* ════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.05s" }}>
                <div>
                  <h2 className="text-lg font-display font-bold text-arena-text mb-1">
                    {t.createAgent.guideSelfclawTitle}
                  </h2>
                  <p className="text-xs text-arena-muted">
                    {t.createAgent.guideSelfclawDesc}
                  </p>
                </div>

                <Input
                  label={t.createAgent.agentName}
                  type="text"
                  placeholder={t.createAgent.agentNamePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  helperText={t.createAgent.agentNameHelper}
                />

                {/* SelfClaw Verification */}
                <div className="space-y-3">
                  <Input
                    label={t.createAgent.selfclawPublicKey}
                    type="text"
                    placeholder={t.createAgent.selfclawPublicKeyPlaceholder}
                    value={formData.selfclawPublicKey}
                    onChange={(e) => setFormData({ ...formData, selfclawPublicKey: e.target.value })}
                    helperText={t.createAgent.selfclawPublicKeyHelper}
                  />

                  <button
                    type="button"
                    onClick={handleSelfClawVerify}
                    disabled={selfclawCheck.status === "checking" || !formData.selfclawPublicKey.trim()}
                    className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-arena-bg-card text-sm font-medium text-arena-text hover:border-arena-primary/50 hover:bg-arena-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {selfclawCheck.status === "checking" && (
                      <svg className="w-4 h-4 animate-spin text-arena-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {selfclawCheck.status === "checking"
                      ? t.createAgent.selfclawVerifying
                      : t.createAgent.selfclawVerify}
                  </button>

                  {selfclawCheck.status === "success" && (
                    <div className="bg-arena-success/10 border border-arena-success/30 text-arena-success rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
                    <div className="bg-arena-primary/5 border border-arena-primary/20 rounded-xl px-4 py-3">
                      <p className="text-xs text-arena-primary">
                        {t.createAgent.guideSelfclawNote}
                      </p>
                      <a
                        href="https://selfclaw.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-arena-primary hover:text-arena-primary-light transition-colors mt-1.5"
                      >
                        {t.createAgent.guideSelfclawLink} &rarr;
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => { setError(""); setStep(2); }}
                    disabled={!canAdvanceStep1}
                    className="flex-1"
                    size="lg"
                  >
                    {t.common.next}
                  </Button>
                  <Link href="/agents">
                    <Button type="button" variant="secondary" size="lg">
                      {t.common.cancel}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════ */}
            {/* STEP 2: Connection Setup                       */}
            {/* ════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.05s" }}>
                <div>
                  <h2 className="text-lg font-display font-bold text-arena-text mb-1">
                    {t.createAgent.guideOpenclawTitle}
                  </h2>
                  <p className="text-xs text-arena-muted">
                    {t.createAgent.guideOpenclawDesc}
                  </p>
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
                          ? "border-arena-primary bg-arena-primary/[0.04] shadow-arena-sm"
                          : "border-arena-border-light bg-white hover:border-arena-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          agentType === "openclaw" ? "bg-arena-primary text-white" : "bg-arena-bg text-arena-primary"
                        }`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-arena-text">{t.createAgent.openclaw}</span>
                      </div>
                      <p className="text-xs text-arena-muted">{t.createAgent.openclawDesc}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentType("http")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        agentType === "http"
                          ? "border-arena-primary bg-arena-primary/[0.04] shadow-arena-sm"
                          : "border-arena-border-light bg-white hover:border-arena-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          agentType === "http" ? "bg-arena-primary text-white" : "bg-arena-bg text-arena-primary"
                        }`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-arena-text">{t.createAgent.customHttp}</span>
                      </div>
                      <p className="text-xs text-arena-muted">{t.createAgent.customHttpDesc}</p>
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
                      onChange={(e) => setFormData({ ...formData, openclawUrl: e.target.value })}
                      required
                      helperText="HTTP URL of your OpenClaw instance (http:// or https://)."
                    />
                    <Input
                      label={t.createAgent.gatewayToken}
                      type="password"
                      placeholder="Your OPENCLAW_TOKEN"
                      value={formData.openclawToken}
                      onChange={(e) => setFormData({ ...formData, openclawToken: e.target.value })}
                      required
                      helperText="The token from your OpenClaw config (~/.openclaw/openclaw.json)."
                    />
                    <Input
                      label={t.createAgent.agentIdOptional}
                      type="text"
                      placeholder="main"
                      value={formData.openclawAgentId}
                      onChange={(e) => setFormData({ ...formData, openclawAgentId: e.target.value })}
                      helperText={t.createAgent.agentIdHelper}
                    />

                    {/* Test Connection */}
                    <div>
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={healthCheck.status === "checking"}
                        className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-arena-bg-card text-sm font-medium text-arena-text hover:border-arena-primary/50 hover:bg-arena-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {healthCheck.status === "checking" && (
                          <svg className="w-4 h-4 animate-spin text-arena-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {healthCheck.status === "checking"
                          ? t.createAgent.testingConnection
                          : t.createAgent.testConnection}
                      </button>
                      {healthCheck.status === "success" && (
                        <div className="mt-2 bg-arena-success/10 border border-arena-success/30 text-arena-success rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.createAgent.connected} ({healthCheck.latencyMs}ms {t.createAgent.latency})
                        </div>
                      )}
                      {healthCheck.status === "error" && (
                        <div className="mt-2 bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-2.5 text-sm">
                          {t.createAgent.connectionFailed}: {healthCheck.error}
                        </div>
                      )}
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
                      onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                      required
                      helperText={t.createAgent.endpointHelper}
                    />
                    <div className="bg-arena-bg border border-arena-border-light rounded-xl p-4">
                      <h4 className="text-sm font-medium text-arena-text mb-2">{t.createAgent.endpointRequirements}</h4>
                      <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                        <li>{t.createAgent.endpointReq1}</li>
                        <li>{t.createAgent.endpointReq2}</li>
                        <li>{t.createAgent.endpointReq3}</li>
                        <li>{t.createAgent.endpointReq4}</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setError(""); setStep(1); }}
                    size="lg"
                  >
                    {t.common.back}
                  </Button>
                  <Button
                    onClick={() => { setError(""); setStep(3); }}
                    disabled={!canAdvanceStep2}
                    className="flex-1"
                    size="lg"
                  >
                    {t.common.next}
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════ */}
            {/* STEP 3: Review & Create                        */}
            {/* ════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.05s" }}>
                <div>
                  <h2 className="text-lg font-display font-bold text-arena-text mb-1">
                    {t.createAgent.guideReadyTitle}
                  </h2>
                  <p className="text-xs text-arena-muted">
                    {t.createAgent.guideReadyDesc}
                  </p>
                </div>

                {/* Summary */}
                <div className="space-y-3">
                  {/* Agent Name */}
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">{t.createAgent.agentName}</div>
                      <div className="text-sm font-semibold text-arena-text">{formData.name}</div>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-arena-primary hover:text-arena-primary-dark transition-colors">
                      {t.common.edit}
                    </button>
                  </div>

                  {/* SelfClaw */}
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">{t.createAgent.selfclawVerification}</div>
                      <div className="flex items-center gap-1.5 text-arena-success text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t.createAgent.selfclawVerified}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-arena-muted truncate">{formData.selfclawPublicKey}</div>
                  </div>

                  {/* Connection */}
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">
                        {t.createAgent.agentType}
                      </div>
                      <div className="text-sm font-semibold text-arena-text">
                        {agentType === "openclaw" ? t.createAgent.openclaw : t.createAgent.customHttp}
                      </div>
                      <div className="text-xs font-mono text-arena-muted mt-0.5 truncate max-w-sm">
                        {agentType === "openclaw" ? formData.openclawUrl : formData.endpointUrl}
                      </div>
                    </div>
                    <button type="button" onClick={() => setStep(2)} className="text-xs text-arena-primary hover:text-arena-primary-dark transition-colors shrink-0">
                      {t.common.edit}
                    </button>
                  </div>

                  {/* Game Type */}
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">{t.createAgent.gameTypes}</div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-arena-success/10 text-arena-success text-xs font-medium">
                          {t.createAgent.marrakech}
                        </span>
                        <span className="text-xs text-arena-muted">{t.createAgent.marrakechDesc}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet */}
                  <div className="bg-arena-bg/50 border border-arena-border-light rounded-xl p-4">
                    <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">{t.createAgent.walletAddress}</div>
                    <div className="text-sm font-mono text-arena-text truncate">
                      {user?.walletAddress || t.createAgent.noWalletSet}
                    </div>
                    <div className="text-xs text-arena-muted mt-1">{t.createAgent.walletHelper}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => { setError(""); setStep(2); }}
                    size="lg"
                  >
                    {t.common.back}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    isLoading={loading}
                    disabled={loading}
                    className="flex-1"
                    size="lg"
                  >
                    {t.createAgent.title}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
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
