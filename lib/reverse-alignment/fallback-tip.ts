import type { CoachingDecision, Rubric } from "./types";

// Used when the tier needs a reason but the model returned no tip: one line for the weakest dimension.
const FALLBACK_TIPS: Record<
  "task" | "context" | "success_criteria" | "efficiency",
  CoachingDecision
> = {
  context: {
    category: "missing_context",
    confidence: 0.8,
    insight:
      "Adding the key facts behind this (your goal, situation or constraints) lets me answer for your case instead of covering every case.",
  },
  efficiency: {
    category: "efficiency",
    confidence: 0.8,
    insight:
      "Pasting just the relevant part and the question is usually enough, and I'll focus on the right part faster.",
  },
  success_criteria: {
    category: "success_criteria",
    confidence: 0.8,
    insight:
      "If you tell me the format or length you want up front, the first answer is more likely to be usable.",
  },
  task: {
    category: "unclear_task",
    confidence: 0.8,
    insight:
      "Saying what you want done (explain, compare, write, fix) helps me pick the right kind of answer.",
  },
};

const BLOCKED_TIP: CoachingDecision = {
  category: "missing_context",
  confidence: 0.8,
  insight:
    "Including the material you're referring to in the same message lets me answer straight away instead of asking for it first.",
};

export function fallbackTip(
  rubric: Rubric,
  blocked: boolean
): CoachingDecision {
  if (blocked) {
    return BLOCKED_TIP;
  }
  const dimensions = [
    "task",
    "context",
    "success_criteria",
    "efficiency",
  ] as const;
  const weakest = dimensions.reduce((lowest, d) =>
    (rubric[d] ?? 2) < (rubric[lowest] ?? 2) ? d : lowest
  );
  return FALLBACK_TIPS[weakest];
}
