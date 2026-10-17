import assert from "node:assert/strict";
import { test } from "node:test";
import { clampInsight, MAX_INSIGHT_CHARS } from "./insight-length";

test("leaves short tips alone", () => {
  assert.equal(clampInsight("  Say who it's for.  "), "Say who it's for.");
});

test("cuts long tips at a word boundary within the save limit", () => {
  const long = `${"Sharing the audience and deadline helps ".repeat(8)}end`;
  const clamped = clampInsight(long);
  assert.ok(clamped.length <= MAX_INSIGHT_CHARS);
  assert.ok(clamped.endsWith("…"));
  assert.ok(!clamped.includes("  "));
});
