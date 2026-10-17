// Reverse Alignment shared contract. Used by app/(chat)/api/coach, the chat route and the UI.
// Change only after telling the team.

export type CoachingCategory =
  | "unclear_task"
  | "missing_context"
  | "assumption"
  | "success_criteria"
  | "efficiency"
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

/** Rubric score per dimension: 2 clear, 1 missing but harmless, 0 missing and it hurt the answer, null n/a. */
export type RubricScore = 0 | 1 | 2 | null;
export type Rubric = {
  task: RubricScore;
  context: RubricScore;
  success_criteria: RubricScore;
  efficiency: RubricScore;
  evidence: string[]; // one short phrase per 0
};

/** User-facing tier, derived in code from the rubric (never by the LLM). On by default: see showStrength. */
export type PromptStrength = "weak" | "moderate" | "strong";

/** POST /api/coach — the last exchange plus optional prior request. Call AFTER the answer finishes streaming. */
export type CoachRequest = {
  userMessage: string;
  assistantReply: string;
  previousUserMessage?: string;
  /** Scores already shown to the user (rated on send). The coach keeps them, so the tip matches the bar. */
  rating?: Rubric;
};

/** POST /api/coach/rate: prompt-only rating, sent alongside the chat request so the bar can show before the answer ends. */
export type RateRequest = { userMessage: string; previousUserMessage?: string };
export type RateResponse = {
  rubric?: Rubric;
  strength?: PromptStrength; // absent on simple/sensitive prompts, unmatched mock prompts, and failure
  source: "llm" | "fixture";
};
export type CoachResponse = {
  decision: CoachingDecision;
  isSimple: boolean;
  isSensitive: boolean;
  source: "llm" | "fixture"; // fixture = scripted; never present it as inferred
  // Absent on simple/sensitive turns, unmatched mock turns, and observer failure: show no tier then.
  strength?: PromptStrength;
  rubric?: Rubric; // for metrics/debugging; the UI shows strength, not raw scores
};

/** Answer styles the user can teach by correcting answers. Each maps to fixed prompt text, never user input. */
export type StyleKind = "concise" | "bullets" | "plain" | "codeOnly";
export const STYLE_KINDS: StyleKind[] = [
  "concise",
  "bullets",
  "plain",
  "codeOnly",
];

/** Only user-APPROVED styles. Sent with each chat request as `preferences`; the route adds them to the system prompt. */
export type ConfirmedStyles = Partial<Record<StyleKind, boolean>>;

/** A correction the user made, kept as evidence for what was learned. Browser-only. */
export type CorrectionEvidence = { text: string; at: number };

// ---- Client-only learning state (session-local; the server stays stateless) ----

export type CoachingPreferences = {
  enabled: boolean;
  frequency: "off" | "low" | "normal";
  showAssumptions: boolean;
  /** Show a weak/moderate/strong tier on each prompt. On by default; the user can turn it off. */
  showStrength: boolean;
  confirmedStyles: ConfirmedStyles;
};

export type LearningSignals = {
  recentCategoriesShown: CoachingCategory[];
  turnsSinceLastTip: number; // eligible (non-simple) turns only
  dismissedCategories: CoachingCategory[];
  correctionCounts: Record<string, number>;
  /** The user's own words for recent corrections, by style (last few). Shown as "learned from". */
  correctionLog: Partial<Record<StyleKind, CorrectionEvidence[]>>;
};

// Eligible turns required between tips. "normal" has none: every turn that warrants a tip gets one.
// "Fewer" (low) is the user's own opt-in to spacing tips out.
export const COOLDOWN = { low: 5, normal: 0 } as const;

export const DEFAULT_PREFERENCES: CoachingPreferences = {
  confirmedStyles: {},
  enabled: true,
  frequency: "normal",
  showAssumptions: true,
  showStrength: true,
};

export const DEFAULT_SIGNALS: LearningSignals = {
  correctionCounts: {},
  correctionLog: {},
  dismissedCategories: [],
  recentCategoriesShown: [],
  // Start AT the cooldown so the first eligible turn can show a tip.
  turnsSinceLastTip: COOLDOWN.normal,
};
