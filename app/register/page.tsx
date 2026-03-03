"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    if (!formData.username.trim() || !formData.password || !formData.email.trim()) {
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
      const payload = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim(),
      };

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

  /* Password strength indicator */
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

  return (
    <AuthLayout title={t.register.title} subtitle={t.register.subtitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="opacity-0 animate-fade-up auth-stagger-1">
          <div className="auth-input-focus">
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
          </div>
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-2">
          <div className="auth-input-focus">
            <Input
              label={t.register.email}
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="new-password"
            />
          </div>
          {/* Password strength bar */}
          {formData.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.level
                        ? strengthColors[strength.level]
                        : "bg-arena-border-light"
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
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              autoComplete="new-password"
            />
          </div>
          {/* Password match indicator */}
          {formData.confirmPassword && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                formData.password === formData.confirmPassword
                  ? "bg-arena-success"
                  : "bg-arena-danger"
              }`} />
              <span className={`text-xs ${
                formData.password === formData.confirmPassword
                  ? "text-arena-success"
                  : "text-arena-danger"
              }`}>
                {formData.password === formData.confirmPassword
                  ? "Passwords match"
                  : "Passwords don\u2019t match"}
              </span>
            </div>
          )}
        </div>

        <div className="opacity-0 animate-fade-up auth-stagger-5 pt-1">
          <Button
            type="submit"
            isLoading={loading}
            className="w-full"
            size="lg"
          >
            {t.register.createAccount}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center opacity-0 animate-fade-in auth-stagger-6">
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
    </AuthLayout>
  );
}
