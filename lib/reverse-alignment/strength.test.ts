import assert from "node:assert/strict";
import { test } from "node:test";
import { promptStrength } from "./strength";
import type { Rubric } from "./types";

const rubric = (scores: Partial<Rubric>): Rubric => ({
  context: 2,
  efficiency: 2,
  evidence: [],
  success_criteria: 2,
  task: 2,
  ...scores,
});

test("all clear is strong", () => {
  assert.equal(promptStrength(rubric({})), "strong");
});

test("any gap, even a harmless one, is moderate", () => {
  assert.equal(promptStrength(rubric({ success_criteria: 1 })), "moderate");
});

test("one gap that hurt the answer is moderate", () => {
  assert.equal(promptStrength(rubric({ context: 0 })), "moderate");
});

test("two harmless gaps are moderate", () => {
  assert.equal(
    promptStrength(rubric({ context: 1, success_criteria: 1 })),
    "moderate"
  );
});

test("no clear task is weak on its own", () => {
  assert.equal(promptStrength(rubric({ task: 0 })), "weak");
});

test("two gaps that hurt the answer are weak", () => {
  assert.equal(
    promptStrength(rubric({ context: 0, success_criteria: 0 })),
    "weak"
  );
});

test("a reply that had to ask for missing material makes the prompt weak", () => {
  // "Compare these two claims" with no claims: one fatal gap, otherwise "moderate".
  assert.equal(
    promptStrength(rubric({ context: 0 }), { blocked: true }),
    "weak"
  );
  assert.equal(promptStrength(rubric({}), { blocked: true }), "weak");
});

test("n/a dimensions are ignored", () => {
  assert.equal(promptStrength(rubric({ efficiency: null })), "strong");
});
