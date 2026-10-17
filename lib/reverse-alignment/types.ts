// Reverse Alignment shared contract. Used by app/(chat)/api/coach, the chat route and the UI.
// Change only after telling the team.

export type CoachingCategory =
  | "missing_context"
  | "assumption"
  | "verification"
  | "delegation"
  | "none";

export type CoachingDecision = {
  category: CoachingCategory;
  insight?: string; // <= 180 characters preferred
  whyRelevant?: string; // internal rationale; not shown
  confidence: number; // model uncertainty, NOT human skill
  assumedDetail?: string;
};

/** Rubric score per dimension: 2 clear, 1 missing but harmless, 0 missing and it hurt the answer, null n/a. See prompt_eval/Rubric.md §1. */
export type RubricScore = 0 | 1 | 2 | null;
export type Rubric = {
  task: RubricScore;
  context: RubricScore;
  success_criteria: RubricScore;
  efficiency: RubricScore;
  evidence: string[]; // one short phrase per 0
};

/** User-facing label, derived in code from the rubric (never by the LLM). */
export type PromptStrength = "weak" | "reasonable" | "strong";

/** POST /api/coach — only the last exchange (minimum context). Call AFTER the answer finishes streaming. */
export type CoachRequest = { userMessage: string; assistantReply: string };
export type CoachResponse = {
  decision: CoachingDecision;
  isSimple: boolean;
  isSensitive: boolean;
  source: "llm" | "fixture"; // fixture = scripted; never present it as inferred
  // Absent on simple/sensitive turns, mock mode, and observer failure: show no label then.
  strength?: PromptStrength;
  rubric?: Rubric; // for metrics/debugging; the UI shows strength, not raw scores
};

/** Only user-APPROVED styles. Sent with each chat request as `preferences`; the route adds them to the system prompt. */
export type ConfirmedStyles = {
  concise?: boolean;
  technicalDetail?: "low" | "normal" | "high";
};

// ---- Client-only learning state (session-local; the server stays stateless) ----

export type CoachingPreferences = {
  enabled: boolean;
  frequency: "off" | "low" | "normal";
  showAssumptions: boolean;
  confirmedStyles: ConfirmedStyles;
};

export type LearningSignals = {
  recentCategoriesShown: CoachingCategory[];
  turnsSinceLastTip: number; // eligible (non-simple) turns only
  dismissedCategories: CoachingCategory[];
  correctionCounts: Record<string, number>;
};

export const COOLDOWN = { low: 5, normal: 3 } as const;

export const DEFAULT_PREFERENCES: CoachingPreferences = {
  confirmedStyles: {},
  enabled: true,
  frequency: "normal",
  showAssumptions: true,
};

export const DEFAULT_SIGNALS: LearningSignals = {
  correctionCounts: {},
  dismissedCategories: [],
  recentCategoriesShown: [],
  // Start AT the cooldown so the first eligible turn can show a tip (otherwise nothing before turn 4).
  turnsSinceLastTip: COOLDOWN.normal,
};
