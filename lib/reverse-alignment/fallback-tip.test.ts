import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackTip } from "./fallback-tip";
import type { Rubric } from "./types";

const rubric = (scores: Partial<Rubric>): Rubric => ({
  context: 2,
  efficiency: 2,
  evidence: [],
  success_criteria: 2,
  task: 2,
  ...scores,
});

test("tips on the weakest dimension", () => {
  assert.equal(
    fallbackTip(rubric({ context: 1, success_criteria: 0 }), false).category,
    "success_criteria"
  );
  assert.equal(
    fallbackTip(rubric({ context: 1, success_criteria: 1 }), false).category,
    "missing_context"
  );
});

test("a blocked reply asks for the missing material", () => {
  const tip = fallbackTip(rubric({ context: 0 }), true);
  assert.ok(tip.insight?.includes("material you're referring to"));
});

test("fallback tips fit the 180-character save limit", () => {
  for (const d of [
    "task",
    "context",
    "success_criteria",
    "efficiency",
  ] as const) {
    const tip = fallbackTip(rubric({ [d]: 0 }), false);
    assert.ok((tip.insight ?? "").length <= 180, d);
  }
  assert.ok((fallbackTip(rubric({}), true).insight ?? "").length <= 180);
});
