import assert from "node:assert/strict";
import { test } from "node:test";
import { clarifyingQuestion } from "./clarify";

test("asks when only a topic is given", () => {
  assert.ok(clarifyingQuestion("kubernetes networking"));
});

test("asks when the user refers to code we cannot see", () => {
  assert.ok(clarifyingQuestion("why does my code crash"));
  assert.equal(
    clarifyingQuestion("why does my code crash\n```js\nx()\n```"),
    null
  );
});

test("stays quiet on clear, simple, or sensitive prompts", () => {
  assert.equal(
    clarifyingQuestion("Explain how DNS works for a beginner"),
    null
  );
  assert.equal(clarifyingQuestion("thanks"), null);
  assert.equal(clarifyingQuestion("What's 8 × 9?"), null);
  assert.equal(clarifyingQuestion("panic attack"), null);
});
