"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";
import { useLanguage } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t.forgotPassword.emailRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t.forgotPassword.emailInvalid);
      return;
    }

    setLoading(true);

    try {
      await api.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title={t.forgotPassword.successTitle} subtitle="">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-arena-muted text-sm leading-relaxed">
            {t.forgotPassword.successMessage}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium text-sm"
            >
              {t.forgotPassword.backToLogin}
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.forgotPassword.title} subtitle={t.forgotPassword.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="opacity-0 animate-fade-up auth-stagger-2">
          <div className="auth-input-focus">
            <Input
              label={t.forgotPassword.email}
              type="email"
              placeholder={t.forgotPassword.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-3 pt-1">
          <Button
            type="submit"
            isLoading={loading}
            className="w-full"
            size="lg"
          >
            {loading ? t.forgotPassword.sending : t.forgotPassword.submit}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-4">
        <p className="text-sm text-arena-muted">
          {t.forgotPassword.rememberPassword}{" "}
          <Link
            href="/login"
            className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium"
          >
            {t.forgotPassword.signIn}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
