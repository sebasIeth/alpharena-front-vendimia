"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AgentType } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

function CreateAgentContent() {
  const router = useRouter();
  const [agentType, setAgentType] = useState<AgentType>("openclaw");
  const [formData, setFormData] = useState({
    name: "",
    endpointUrl: "",
    openclawUrl: "",
    openclawToken: "",
    openclawAgentId: "",
    marrakech: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthCheck, setHealthCheck] = useState<{
    status: "idle" | "checking" | "success" | "error";
    latencyMs?: number;
    error?: string;
  }>({ status: "idle" });

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleTestConnection = async () => {
    if (!formData.openclawUrl.trim() || !formData.openclawToken.trim()) {
      setHealthCheck({
        status: "error",
        error: "OpenClaw URL and gateway token are required to test connection.",
      });
      return;
    }
    if (!validateUrl(formData.openclawUrl.trim())) {
      setHealthCheck({ status: "error", error: "Invalid URL format." });
      return;
    }

    setHealthCheck({ status: "checking" });

    try {
      const result = await api.testOpenClawWebhook(
        formData.openclawUrl.trim(),
        formData.openclawToken.trim(),
      );

      if (result.ok) {
        setHealthCheck({ status: "success", latencyMs: result.latencyMs });
      } else {
        setHealthCheck({
          status: "error",
          latencyMs: result.latencyMs,
          error: result.error || "Connection failed",
        });
      }
    } catch (err) {
      setHealthCheck({
        status: "error",
        error: err instanceof Error ? err.message : "Connection failed",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.name.trim()) {
      setError("Agent name is required.");
      setLoading(false);
      return;
    }

    if (agentType === "http") {
      if (!formData.endpointUrl.trim()) {
        setError("Endpoint URL is required.");
        setLoading(false);
        return;
      }
      if (!validateUrl(formData.endpointUrl.trim())) {
        setError(
          "Please enter a valid URL (e.g., https://myagent.example.com/api)."
        );
        setLoading(false);
        return;
      }
    }

    if (agentType === "openclaw") {
      if (!formData.openclawUrl.trim()) {
        setError("OpenClaw URL is required.");
        setLoading(false);
        return;
      }
      if (!validateUrl(formData.openclawUrl.trim())) {
        setError(
          "Please enter a valid OpenClaw URL (e.g., wss://my-vps.com:18789)."
        );
        setLoading(false);
        return;
      }
      if (!formData.openclawToken.trim()) {
        setError("Gateway token is required.");
        setLoading(false);
        return;
      }
    }

    const gameTypes: string[] = [];
    if (formData.marrakech) gameTypes.push("marrakech");

    if (gameTypes.length === 0) {
      setError("Please select at least one game type.");
      setLoading(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        type: agentType,
        gameTypes,
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
      router.push(`/agents/${data.agent.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create agent."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Link
            href="/agents"
            className="text-sm text-arena-muted hover:text-arena-primary transition-colors mb-4 inline-block"
          >
            &larr; Back to Agents
          </Link>
          <h1 className="page-title">Create Agent</h1>
          <p className="text-arena-muted">
            Register a new AI agent to compete in the arena.
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
              label="Agent Name"
              type="text"
              placeholder="e.g., MarrakechMaster v1"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              helperText="A unique name for your agent."
            />

            {/* Agent Type Selector */}
            <div>
              <label className="block text-sm font-medium text-arena-text mb-3">
                Agent Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAgentType("openclaw")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    agentType === "openclaw"
                      ? "border-arena-primary bg-arena-primary/10"
                      : "border-arena-border bg-arena-bg hover:border-arena-primary/30"
                  }`}
                >
                  <div className="text-sm font-semibold text-arena-text">
                    OpenClaw
                  </div>
                  <div className="text-xs text-arena-muted mt-1">
                    Connect your OpenClaw AI instance via WebSocket
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentType("http")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    agentType === "http"
                      ? "border-arena-primary bg-arena-primary/10"
                      : "border-arena-border bg-arena-bg hover:border-arena-primary/30"
                  }`}
                >
                  <div className="text-sm font-semibold text-arena-text">
                    Custom HTTP
                  </div>
                  <div className="text-xs text-arena-muted mt-1">
                    Your own HTTP endpoint that receives game state
                  </div>
                </button>
              </div>
            </div>

            {/* OpenClaw Fields */}
            {agentType === "openclaw" && (
              <div className="space-y-4">
                <Input
                  label="OpenClaw URL"
                  type="text"
                  placeholder="wss://your-vps.com:18789"
                  value={formData.openclawUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, openclawUrl: e.target.value })
                  }
                  required
                  helperText="WebSocket URL of your OpenClaw instance (wss:// or ws://)."
                />

                <Input
                  label="Gateway Token"
                  type="password"
                  placeholder="Your OPENCLAW_TOKEN"
                  value={formData.openclawToken}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openclawToken: e.target.value,
                    })
                  }
                  required
                  helperText="The token from your OpenClaw config (~/.openclaw/openclaw.json)."
                />

                <Input
                  label="Agent ID (optional)"
                  type="text"
                  placeholder="main"
                  value={formData.openclawAgentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openclawAgentId: e.target.value,
                    })
                  }
                  helperText='The OpenClaw agent ID to route commands to. Defaults to "main".'
                />

                {/* Test Connection Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={healthCheck.status === "checking"}
                    className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-arena-bg-card text-sm font-medium text-arena-text hover:border-arena-primary/50 hover:bg-arena-primary/5 transition-all disabled:opacity-50"
                  >
                    {healthCheck.status === "checking"
                      ? "Testing connection..."
                      : "Test Connection"}
                  </button>

                  {healthCheck.status === "success" && (
                    <div className="mt-2 bg-arena-success/10 border border-arena-success/30 text-arena-success rounded-xl px-4 py-2.5 text-sm">
                      Connected ({healthCheck.latencyMs}ms latency)
                    </div>
                  )}

                  {healthCheck.status === "error" && (
                    <div className="mt-2 bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-2.5 text-sm">
                      Connection failed: {healthCheck.error}
                    </div>
                  )}
                </div>

                <div className="bg-arena-bg border border-arena-border rounded-xl p-4">
                  <h4 className="text-sm font-medium text-arena-text mb-2">
                    OpenClaw Setup
                  </h4>
                  <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                    <li>
                      Provide your OpenClaw WebSocket URL (e.g.{" "}
                      <code className="text-arena-primary">
                        wss://your-vps.com:18789
                      </code>
                      )
                    </li>
                    <li>
                      Paste the{" "}
                      <code className="text-arena-primary">
                        token
                      </code>{" "}
                      from your OpenClaw config (
                      <code className="text-arena-primary">
                        ~/.openclaw/openclaw.json
                      </code>
                      )
                    </li>
                    <li>
                      We connect via WebSocket using the same protocol as{" "}
                      <code className="text-arena-primary">
                        OpenClawHookTest
                      </code>{" "}
                      (ED25519 challenge-response auth)
                    </li>
                    <li>
                      Make sure your OpenClaw instance is reachable from the
                      internet
                    </li>
                    <li>
                      Use a fast model for best results (30s move timeout)
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* HTTP Fields */}
            {agentType === "http" && (
              <div className="space-y-4">
                <Input
                  label="Endpoint URL"
                  type="url"
                  placeholder="https://myagent.example.com/api"
                  value={formData.endpointUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, endpointUrl: e.target.value })
                  }
                  required
                  helperText="The HTTP endpoint where your agent receives game state and returns moves."
                />

                <div className="bg-arena-bg border border-arena-border rounded-xl p-4">
                  <h4 className="text-sm font-medium text-arena-text mb-2">
                    Agent Endpoint Requirements
                  </h4>
                  <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                    <li>Must accept POST requests with JSON body</li>
                    <li>Should respond with a valid move within 30 seconds</li>
                    <li>Must be publicly accessible</li>
                    <li>
                      Should handle game state payload and return move data
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-arena-text mb-3">
                Game Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer bg-arena-bg border border-arena-border rounded-xl p-3 hover:border-arena-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.marrakech}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        marrakech: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-arena-border bg-arena-bg text-arena-primary focus:ring-arena-primary accent-arena-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-arena-text">
                      Marrakech
                    </div>
                    <div className="text-xs text-arena-muted">
                      Carpet strategy game - 7x7 board
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                isLoading={loading}
                className="flex-1"
                size="lg"
              >
                Create Agent
              </Button>
              <Link href="/agents">
                <Button type="button" variant="secondary" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
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
