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
  email: string;
  verificationCode: string;
}

// ========== Chain ==========
export const SUPPORTED_CHAINS = ['base', 'celo'] as const;
export type Chain = (typeof SUPPORTED_CHAINS)[number];

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
  isHuman?: boolean;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  selfclawPublicKey?: string;
  walletAddress?: string;
  chain: Chain;
  gameTypes: string[];
  elo: number;
  status: "idle" | "queued" | "in_match" | "disabled";
  autoPlay: boolean;
  autoPlayStakeAmount: number;
  autoPlayConsecutiveErrors: number;
  stats: AgentStats;
  createdAt: string;
  updatedAt: string;
}

export interface AgentBalance {
  walletAddress: string;
  alpha: string;
  eth: string;
  chain: Chain;
}

export interface WithdrawResponse {
  txHash: string;
  amount: number;
  to: string;
  chain: Chain;
}

export interface CreateAgentPayload {
  name: string;
  type?: AgentType;
  chain?: Chain;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  selfclawPublicKey?: string;
  gameTypes: string[];
}

export interface UpdateAgentPayload {
  name?: string;
  endpointUrl?: string;
  openclawUrl?: string;
  openclawToken?: string;
  openclawAgentId?: string;
  selfclawPublicKey?: string;
  gameTypes?: string[];
  autoPlay?: boolean;
  autoPlayStakeAmount?: number;
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
  chain?: Chain;
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

// ========== Poker ==========
export interface PokerCard {
  rank: string;
  suit: string;
}

export type AIProfileType = "TAG" | "LAG" | "Rock" | "CallingStation";

export interface PokerPlayerInfo {
  id: string;
  name: string;
  seatIndex: number;
  stack: number;
  currentBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isEliminated: boolean;
  isDealer: boolean;
  isHuman: boolean;
  aiProfile?: AIProfileType;
  holeCards?: PokerCard[];
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PokerBoardState {
  handNumber: number;
  street: string;
  pot: number;
  communityCards: PokerCard[];
  players: PokerPlayerInfo[];
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  actionHistory: { type: string; amount?: number; playerIndex: number; street: string }[];
}

export interface PokerLegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
  canAllIn: boolean;
  allInAmount: number;
}

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

export interface QueueListEntry {
  agentId: string;
  eloRating: number;
  gameType: string;
  stakeAmount: number;
  status: string;
  joinedAt: string;
}

export interface QueueListResponse {
  queue: QueueListEntry[];
  total: number;
  gameType: string;
}

export interface PlayingCountResponse {
  playingCount: number;
}

export interface AutoPlayCountResponse {
  autoPlayCount: number;
}

// ========== Leaderboard ==========
export interface LeaderboardAgent {
  rank: number;
  id: string;
  name: string;
  ownerUsername: string;
  isHuman?: boolean;
  elo: number;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
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

// ========== Human Play ==========
export interface PlayBalance {
  walletAddress: string;
  alpha: string;
  eth: string;
}

export interface PlayStatus {
  inQueue: boolean;
  inMatch: boolean;
  agentId?: string;
  matchId?: string;
  gameType?: string;
  stakeAmount?: number;
  matchStatus?: string;
}

export interface PlayJoinPayload {
  gameType: string;
  stakeAmount: number;
  chain?: Chain;
}

// ========== API Error ==========
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
