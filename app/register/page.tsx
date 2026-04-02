"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton as _WalletMultiButton } from "@solana/wallet-adapter-react-ui";
const WalletMultiButton = _WalletMultiButton as any;
import * as bs58 from "bs58";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";

type RegisterMode = "email" | "wallet";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const { t } = useLanguage();
  const { publicKey, signMessage, connected: walletConnected } = useWallet();

  const [mode, setMode] = useState<RegisterMode>("email");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  /* ── Email registration helpers ── */
  const validateForm = (): boolean => {
    if (!formData.username.trim() || !formData.password || !formData.email.trim()) {
      setError(t.register.fillRequired);
      return false;
    }
    if (formData.username.trim().length < 3) {
      setError(t.register.usernameMin);
      return false;
    }
    if (formData.password.length < 6) {
      setError(t.register.passwordMin);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t.register.passwordMismatch);
      return false;
    }
    return true;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    setSendingCode(true);
    try {
      await api.sendVerificationCode(formData.email.trim());
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.register.registerFailed);
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSendingCode(true);
    try {
      await api.sendVerificationCode(formData.email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.register.registerFailed);
    } finally {
      setSendingCode(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.verificationCode.trim()) {
      setError(t.register.codeRequired);
      return;
    }

    setLoading(true);
    try {
      const data = await api.register({
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim(),
        verificationCode: formData.verificationCode.trim(),
      });
      login(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.register.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  /* ── Wallet registration ── */
  const handleWalletRegister = async () => {
    setError("");
    if (!publicKey || !signMessage) {
      setError(t.register.walletNotConnected);
      return;
    }

    setLoading(true);
    try {
      // 1. Get nonce from backend
      const { nonce, message } = await api.getWalletRegisterNonce(publicKey.toBase58());

      // 2. Sign the nonce message
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.default.encode(signatureBytes);

      // 3. Register with nonce + signature
      const data = await api.registerWithWallet(publicKey.toBase58(), signature, nonce);
      login(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.register.walletRegisterFailed);
    } finally {
      setLoading(false);
    }
  };

  /* ── Password strength ── */
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { level: 0, label: "" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) return { level: 1, label: "Weak" };
    if (score <= 2) return { level: 2, label: "Fair" };
    if (score <= 3) return { level: 3, label: "Good" };
    return { level: 4, label: "Strong" };
  };

  const strength = getPasswordStrength();
  const strengthColors = ["", "bg-arena-danger", "bg-arena-accent", "bg-arena-primary-light", "bg-arena-success"];

  /* ── Email verify step ── */
  if (mode === "email" && step === "verify") {
    return (
      <AuthLayout title={t.register.title} subtitle={t.register.subtitle}>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && <div className="auth-error">{error}</div>}

          <div className="opacity-0 animate-fade-up auth-stagger-1">
            <p className="text-sm text-arena-muted mb-1">
              {t.register.codeSent}{" "}
              <span className="text-arena-text font-medium">{formData.email}</span>
            </p>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-2">
            <div className="auth-input-focus">
              <Input
                label={t.register.verificationCode}
                type="text"
                placeholder={t.register.codePlaceholder}
                value={formData.verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setFormData({ ...formData, verificationCode: val });
                }}
                required
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-3 pt-1">
            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              {t.register.createAccount}
            </Button>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendingCode}
              className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium disabled:opacity-50"
            >
              {sendingCode ? t.register.sendingCode : t.register.resendCode}
            </button>
            <button
              type="button"
              onClick={() => { setStep("form"); setFormData({ ...formData, verificationCode: "" }); setError(""); }}
              className="text-arena-muted hover:text-arena-text transition-colors"
            >
              {t.register.changeEmail}
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  /* ── Main register page ── */
  return (
    <AuthLayout title={t.register.title} subtitle={t.register.subtitle}>
      {/* Mode tabs */}
      <div className="flex rounded-xl bg-arena-bg border border-arena-border-light p-1 mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        <button
          type="button"
          onClick={() => { setMode("email"); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mode === "email"
              ? "bg-white text-arena-text-bright shadow-sm"
              : "text-arena-muted hover:text-arena-text"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          {t.register.emailTab}
        </button>
        <button
          type="button"
          onClick={() => { setMode("wallet"); setError(""); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mode === "wallet"
              ? "bg-white text-arena-text-bright shadow-sm"
              : "text-arena-muted hover:text-arena-text"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
          {t.register.walletTab}
        </button>
      </div>

      {error && <div className="auth-error mb-4">{error}</div>}

      {/* ── Wallet mode ── */}
      {mode === "wallet" && (
        <div className="space-y-5 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 flex items-center justify-center ring-1 ring-inset ring-violet-500/10">
              <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-sm text-arena-muted">
              {t.register.walletDesc}
            </p>
          </div>

          {!walletConnected ? (
            <div className="flex justify-center"><WalletMultiButton className="!bg-violet-600 hover:!bg-violet-700 !rounded-xl !text-sm !font-mono !h-12" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-violet-400 uppercase tracking-widest font-mono">{t.register.walletConnected}</div>
                  <span className="text-xs font-mono text-violet-700 break-all">{publicKey?.toBase58()}</span>
                </div>
              </div>

              <button
                onClick={handleWalletRegister}
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-xl font-display font-bold text-base text-white bg-gradient-to-r from-violet-600 to-violet-500 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    {t.register.walletSigning}
                  </span>
                ) : (
                  t.register.walletSignUp
                )}
              </button>

              <p className="text-[10px] text-center text-arena-muted">
                {t.register.walletRandomUsername}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Email mode ── */}
      {mode === "email" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="opacity-0 animate-fade-up auth-stagger-1">
            <div className="auth-input-focus">
              <Input
                label={t.register.username}
                type="text"
                placeholder={t.register.usernamePlaceholder}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-2">
            <div className="auth-input-focus">
              <Input
                label={t.register.email}
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-3">
            <div className="auth-input-focus">
              <Input
                label={t.register.password}
                type="password"
                placeholder={t.register.passwordPlaceholder}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            {formData.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.level ? strengthColors[strength.level] : "bg-arena-border-light"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-mono ${
                  strength.level <= 1 ? "text-arena-danger" :
                  strength.level === 2 ? "text-arena-accent" :
                  strength.level === 3 ? "text-arena-primary-light" :
                  "text-arena-success"
                }`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-4">
            <div className="auth-input-focus">
              <Input
                label={t.register.confirmPassword}
                type="password"
                placeholder={t.register.confirmPlaceholder}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            {formData.confirmPassword && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  formData.password === formData.confirmPassword ? "bg-arena-success" : "bg-arena-danger"
                }`} />
                <span className={`text-xs ${
                  formData.password === formData.confirmPassword ? "text-arena-success" : "text-arena-danger"
                }`}>
                  {formData.password === formData.confirmPassword ? "Passwords match" : "Passwords don\u2019t match"}
                </span>
              </div>
            )}
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-5 pt-1">
            <Button type="submit" isLoading={sendingCode} className="w-full" size="lg">
              {sendingCode ? t.register.sendingCode : t.register.sendCode}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-6">
        <p className="text-sm text-arena-muted">
          {t.register.hasAccount}{" "}
          <Link href="/login" className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium">
            {t.register.signIn}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
