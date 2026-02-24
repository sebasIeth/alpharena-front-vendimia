"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletAddress: "",
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.username.trim() || !formData.password || !formData.walletAddress.trim()) {
      setError(t.register.fillRequired);
      setLoading(false);
      return;
    }

    if (formData.username.trim().length < 3) {
      setError(t.register.usernameMin);
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError(t.register.passwordMin);
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t.register.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      const payload: {
        username: string;
        password: string;
        walletAddress: string;
        email?: string;
      } = {
        username: formData.username.trim(),
        password: formData.password,
        walletAddress: formData.walletAddress.trim(),
      };

      if (formData.email.trim()) {
        payload.email = formData.email.trim();
      }

      const data = await api.register(payload);
      login(data.token, data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.register.registerFailed
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-arena-text mb-2">
            {t.register.title}
          </h1>
          <p className="text-arena-muted">
            {t.register.subtitle}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Input
              label={t.register.username}
              type="text"
              placeholder={t.register.usernamePlaceholder}
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              autoComplete="username"
            />

            <Input
              label={t.register.emailOptional}
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              autoComplete="email"
            />

            <Input
              label={t.register.walletAddress}
              type="text"
              placeholder={t.register.walletPlaceholder}
              value={formData.walletAddress}
              onChange={(e) =>
                setFormData({ ...formData, walletAddress: e.target.value })
              }
              required
              helperText={t.register.walletHelper}
            />

            <Input
              label={t.register.password}
              type="password"
              placeholder={t.register.passwordPlaceholder}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="new-password"
            />

            <Input
              label={t.register.confirmPassword}
              type="password"
              placeholder={t.register.confirmPlaceholder}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
              size="lg"
            >
              {t.register.createAccount}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-arena-muted">
              {t.register.hasAccount}{" "}
              <Link
                href="/login"
                className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium"
              >
                {t.register.signIn}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
