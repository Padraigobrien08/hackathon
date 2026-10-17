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

test("asks when the user points at text they didn't include", () => {
  assert.equal(
    clarifyingQuestion("Compare these two claims and tell me which is right"),
    "I can't see these two claims yet. Can you paste them into your message?"
  );
  assert.ok(clarifyingQuestion("Summarise this article for me"));
});

test("stays quiet when the referenced text is included or is to be written", () => {
  assert.equal(
    clarifyingQuestion(
      "Compare these two claims:\n1. Coffee dehydrates you.\n2. It doesn't."
    ),
    null
  );
  assert.equal(
    clarifyingQuestion(
      "Help me write this email to my manager asking for Friday off"
    ),
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
