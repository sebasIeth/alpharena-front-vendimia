import type { Socket } from "socket.io-client";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  Agent,
  CreateAgentPayload,
  UpdateAgentPayload,
  HealthCheckResponse,
  AgentBalance,
  WithdrawResponse,
  Match,
  MatchesResponse,
  Move,
  QueueEntry,
  QueueStatus,
  QueueSize,
  QueueListResponse,
  PlayingCountResponse,
  AutoPlayCountResponse,
  LeaderboardAgent,
  LeaderboardUser,
  AgentStatsResponse,
  PlayJoinPayload,
  PlayStatus,
  PlayBalance,
} from "./types";

/**
 * Normalize balance objects from the backend.
 * The backend may send `alpha` or legacy `usdc` — this maps either to `alpha`.
 */
function normalizeBalance<T extends { alpha?: string; usdc?: string }>(raw: T): T & { alpha: string } {
  const alpha = (raw as any).alpha ?? (raw as any).usdc ?? "0";
  const out = { ...raw, alpha };
  delete (out as any).usdc;
  return out;
}

// Client-side: use Next.js rewrite proxy to avoid CORS
// Server-side: call the API directly (no CORS restrictions)
const API_URL = typeof window !== "undefined"
  ? "/api/backend"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000");
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("arena_token");
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(includeAuth),
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `Request failed with status ${response.status}`,
      }));

      if (response.status === 401 && includeAuth) {
        throw new Error("Your session has expired. Please log in again.");
      }

      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(path: string, includeAuth: boolean = true): Promise<T> {
    return this.request<T>("GET", path, undefined, includeAuth);
  }

  async post<T>(path: string, body?: unknown, includeAuth: boolean = true): Promise<T> {
    return this.request<T>("POST", path, body, includeAuth);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // ========== Auth ==========
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return this.post<AuthResponse>("/auth/login", payload, false);
  }

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return this.post<AuthResponse>("/auth/register", payload, false);
  }

  async sendVerificationCode(email: string): Promise<{ message: string }> {
    return this.post<{ message: string }>("/auth/send-verification-code", { email }, false);
  }

  async getMe(): Promise<{ user: User }> {
    return this.get<{ user: User }>("/auth/me");
  }

  // ========== Agents ==========
  async createAgent(payload: CreateAgentPayload): Promise<{ agent: Agent }> {
    return this.post<{ agent: Agent }>("/agents", payload);
  }

  async getAgents(): Promise<{ agents: Agent[] }> {
    return this.get<{ agents: Agent[] }>("/agents");
  }

  async getAgent(id: string): Promise<{ agent: Agent }> {
    return this.get<{ agent: Agent }>(`/agents/${id}`);
  }

  async updateAgent(id: string, payload: UpdateAgentPayload): Promise<{ agent: Agent }> {
    return this.put<{ agent: Agent }>(`/agents/${id}`, payload);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.del<void>(`/agents/${id}`);
  }

  async agentHealthCheck(id: string): Promise<HealthCheckResponse> {
    return this.get<HealthCheckResponse>(`/agents/${id}/health`);
  }

  async testOpenClawConnection(openclawUrl: string, openclawToken: string, openclawAgentId?: string): Promise<HealthCheckResponse> {
    return this.post<HealthCheckResponse>("/agents/test-connection", {
      openclawUrl,
      openclawToken,
      openclawAgentId: openclawAgentId || "main",
    });
  }

  async testOpenClawWebhook(openclawUrl: string, openclawToken: string): Promise<HealthCheckResponse> {
    return this.post<HealthCheckResponse>("/agents/test-webhook", {
      openclawUrl,
      openclawToken,
    });
  }

  async chatWithAgent(agentId: string, message: string): Promise<{ reply: string }> {
    return this.post<{ reply: string }>(`/agents/${agentId}/chat`, { message });
  }

  async getAgentBalance(id: string): Promise<AgentBalance> {
    const raw = await this.get<AgentBalance>(`/agents/${id}/balance`);
    return normalizeBalance(raw);
  }

  async withdrawAgent(id: string, amount: number, toAddress: string): Promise<WithdrawResponse> {
    return this.post<WithdrawResponse>(`/agents/${id}/withdraw`, { amount, toAddress });
  }

  // ========== SelfClaw ==========
  async verifySelfClaw(publicKey: string): Promise<{ verified: boolean; agentName?: string; humanId?: string }> {
    const url = `/api/selfclaw/v1/agent?publicKey=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SelfClaw verification failed with status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("SelfClaw returned an unexpected response. Try restarting the dev server.");
    }
    const data = await response.json();
    if (typeof data.verified !== "boolean") {
      throw new Error("Invalid response from SelfClaw API");
    }
    return data;
  }

  // ========== Password Reset ==========
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.post<{ message: string }>("/auth/forgot-password", { email }, false);
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.post<{ message: string }>("/auth/reset-password", { token, password }, false);
  }

  // ========== Matchmaking ==========
  async joinQueue(agentId: string, stakeAmount: number, gameType: string): Promise<{ queueEntry: QueueEntry }> {
    return this.post<{ queueEntry: QueueEntry }>("/matchmaking/join", {
      agentId,
      stakeAmount,
      gameType,
    });
  }

  async cancelQueue(agentId: string): Promise<void> {
    return this.post<void>("/matchmaking/cancel", { agentId });
  }

  async getQueueStatus(agentId: string): Promise<QueueStatus> {
    return this.get<QueueStatus>(`/matchmaking/status/${agentId}`);
  }

  async getQueueSize(gameType: string): Promise<QueueSize> {
    return this.get<QueueSize>(`/matchmaking/queue-size?gameType=${gameType}`, false);
  }

  async getQueueList(gameType?: string): Promise<QueueListResponse> {
    const params = gameType ? `?gameType=${gameType}` : "";
    return this.get<QueueListResponse>(`/matchmaking/queue${params}`, false);
  }

  async getPlayingCount(): Promise<PlayingCountResponse> {
    return this.get<PlayingCountResponse>("/matchmaking/playing-count", false);
  }

  async getAutoPlayCount(): Promise<AutoPlayCountResponse> {
    return this.get<AutoPlayCountResponse>("/matchmaking/auto-play-count", false);
  }

  // ========== Matches ==========
  async getMatches(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<MatchesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    const query = searchParams.toString();
    return this.get<MatchesResponse>(`/matches${query ? `?${query}` : ""}`, false);
  }

  async getActiveMatches(): Promise<{ matches: Match[] }> {
    return this.get<{ matches: Match[] }>("/matches/active", false);
  }

  async getMatch(id: string): Promise<{ match: Match }> {
    return this.get<{ match: Match }>(`/matches/${id}`, false);
  }

  async getMatchMoves(id: string): Promise<{ moves: Move[] }> {
    return this.get<{ moves: Move[] }>(`/matches/${id}/moves`, false);
  }

  // ========== Leaderboard ==========
  async getLeaderboardAgents(limit?: number, gameType?: string): Promise<{ agents: LeaderboardAgent[] }> {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (gameType) params.set("gameType", gameType);
    const query = params.toString() ? `?${params}` : "";
    const res = await this.get<Record<string, unknown>>(`/leaderboard/agents${query}`, false);
    const list = (res.agents ?? res.leaderboard ?? []) as LeaderboardAgent[];
    return { agents: list };
  }

  async getLeaderboardUsers(limit?: number): Promise<{ users: LeaderboardUser[] }> {
    const query = limit ? `?limit=${limit}` : "";
    const res = await this.get<Record<string, unknown>>(`/leaderboard/users${query}`, false);
    const list = (res.users ?? res.leaderboard ?? []) as LeaderboardUser[];
    return { users: list };
  }

  async getAgentStats(id: string): Promise<AgentStatsResponse> {
    return this.get<AgentStatsResponse>(`/leaderboard/agents/${id}/stats`, false);
  }

  // ========== Human Play ==========
  async playJoin(payload: PlayJoinPayload): Promise<{ message: string; agentId: string }> {
    return this.post("/play/join", payload);
  }

  async playCancel(): Promise<void> {
    return this.post("/play/cancel");
  }

  async playStatus(): Promise<PlayStatus> {
    return this.get("/play/status");
  }

  async playBalance(): Promise<PlayBalance> {
    const raw = await this.get<PlayBalance>("/play/balance");
    return normalizeBalance(raw);
  }

  async playWithdraw(amount: number, toAddress: string): Promise<WithdrawResponse> {
    return this.post<WithdrawResponse>("/play/withdraw", { amount, toAddress });
  }

  async playMove(matchId: string, move: unknown): Promise<{ success: boolean }> {
    return this.post("/play/move", { matchId, move });
  }

  // ========== Socket.IO ==========
  connectMatchSocket(matchId: string): Socket | null {
    if (typeof window === "undefined") return null;
    const token = this.getToken();
    // Dynamic import to avoid SSR issues with socket.io-client
    const { io } = require("socket.io-client");
    const socket: Socket = io(`${SOCKET_URL}/ws`, {
      query: { token: token || "", matchId },
      transports: ["websocket", "polling"],
    });
    return socket;
  }

  connectSocket(): Socket | null {
    if (typeof window === "undefined") return null;
    const token = this.getToken();
    const { io } = require("socket.io-client");
    const socket: Socket = io(`${SOCKET_URL}/ws`, {
      query: { token: token || "" },
      transports: ["websocket", "polling"],
    });
    return socket;
  }
}

export const api = new ApiClient(API_URL);
