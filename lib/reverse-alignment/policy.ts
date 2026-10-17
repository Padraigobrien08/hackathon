import {
  COOLDOWN,
  type CoachingDecision,
  type CoachingPreferences,
  type LearningSignals,
} from "./types";

// Illustrative guardrails (spec §6), not validated thresholds.
export const MIN_CONFIDENCE = 0.8;

export type GateOptions = { demo?: boolean }; // ?demo=1: skip the cooldown (shown with a visible badge)

export function cooldownFor(prefs: CoachingPreferences) {
  return prefs.frequency === "low" ? COOLDOWN.low : COOLDOWN.normal;
}

/**
 * Gate 1, BEFORE calling the observer: most turns stop here and cost no model call.
 * Simple turns are filtered even earlier (isSimple on the client) and never reach this.
 */
export function preGate(
  prefs: CoachingPreferences,
  signals: LearningSignals,
  options: GateOptions = {}
) {
  if (!prefs.enabled || prefs.frequency === "off") {
    return false;
  }
  return options.demo || signals.turnsSinceLastTip >= cooldownFor(prefs);
}

/** Gate 2, on the observer's decision (spec §6 shouldShowTip). */
export function shouldShowTip(
  decision: CoachingDecision,
  prefs: CoachingPreferences,
  signals: LearningSignals,
  context: { isSensitive: boolean; isSimple: boolean },
  options: GateOptions = {}
) {
  if (!preGate(prefs, signals, options)) {
    return false;
  }
  if (context.isSensitive || context.isSimple) {
    return false;
  }
  if (decision.category === "none") {
    return false;
  }
  if (!decision.insight?.trim() || decision.confidence < MIN_CONFIDENCE) {
    return false;
  }
  if (decision.category === "assumption" && !prefs.showAssumptions) {
    return false;
  }
  return !signals.dismissedCategories.includes(decision.category);
}
