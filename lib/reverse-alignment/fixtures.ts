import { promptStrength } from "./strength";
import type { CoachingDecision, CoachResponse, Rubric } from "./types";

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

// Scripted demo decisions + rubrics. Always returned with source: "fixture".
// First match wins. Strength is derived from the rubric with the same rule as the LLM path.
const FIXTURES: [RegExp, CoachingDecision, Rubric][] = [
  [
    // Strong: a stated format/length constraint (e.g. "under 200 words", "3 bullets", "as a table").
    /\b(under \d+ words|\d+ (bullets?|options|words)|as a table|in a table)\b/i,
    NONE,
    {
      context: 2,
      efficiency: 2,
      evidence: [],
      success_criteria: 2,
      task: 2,
    },
  ],
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
    {
      context: 0,
      efficiency: 2,
      evidence: ["I had to guess the tone and the reason for the leave."],
      success_criteria: 1,
      task: 2,
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
    {
      context: 0,
      efficiency: 2,
      evidence: [
        "The claims weren't included, so I compared them in general terms.",
        "A factual comparison with no request to check the sources.",
      ],
      success_criteria: 0,
      task: 2,
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
    {
      context: 0,
      efficiency: 2,
      evidence: ["I had to guess the audience and the deadline."],
      success_criteria: 1,
      task: 2,
    },
  ],
];

/** Mock-mode coach result. No fixture match = no tip and no label (same as an unscored turn). */
export function fixtureResult(
  userMessage: string
): Pick<CoachResponse, "decision" | "rubric" | "strength"> {
  const match = FIXTURES.find(([pattern]) => pattern.test(userMessage));
  if (!match) {
    return { decision: NONE };
  }
  const [, decision, rubric] = match;
  return { decision, rubric, strength: promptStrength(rubric) };
}

export function fixtureDecision(userMessage: string): CoachingDecision {
  return fixtureResult(userMessage).decision;
}
