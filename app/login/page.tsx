"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initialize } = useAuthStore();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Please fill in all fields.");
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
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-arena-text mb-2">Welcome Back</h1>
          <p className="text-arena-muted">Sign in to your AlphArena account</p>
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
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-arena-muted">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-arena-primary hover:text-arena-primary-light transition-colors font-medium"
              >
                Create one
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
