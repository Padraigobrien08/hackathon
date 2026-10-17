import type { CoachingDecision } from "./types";

// Deterministic checks that run before any model call, in mock AND real mode.
const SENSITIVE =
  /\b(suicid\w*|self[- ]harm|kill myself|overdose|abus\w*|emergency|crisis|panic attack)/i;
const ARITHMETIC = /^\s*(what(['’]?s| is)\s+)?[\d\s.+\-*x×/÷()=]+\??\s*$/i;

export function isSensitive(text: string) {
  return SENSITIVE.test(text);
}

export function isSimple(text: string) {
  return ARITHMETIC.test(text) || text.trim().split(/\s+/).length <= 3;
}

export const NONE: CoachingDecision = { category: "none", confidence: 1 };

// Scripted demo decisions. Always returned with source: "fixture".
const FIXTURES: [RegExp, CoachingDecision][] = [
  [
    /\bemail\b/i,
    {
      assumedDetail: "Formal tone; annual leave",
      category: "assumption",
      confidence: 0.9,
      insight:
        "I assumed this is a formal request for annual leave. Mentioning your relationship with your manager or the reason could change the tone.",
      whyRelevant: "Tone and leave type were unstated and shape the draft.",
    },
  ],
  [
    /\b(compare|claims?|which is right)\b/i,
    {
      category: "verification",
      confidence: 0.85,
      insight:
        "Before relying on either claim, check each source's publication date and author.",
      whyRelevant: "Comparison depends on source recency and credibility.",
    },
  ],
  [
    /\b(plan|schedule|steps)\b/i,
    {
      category: "missing_context",
      confidence: 0.85,
      insight:
        "Saying who the plan is for and any deadline lets me size the steps to fit.",
      whyRelevant: "Audience and timeframe were unstated.",
    },
  ],
];

export function fixtureDecision(userMessage: string): CoachingDecision {
  return FIXTURES.find(([pattern]) => pattern.test(userMessage))?.[1] ?? NONE;
}
