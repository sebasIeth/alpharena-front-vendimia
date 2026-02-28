"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";
import { useLanguage } from "@/lib/i18n";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  if (!token) {
    return (
      <AuthLayout title={t.resetPassword.title} subtitle="">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-arena-muted text-sm">{t.resetPassword.tokenMissing}</p>
          <Link
            href="/forgot-password"
            className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium text-sm"
          >
            {t.resetPassword.requestNew}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title={t.resetPassword.successTitle} subtitle="">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-arena-muted text-sm leading-relaxed">
            {t.resetPassword.successMessage}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2 rounded-lg bg-arena-primary text-white font-medium hover:bg-arena-primary-light transition-colors"
            >
              {t.resetPassword.goToLogin}
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t.resetPassword.passwordMin);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.resetPassword.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setError(t.resetPassword.invalidToken);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.resetPassword.title} subtitle={t.resetPassword.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="opacity-0 animate-fade-up auth-stagger-2">
          <div className="auth-input-focus">
            <Input
              label={t.resetPassword.password}
              type="password"
              placeholder={t.resetPassword.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-3">
          <div className="auth-input-focus">
            <Input
              label={t.resetPassword.confirmPassword}
              type="password"
              placeholder={t.resetPassword.confirmPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-4 pt-1">
          <Button
            type="submit"
            isLoading={loading}
            className="w-full"
            size="lg"
          >
            {loading ? t.resetPassword.resetting : t.resetPassword.submit}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-5">
        <Link
          href="/forgot-password"
          className="text-sm text-arena-muted hover:text-arena-primary transition-colors"
        >
          {t.resetPassword.requestNew}
        </Link>
      </div>
    </AuthLayout>
  );
}
