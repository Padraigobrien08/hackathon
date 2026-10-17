import type { PromptStrength, Rubric } from "./types";

/** Derived in code so the same scores always give the same tier. Shared by the observer and fixtures. */
export function promptStrength(rubric: Rubric): PromptStrength {
  const scores = [
    rubric.task,
    rubric.context,
    rubric.success_criteria,
    rubric.efficiency,
  ].filter((s) => s !== null);
  const zeros = scores.filter((s) => s === 0).length;
  const ones = scores.filter((s) => s === 1).length;
  if (zeros >= 2 || rubric.task === 0) {
    return "weak";
  }
  if (zeros === 1 || ones >= 2) {
    return "moderate";
  }
  return "strong";
}
