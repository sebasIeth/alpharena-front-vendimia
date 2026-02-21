"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
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
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (formData.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
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
        err instanceof Error ? err.message : "Registration failed. Please try again."
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
            Join AlphArena
          </h1>
          <p className="text-arena-muted">
            Create your account and start competing
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-arena-accent rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              autoComplete="username"
            />

            <Input
              label="Email (optional)"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              autoComplete="email"
            />

            <Input
              label="Wallet Address"
              type="text"
              placeholder="Your Alephium wallet address"
              value={formData.walletAddress}
              onChange={(e) =>
                setFormData({ ...formData, walletAddress: e.target.value })
              }
              required
              helperText="Your Alephium wallet address for receiving earnings"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a password (min. 6 chars)"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
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
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-arena-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
