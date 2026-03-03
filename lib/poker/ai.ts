import type { GameState, Action, LegalActions } from "./engine";
import { getLegalActions } from "./engine";
import { handStrengthScore } from "./evaluator";

/**
 * AI opponent for Texas Hold'em.
 *
 * Strategy:
 * - Evaluates hand strength (0‑1)
 * - Considers pot odds
 * - Adds randomness to avoid predictability
 * - Bluffs ~15% of the time
 */
export function getAIAction(state: GameState): Action {
  const legal = getLegalActions(state);
  const aiPlayer = state.players[1]; // AI is always index 1
  const opponent = state.players[0];

  // Hand strength (0‑1)
  const strength = handStrengthScore(aiPlayer.holeCards, state.communityCards);

  // Pot odds: how much to call vs total pot after calling
  const potOdds = legal.callAmount > 0
    ? legal.callAmount / (state.pot + legal.callAmount)
    : 0;

  // Random factor for unpredictability
  const rng = Math.random();

  // Bluff probability (~15%)
  const isBluffing = rng < 0.15;

  // === Decision logic ===

  // Very strong hand (> 0.75) or bluffing with bad hand
  if (strength > 0.75 || (isBluffing && strength < 0.3)) {
    return aggressivePlay(legal, strength, state, isBluffing);
  }

  // Medium hand (0.4‑0.75) — play cautiously
  if (strength > 0.4) {
    return mediumPlay(legal, potOdds, rng);
  }

  // Weak hand (< 0.4)
  return weakPlay(legal, potOdds, rng, opponent);
}

function aggressivePlay(
  legal: LegalActions,
  strength: number,
  state: GameState,
  isBluffing: boolean,
): Action {
  const rng = Math.random();

  // Monster hand (> 0.9): all-in sometimes, big raise otherwise
  if (strength > 0.9 && !isBluffing) {
    if (rng < 0.3 && legal.canAllIn) return { type: "all_in" };
    if (legal.canRaise) {
      // Raise ~70‑100% of max
      const amount = Math.round(legal.minRaise + (legal.maxRaise - legal.minRaise) * (0.7 + rng * 0.3));
      return { type: "raise", amount: Math.min(amount, legal.maxRaise) };
    }
  }

  // Strong hand or bluff: raise
  if (legal.canRaise) {
    // Raise 40‑70% of range
    const fraction = isBluffing ? 0.3 + rng * 0.2 : 0.4 + rng * 0.3;
    const amount = Math.round(legal.minRaise + (legal.maxRaise - legal.minRaise) * fraction);
    return { type: "raise", amount: Math.min(Math.max(amount, legal.minRaise), legal.maxRaise) };
  }

  if (legal.canCall) return { type: "call" };
  if (legal.canCheck) return { type: "check" };
  return { type: "fold" };
}

function mediumPlay(legal: LegalActions, potOdds: number, rng: number): Action {
  // If can check, check most of the time
  if (legal.canCheck) {
    if (rng < 0.3 && legal.canRaise) {
      // Occasionally raise (value bet / semi-bluff)
      const amount = legal.minRaise;
      return { type: "raise", amount };
    }
    return { type: "check" };
  }

  // Facing a bet: call if pot odds are favorable
  if (legal.canCall) {
    if (potOdds < 0.4) return { type: "call" }; // good odds
    if (rng < 0.5) return { type: "call" }; // coin flip on marginal
    return { type: "fold" };
  }

  return { type: "fold" };
}

function weakPlay(
  legal: LegalActions,
  potOdds: number,
  rng: number,
  _opponent: { currentBet: number },
): Action {
  // Check if free
  if (legal.canCheck) return { type: "check" };

  // Fold most of the time when facing a bet
  if (legal.canCall) {
    // Call only with very good pot odds or random luck
    if (potOdds < 0.2 && rng < 0.5) return { type: "call" };
    if (rng < 0.15) return { type: "call" }; // stubborn call ~15%
  }

  return { type: "fold" };
}

/** Returns a human-readable description of AI thinking. */
export function getAIThinking(state: GameState, action: Action): string {
  const strength = handStrengthScore(state.players[1].holeCards, state.communityCards);
  const streetName = state.street.charAt(0).toUpperCase() + state.street.slice(1);

  const handDesc = strength > 0.75 ? "a strong hand"
    : strength > 0.5 ? "a decent hand"
    : strength > 0.3 ? "a marginal hand"
    : "a weak hand";

  const actionDesc = action.type === "fold" ? "folding"
    : action.type === "check" ? "checking"
    : action.type === "call" ? "calling"
    : action.type === "raise" ? `raising to ${(action as { amount: number }).amount}`
    : "going all-in";

  return `[${streetName}] I have ${handDesc}. ${actionDesc} here seems optimal. Pot is ${state.pot} chips.`;
}
