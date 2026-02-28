"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      login(data.token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.login.title} subtitle={t.login.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="opacity-0 animate-fade-up auth-stagger-2">
          <div className="auth-input-focus">
            <Input
              label={t.login.username}
              type="text"
              placeholder={t.login.usernamePlaceholder}
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-4 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-arena-muted hover:text-arena-primary transition-colors"
          >
            {t.login.forgotPassword}
          </Link>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-4 pt-1">
          <Button
            type="submit"
            isLoading={loading}
            className="w-full"
            size="lg"
          >
            {t.login.signIn}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-5">
        <p className="text-sm text-arena-muted">
          {t.login.noAccount}{" "}
          <Link
            href="/register"
            className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium"
          >
            {t.login.createOne}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
