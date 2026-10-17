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

/** POST /api/coach — only the last exchange (minimum context). Call AFTER the answer finishes streaming. */
export type CoachRequest = { userMessage: string; assistantReply: string };
export type CoachResponse = {
  decision: CoachingDecision;
  isSimple: boolean;
  isSensitive: boolean;
  source: "llm" | "fixture"; // fixture = scripted; never present it as inferred
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

export const COOLDOWN = { low: 5, normal: 3 } as const;

export const DEFAULT_PREFERENCES: CoachingPreferences = {
  confirmedStyles: {},
  enabled: true,
  frequency: "normal",
  showAssumptions: true,
};

export const DEFAULT_SIGNALS: LearningSignals = {
  correctionCounts: {},
  correctionLog: {},
  dismissedCategories: [],
  recentCategoriesShown: [],
  // Start AT the cooldown so the first eligible turn can show a tip (otherwise nothing before turn 4).
  turnsSinceLastTip: COOLDOWN.normal,
};
