// ========== User ==========
export interface User {
  id: string;
  username: string;
  email?: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Auth ==========
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  walletAddress: string;
  email?: string;
}

// ========== Agent ==========
export interface AgentStats {
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalEarnings: number;
}

export type AgentType = "http" | "openclaw";

export interface Agent {
  id: string;
  userId: string;
  name: string;
  type: AgentType;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  gameTypes: string[];
  elo: number;
  status: "idle" | "queued" | "in_match" | "disabled";
  stats: AgentStats;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPayload {
  name: string;
  type?: AgentType;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  gameTypes: string[];
}

export interface UpdateAgentPayload {
  name?: string;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  gameTypes?: string[];
}

export interface HealthCheckResponse {
  ok: boolean;
  latencyMs: number;
  response?: string;
  error?: string;
}

// ========== Match ==========
export interface MatchAgent {
  agentId: string;
  agentName: string;
  userId: string;
  username: string;
  eloAtStart: number;
  eloChange?: number;
  finalScore?: number;
}

export interface Match {
  id: string;
  gameType: string;
  status: "pending" | "active" | "completed" | "cancelled" | "error";
  agents: MatchAgent[];
  stakeAmount: number;
  pot: number;
  winnerId?: string;
  result?: string;
  boardState?: BoardState;
  moveCount: number;
  currentTurn?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MatchesResponse {
  matches: Match[];
  total: number;
  page: number;
  pages: number;
}

// ========== Move ==========
export interface Move {
  id: string;
  matchId: string;
  agentId: string;
  turnNumber: number;
  moveData: Record<string, unknown>;
  timestamp: string;
}

// ========== Board State (Marrakech) ==========
export interface AssamPosition {
  row: number;
  col: number;
  direction: "N" | "S" | "E" | "W";
}

export interface CarpetCell {
  playerId: number; // -1 = neutralized, 0-3 = player index
  carpetId?: number;
}

export interface BoardState {
  grid: CarpetCell[][];
  assam: AssamPosition;
  players?: PlayerState[];
}

export interface PlayerState {
  id: number;
  coins: number;
  carpetsRemaining: number;
  dirhams?: number;
  name?: string;
  eliminated?: boolean;
}

export interface DiceResult {
  value: number;
  faces: number[];
}

export interface TributeEvent {
  fromPlayerId: number;
  toPlayerId: number;
  amount: number;
}

export type GamePhase = "roll" | "tribute" | "place";

// ========== Matchmaking ==========
export interface QueueEntry {
  id: string;
  agentId: string;
  gameType: string;
  stakeAmount: number;
  status: string;
  createdAt: string;
}

export interface QueueStatus {
  status: string;
  position?: number;
  inQueue?: boolean;
  agentStatus?: string;
  matchId?: string;
  matchStatus?: string;
  gameType?: string;
}

export interface QueueSize {
  size: number;
}

// ========== Leaderboard ==========
export interface LeaderboardAgent {
  rank: number;
  id: string;
  name: string;
  ownerUsername: string;
  elo: number;
  winRate: number;
  totalMatches: number;
  totalEarnings: number;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  totalEarnings: number;
  agentCount: number;
}

export interface AgentStatsResponse {
  agent: Agent;
  recentMatches: Match[];
}

// ========== WebSocket ==========
export interface WSMessage {
  type: string;
  data: unknown;
}

// ========== API Error ==========
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
