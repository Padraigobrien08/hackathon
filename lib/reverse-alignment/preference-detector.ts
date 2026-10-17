// S5: spot repeated corrections and offer to remember them. Pure functions; the hook wires them in.
import type { CoachingPreferences, LearningSignals } from "./types";

/** Corrections we can turn into a remembered style. M4 scope: concise only. */
export type CorrectionKind = "concise";

/** Ask after this many consistent corrections ("2x 'shorter' -> prompt"). */
export const CORRECTION_THRESHOLD = 2;

const CONCISE =
  /\b(shorter|too long|more concise|be concise|less wordy|briefer|be brief|tl;?dr|cut it down|trim it)\b/i;

/** The correction a follow-up message makes, if any. Only a follow-up can correct an answer. */
export function detectCorrection(
  userText: string,
  isFollowUp: boolean
): CorrectionKind | null {
  if (!isFollowUp) {
    return null;
  }
  return CONCISE.test(userText) ? "concise" : null;
}

export type PreferenceOffer = {
  kind: CorrectionKind;
  text: string;
};

const OFFER_TEXT: Record<CorrectionKind, string> = {
  concise:
    "You've asked for shorter answers a couple of times. Keep answers short from now on?",
};

/** An offer once a correction hits the threshold, unless that style is already on. */
export function offerFor(
  kind: CorrectionKind,
  prefs: CoachingPreferences,
  signals: LearningSignals
): PreferenceOffer | null {
  if (prefs.confirmedStyles.concise) {
    return null;
  }
  if ((signals.correctionCounts[kind] ?? 0) < CORRECTION_THRESHOLD) {
    return null;
  }
  return { kind, text: OFFER_TEXT[kind] };
}
