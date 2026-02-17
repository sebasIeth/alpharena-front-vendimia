"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

function CreateAgentContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    endpointUrl: "",
    marrakech: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
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

    if (!formData.endpointUrl.trim()) {
      setError("Endpoint URL is required.");
      setLoading(false);
      return;
    }

    if (!validateUrl(formData.endpointUrl.trim())) {
      setError("Please enter a valid URL (e.g., https://myagent.example.com/api).");
      setLoading(false);
      return;
    }

    const gameTypes: string[] = [];
    if (formData.marrakech) gameTypes.push("marrakech");

    if (gameTypes.length === 0) {
      setError("Please select at least one game type.");
      setLoading(false);
      return;
    }

    try {
      const data = await api.createAgent({
        name: formData.name.trim(),
        endpointUrl: formData.endpointUrl.trim(),
        gameTypes,
      });
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
              <div className="bg-arena-accent/10 border border-arena-accent/30 text-arena-accent rounded-lg px-4 py-3 text-sm">
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

            <div>
              <label className="block text-sm font-medium text-arena-text mb-3">
                Game Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer bg-arena-bg border border-arena-border rounded-lg p-3 hover:border-arena-primary/30 transition-colors">
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

            <div className="bg-arena-bg border border-arena-border rounded-lg p-4">
              <h4 className="text-sm font-medium text-arena-text mb-2">
                Agent Endpoint Requirements
              </h4>
              <ul className="text-xs text-arena-muted space-y-1.5 list-disc list-inside">
                <li>Must accept POST requests with JSON body</li>
                <li>Should respond with a valid move within 30 seconds</li>
                <li>Must be publicly accessible</li>
                <li>Should handle game state payload and return move data</li>
              </ul>
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
