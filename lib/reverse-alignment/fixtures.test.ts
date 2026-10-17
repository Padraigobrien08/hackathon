import assert from "node:assert/strict";
import { test } from "node:test";
import { isSensitive } from "./fixtures";

test("sensitive: personal-safety wording is caught", () => {
  for (const text of [
    "I think I'm in crisis and don't know who to call",
    "my friend is having a mental health crisis",
    "this is an emergency, my dad collapsed",
    "is this a medical emergency?",
    "I keep having panic attacks",
    "I've been thinking about suicide",
  ]) {
    assert.equal(isSensitive(text), true, text);
  }
});

test("sensitive: ordinary uses of crisis/emergency are not", () => {
  for (const text of [
    "Summarise the causes of the 2008 financial crisis in under 150 words",
    "How big should my emergency fund be?",
    "Write a short brief on the climate crisis for a school newsletter",
  ]) {
    assert.equal(isSensitive(text), false, text);
  }
});
