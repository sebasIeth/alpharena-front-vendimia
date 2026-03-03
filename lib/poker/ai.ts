import type { AIProfileType } from "@/lib/types";
import type { GameState, Action, LegalActions } from "./engine";
import { getLegalActions } from "./engine";
import { handStrengthScore } from "./evaluator";

/* ───────────────────────────────────────────────────────
   AI Profiles
   ─────────────────────────────────────────────────────── */
export interface AIProfile {
  type: AIProfileType;
  displayName: string;
  vpip: number;
  pfr: number;
  aggressionFactor: number;
  bluffFrequency: number;
  foldToRaise: number;
  strongHandThreshold: number;
  mediumHandThreshold: number;
}

export const AI_PROFILES: Record<AIProfileType, AIProfile> = {
  TAG: {
    type: "TAG",
    displayName: "Tight-Aggressive",
    vpip: 0.22,
    pfr: 0.18,
    aggressionFactor: 1.8,
    bluffFrequency: 0.12,
    foldToRaise: 0.55,
    strongHandThreshold: 0.65,
    mediumHandThreshold: 0.45,
  },
  LAG: {
    type: "LAG",
    displayName: "Loose-Aggressive",
    vpip: 0.35,
    pfr: 0.28,
    aggressionFactor: 2.2,
    bluffFrequency: 0.22,
    foldToRaise: 0.35,
    strongHandThreshold: 0.55,
    mediumHandThreshold: 0.30,
  },
  Rock: {
    type: "Rock",
    displayName: "Tight-Passive",
    vpip: 0.15,
    pfr: 0.08,
    aggressionFactor: 0.5,
    bluffFrequency: 0.03,
    foldToRaise: 0.70,
    strongHandThreshold: 0.75,
    mediumHandThreshold: 0.55,
  },
  CallingStation: {
    type: "CallingStation",
    displayName: "Loose-Passive",
    vpip: 0.45,
    pfr: 0.10,
    aggressionFactor: 0.4,
    bluffFrequency: 0.05,
    foldToRaise: 0.20,
    strongHandThreshold: 0.70,
    mediumHandThreshold: 0.25,
  },
};

/* ───────────────────────────────────────────────────────
   AI Decision Logic
   ─────────────────────────────────────────────────────── */
export function getAIAction(state: GameState, playerIndex?: number): Action {
  const pIdx = playerIndex ?? state.currentPlayerIndex;
  const aiPlayer = state.players[pIdx];
  const profile = AI_PROFILES[aiPlayer.aiProfile ?? "TAG"];
  const legal = getLegalActions(state);

  // Hand strength (0-1)
  const strength = handStrengthScore(aiPlayer.holeCards, state.communityCards);

  // Pot odds
  const potOdds = legal.callAmount > 0
    ? legal.callAmount / (state.pot + legal.callAmount)
    : 0;

  // Adjust thresholds by number of active opponents
  const numOpponents = state.players.filter(p =>
    !p.hasFolded && !p.isEliminated && p.id !== aiPlayer.id,
  ).length;
  const oppAdjust = Math.min(0.15, (numOpponents - 1) * 0.03);
  const strongThreshold = profile.strongHandThreshold + oppAdjust;
  const mediumThreshold = profile.mediumHandThreshold + oppAdjust;

  const rng = Math.random();
  const isBluffing = rng < profile.bluffFrequency;

  // Pre-flop VPIP gating
  if (state.street === "preflop" && aiPlayer.currentBet <= state.bigBlind) {
    if (strength < (1 - profile.vpip)) {
      if (legal.canCheck) return { type: "check" };
      return { type: "fold" };
    }
  }

  // Strong hand or bluff
  if (strength > strongThreshold || (isBluffing && strength < 0.3)) {
    return aggressivePlay(legal, strength, state, profile, isBluffing);
  }

  // Medium hand
  if (strength > mediumThreshold) {
    return mediumPlay(legal, potOdds, profile, rng);
  }

  // Weak hand
  return weakPlay(legal, potOdds, profile, rng);
}

function aggressivePlay(
  legal: LegalActions,
  strength: number,
  state: GameState,
  profile: AIProfile,
  isBluffing: boolean,
): Action {
  const rng = Math.random();
  const aggMult = profile.aggressionFactor / 2; // normalize to ~0-1 range

  // Monster hand (> 0.9): all-in sometimes
  if (strength > 0.9 && !isBluffing) {
    if (rng < 0.3 * aggMult && legal.canAllIn) return { type: "all_in" };
    if (legal.canRaise) {
      const amount = Math.round(legal.minRaise + (legal.maxRaise - legal.minRaise) * (0.7 + rng * 0.3));
      return { type: "raise", amount: Math.min(amount, legal.maxRaise) };
    }
  }

  // Strong hand or bluff: raise
  if (legal.canRaise) {
    const fraction = isBluffing
      ? 0.2 + rng * 0.2
      : 0.3 * aggMult + rng * 0.3;
    const amount = Math.round(legal.minRaise + (legal.maxRaise - legal.minRaise) * Math.min(fraction, 1));
    return { type: "raise", amount: Math.min(Math.max(amount, legal.minRaise), legal.maxRaise) };
  }

  if (legal.canCall) return { type: "call" };
  if (legal.canCheck) return { type: "check" };
  return { type: "fold" };
}

function mediumPlay(
  legal: LegalActions,
  potOdds: number,
  profile: AIProfile,
  rng: number,
): Action {
  if (legal.canCheck) {
    // Occasionally raise with aggressive profiles
    if (rng < 0.15 * profile.aggressionFactor && legal.canRaise) {
      return { type: "raise", amount: legal.minRaise };
    }
    return { type: "check" };
  }

  // Facing a bet
  if (legal.canCall) {
    // Passive profiles call more; aggressive fold to bad odds
    const foldThreshold = profile.foldToRaise * 0.6;
    if (potOdds < 0.4) return { type: "call" };
    if (rng > foldThreshold) return { type: "call" };
    return { type: "fold" };
  }

  return { type: "fold" };
}

function weakPlay(
  legal: LegalActions,
  potOdds: number,
  profile: AIProfile,
  rng: number,
): Action {
  if (legal.canCheck) return { type: "check" };

  if (legal.canCall) {
    // Calling stations call with weak hands; rocks fold
    const callFreq = 1 - profile.foldToRaise;
    if (potOdds < 0.2 && rng < 0.5) return { type: "call" };
    if (rng < callFreq * 0.3) return { type: "call" };
  }

  return { type: "fold" };
}

/* ───────────────────────────────────────────────────────
   AI Thinking text
   ─────────────────────────────────────────────────────── */
export function getAIThinking(state: GameState, action: Action, playerIndex?: number): string {
  const pIdx = playerIndex ?? state.currentPlayerIndex;
  const aiPlayer = state.players[pIdx];
  const strength = handStrengthScore(aiPlayer.holeCards, state.communityCards);
  const streetName = state.street.charAt(0).toUpperCase() + state.street.slice(1);
  const profileName = aiPlayer.aiProfile ?? "TAG";

  const handDesc = strength > 0.75 ? "a strong hand"
    : strength > 0.5 ? "a decent hand"
    : strength > 0.3 ? "a marginal hand"
    : "a weak hand";

  const actionDesc = action.type === "fold" ? "folding"
    : action.type === "check" ? "checking"
    : action.type === "call" ? "calling"
    : action.type === "raise" ? `raising to ${(action as { amount: number }).amount}`
    : "going all-in";

  return `[${streetName}] ${aiPlayer.name} (${profileName}): I have ${handDesc}. ${actionDesc}. Pot: ${state.pot}`;
}
