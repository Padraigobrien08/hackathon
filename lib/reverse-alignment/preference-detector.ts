// S5: spot repeated corrections and offer to remember them. Pure functions; the hook wires them in.
import type { CoachingPreferences, LearningSignals, StyleKind } from "./types";

/** Corrections we can turn into a remembered style. */
export type CorrectionKind = StyleKind;

/** Ask after this many consistent corrections ("2x 'shorter' -> prompt"). */
export const CORRECTION_THRESHOLD = 2;

/** Longest quote of the user's words kept as evidence. */
export const EVIDENCE_MAX_CHARS = 60;

// First match wins: "just the code, shorter" is a code-only correction.
const PATTERNS: [CorrectionKind, RegExp][] = [
  [
    "codeOnly",
    /\b(just (give me |show me )?the code|only the code|code only|skip the explanation|no explanation|without (the )?explanation)\b/i,
  ],
  [
    "bullets",
    /\b(bullet(ed)?[ -]?points?|bullets|as a list|in a list|use a list|list form)\b/i,
  ],
  [
    "plain",
    /\b(less (jargon|technical)|no jargon|plain (english|language)|simpler (words|terms|language)|explain (it )?(more )?simply|in simple terms|like i'?m (5|five))\b/i,
  ],
  [
    "concise",
    /\b(shorter|too long|more concise|be concise|less wordy|briefer|be brief|tl;?dr|cut it down|trim it)\b/i,
  ],
];

/** The correction a follow-up message makes, if any. Only a follow-up can correct an answer. */
export function detectCorrection(
  userText: string,
  isFollowUp: boolean
): CorrectionKind | null {
  if (!isFollowUp) {
    return null;
  }
  return PATTERNS.find(([, pattern]) => pattern.test(userText))?.[0] ?? null;
}

/** The user's words, trimmed for display as evidence. */
export function evidenceText(userText: string): string {
  const text = userText.trim().replace(/\s+/g, " ");
  return text.length > EVIDENCE_MAX_CHARS
    ? `${text.slice(0, EVIDENCE_MAX_CHARS - 1)}…`
    : text;
}

export const STYLE_LABELS: Record<CorrectionKind, string> = {
  bullets: "Bullet points",
  codeOnly: "Just the code",
  concise: "Short answers",
  plain: "Plain language",
};

const OFFER_QUESTION: Record<CorrectionKind, string> = {
  bullets: "Use bullet points from now on?",
  codeOnly: "Give just the code from now on, without the explanation?",
  concise: "Keep answers short from now on?",
  plain: "Keep explanations in plain language from now on?",
};

export type PreferenceOffer = {
  kind: CorrectionKind;
  /** The user's own words that led to the offer. */
  evidence: string[];
  question: string;
};

/** An offer once a correction hits the threshold, unless that style is already on. */
export function offerFor(
  kind: CorrectionKind,
  prefs: CoachingPreferences,
  signals: LearningSignals
): PreferenceOffer | null {
  if (prefs.confirmedStyles[kind]) {
    return null;
  }
  if ((signals.correctionCounts[kind] ?? 0) < CORRECTION_THRESHOLD) {
    return null;
  }
  return {
    evidence: (signals.correctionLog[kind] ?? [])
      .slice(-CORRECTION_THRESHOLD)
      .map((entry) => entry.text),
    kind,
    question: OFFER_QUESTION[kind],
  };
}
