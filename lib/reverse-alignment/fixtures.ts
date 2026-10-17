import { detectCorrection } from "./preference-detector";
import type { CoachingDecision, CoachRequest } from "./types";

// Deterministic checks that run before any model call, in mock AND real mode.
const SENSITIVE =
  /\b(suicid\w*|self[- ]harm|kill myself|overdose|abus\w*|emergency|crisis|panic attack)/i;
const ARITHMETIC = /^\s*(what(['’]?s| is)\s+)?[\d\s.%+\-*x×/÷()=]+\??\s*$/i;
const GREETING_OR_ACKNOWLEDGEMENT =
  /^(hi|hello|hey|thanks|thank you|thx|ok|okay|cool|great|nice|yes|no|sure|got it)( (there|a lot|so much|very much|again|all|everyone))?[!.\s]*$/i;
const ACTION_OR_QUESTION =
  /\b(explain|write|summari[sz]e|compare|fix|find|list|give|make|create|draft|how|what|why|can|could|should|is|are|do|does)\b/i;
const UNSEEN_MATERIAL =
  /\b(my|the|this) (code|error|script|function|policy|doc(ument)?)\b/i;
const EXPLICIT_SUCCESS_CRITERIA =
  // Narrow on purpose: a bare "for ..." also matches demo prompts like "asking for Friday off".
  /\b(\d+[ -]?words?|under \d+|(as|in) (a |an )?(table|list)|bullet points?|for (a |an )?(junior|senior|beginner|non-technical|technical) |tone|confident|not salesy|highlight|must pass|options? with trade-offs?)\b/i;

export function isSensitive(text: string) {
  return SENSITIVE.test(text);
}

export function isSimple(text: string) {
  return ARITHMETIC.test(text) || GREETING_OR_ACKNOWLEDGEMENT.test(text.trim());
}

export function isLongInput(text: string) {
  return text.length > 1500;
}

export const NONE: CoachingDecision = { category: "none", confidence: 1 };

const UNCLEAR_TASK: CoachingDecision = {
  category: "unclear_task",
  confidence: 0.9,
  insight:
    "Saying what you want done (explain, compare, write, fix) helps me pick the right kind of answer.",
  whyRelevant: "The request names a topic but not the task to perform.",
};

const MISSING_MATERIAL: CoachingDecision = {
  category: "missing_context",
  confidence: 0.9,
  insight:
    "Pasting the exact error and the code it points to lets me find the cause instead of guessing.",
  whyRelevant: "The request refers to material the assistant cannot see.",
};

const SUCCESS_CRITERIA: CoachingDecision = {
  category: "success_criteria",
  confidence: 0.9,
  insight:
    "If you tell me the format or length you want up front, the first answer is more likely to be usable.",
  whyRelevant: "The desired shape of a successful answer was unstated.",
};

const EFFICIENCY: CoachingDecision = {
  category: "efficiency",
  confidence: 0.85,
  insight:
    "Pasting just the relevant part and the question is usually enough, and I'll focus on the right part faster.",
  whyRelevant:
    "The input may include substantially more material than the task needs.",
};

// Scripted demo decisions. Always returned with source: "fixture".
const EXISTING_FIXTURES: [RegExp, CoachingDecision][] = [
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

function isTopicOnly(text: string) {
  const trimmed = text.trim().replace(/[.!?]+$/, "");
  return (
    trimmed.length > 0 &&
    trimmed.split(/\s+/).length <= 4 &&
    !ACTION_OR_QUESTION.test(trimmed)
  );
}

export function fixtureDecision(request: CoachRequest): CoachingDecision {
  const { userMessage, previousUserMessage } = request;
  if (previousUserMessage && detectCorrection(userMessage, true)) {
    return SUCCESS_CRITERIA;
  }
  if (UNSEEN_MATERIAL.test(userMessage) && !userMessage.includes("```")) {
    return MISSING_MATERIAL;
  }
  if (
    /\bcover letter\b/i.test(userMessage) &&
    !EXPLICIT_SUCCESS_CRITERIA.test(userMessage)
  ) {
    return SUCCESS_CRITERIA;
  }
  if (isLongInput(userMessage)) {
    return EFFICIENCY;
  }
  if (EXPLICIT_SUCCESS_CRITERIA.test(userMessage)) {
    return NONE;
  }
  if (isTopicOnly(userMessage)) {
    return UNCLEAR_TASK;
  }
  return (
    EXISTING_FIXTURES.find(([pattern]) => pattern.test(userMessage))?.[1] ??
    NONE
  );
}
