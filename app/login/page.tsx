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
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";
import { useLanguage } from "@/lib/i18n";

type LoginMode = "email" | "wallet";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const { t } = useLanguage();
  const { publicKey, signMessage, connected: walletConnected } = useWallet();

  const [mode, setMode] = useState<LoginMode>("email");
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError(t.login.fillAllFields);
      setLoading(false);
      return;
    }

    try {
      const data = await api.login({
        username: formData.username.trim(),
        password: formData.password,
      });
      login(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setError("");
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    try {
      // 1. Get nonce from backend
      const { nonce, message } = await api.getWalletLoginNonce(publicKey.toBase58());

      // 2. Sign the nonce message
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.default.encode(signatureBytes);

      // 3. Login with nonce + signature
      const data = await api.loginWithWallet(publicKey.toBase58(), signature, nonce);
      login(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.login.title} subtitle={t.login.subtitle}>
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
          Email
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
          Wallet
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
              Sign in with your Solana wallet.
            </p>
          </div>

          {!walletConnected ? (
            <div className="flex justify-center"><WalletMultiButton className="!bg-violet-600 hover:!bg-violet-700 !rounded-xl !text-sm !font-mono !h-12" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-violet-400 uppercase tracking-widest font-mono">Connected</div>
                  <span className="text-xs font-mono text-violet-700 break-all">{publicKey?.toBase58()}</span>
                </div>
              </div>

              <button
                onClick={handleWalletLogin}
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-xl font-display font-bold text-base text-white bg-gradient-to-r from-violet-600 to-violet-500 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing...
                  </span>
                ) : (
                  "Sign & Log In"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Email mode ── */}
      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div className="opacity-0 animate-fade-up auth-stagger-2">
            <div className="auth-input-focus">
              <Input
                label={t.login.username}
                type="text"
                placeholder={t.login.usernamePlaceholder}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-3">
            <div className="auth-input-focus">
              <Input
                label={t.login.password}
                type="password"
                placeholder={t.login.passwordPlaceholder}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-4 flex justify-end">
            <Link href="/forgot-password" className="text-xs text-arena-muted hover:text-arena-primary transition-colors">
              {t.login.forgotPassword}
            </Link>
          </div>

          <div className="opacity-0 animate-fade-up auth-stagger-4 pt-1">
            <Button type="submit" isLoading={loading} className="w-full" size="lg">
              {t.login.signIn}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-5">
        <p className="text-sm text-arena-muted">
          {t.login.noAccount}{" "}
          <Link href="/register" className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium">
            {t.login.createOne}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
