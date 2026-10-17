// Run: pnpm exec tsx --test lib/reverse-alignment/policy.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isSimple } from "./fixtures";
import { preGate, shouldShowTip } from "./policy";
import { coachReducer, INITIAL_STATE } from "./session-state";
import type { CoachingDecision } from "./types";

const tip: CoachingDecision = {
  category: "assumption",
  confidence: 0.9,
  insight: "I assumed a formal tone.",
};
const plain = { isSensitive: false, isSimple: false };
const { prefs, signals } = INITIAL_STATE;

test("no tip: trivial request", () => {
  assert.equal(isSimple("What's 8 × 9?"), true);
  assert.equal(isSimple("thanks"), true);
  assert.equal(isSimple("thanks a lot!"), true);
  assert.equal(isSimple("hello there"), true);
  assert.equal(isSimple("marketing plan"), false);
  assert.equal(
    shouldShowTip(tip, prefs, signals, { ...plain, isSimple: true }),
    false
  );
});

test("no tip: sensitive request", () => {
  assert.equal(
    shouldShowTip(tip, prefs, signals, { ...plain, isSensitive: true }),
    false
  );
});

test("no tip: observer says none or is unsure", () => {
  assert.equal(
    shouldShowTip({ category: "none", confidence: 1 }, prefs, signals, plain),
    false
  );
  assert.equal(
    shouldShowTip({ ...tip, confidence: 0.5 }, prefs, signals, plain),
    false
  );
});

test("one useful tip on the first eligible turn", () => {
  const s = coachReducer(INITIAL_STATE, {
    isSimple: false,
    type: "TURN_COMPLETED",
  });
  assert.equal(shouldShowTip(tip, s.prefs, s.signals, plain), true);
});

test("cooldown: at most one tip per three eligible turns", () => {
  let s = coachReducer(INITIAL_STATE, {
    category: "assumption",
    type: "TIP_SHOWN",
  });
  const shown: boolean[] = [];
  for (let turn = 0; turn < 6; turn += 1) {
    s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
    const show = preGate(s.prefs, s.signals);
    shown.push(show);
    if (show) {
      s = coachReducer(s, { category: "assumption", type: "TIP_SHOWN" });
    }
  }
  assert.deepEqual(shown, [false, false, true, false, false, true]);
});

test("simple turns do not count toward the cooldown", () => {
  const s = coachReducer(
    coachReducer(INITIAL_STATE, { category: "assumption", type: "TIP_SHOWN" }),
    { isSimple: true, type: "TURN_COMPLETED" }
  );
  assert.equal(s.signals.turnsSinceLastTip, 0);
});

test("dismiss: closing a tip delays the next one", () => {
  let s = coachReducer(INITIAL_STATE, {
    category: "assumption",
    type: "TIP_SHOWN",
  });
  s = coachReducer(s, {
    category: "assumption",
    kind: "dismiss",
    type: "TIP_DISMISSED",
  });
  for (let turn = 0; turn < 4; turn += 1) {
    s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
  }
  assert.equal(preGate(s.prefs, s.signals), false);
});

test("not this kind: that category is never shown again", () => {
  const s = coachReducer(INITIAL_STATE, {
    category: "assumption",
    kind: "not_this_kind",
    type: "TIP_DISMISSED",
  });
  assert.equal(shouldShowTip(tip, s.prefs, s.signals, plain), false);
  assert.equal(
    shouldShowTip(
      { ...tip, category: "verification" },
      s.prefs,
      s.signals,
      plain
    ),
    true
  );
});

test("coaching off / fewer tips take effect immediately", () => {
  const off = coachReducer(INITIAL_STATE, {
    enabled: false,
    type: "SET_ENABLED",
  });
  assert.equal(preGate(off.prefs, off.signals), false);
  const low = coachReducer(INITIAL_STATE, {
    frequency: "low",
    type: "SET_FREQUENCY",
  });
  assert.equal(preGate(low.prefs, low.signals), false); // needs 5 turns, starts at 3
});

test("demo override skips the cooldown but not the off switch", () => {
  const s = coachReducer(INITIAL_STATE, {
    category: "assumption",
    type: "TIP_SHOWN",
  });
  assert.equal(preGate(s.prefs, s.signals, { demo: true }), true);
  const off = coachReducer(s, { frequency: "off", type: "SET_FREQUENCY" });
  assert.equal(preGate(off.prefs, off.signals, { demo: true }), false);
});

test("reset clears signals and preferences", () => {
  let s = coachReducer(INITIAL_STATE, {
    frequency: "low",
    type: "SET_FREQUENCY",
  });
  s = coachReducer(s, {
    category: "assumption",
    kind: "not_this_kind",
    type: "TIP_DISMISSED",
  });
  assert.deepEqual(coachReducer(s, { type: "RESET" }), INITIAL_STATE);
});

test("show again: an un-hidden category can be shown", () => {
  let s = coachReducer(INITIAL_STATE, {
    category: "assumption",
    kind: "not_this_kind",
    type: "TIP_DISMISSED",
  });
  s = coachReducer(s, { category: "assumption", type: "UNDISMISS_CATEGORY" });
  assert.deepEqual(s.signals.dismissedCategories, []);
  s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
  assert.equal(shouldShowTip(tip, s.prefs, s.signals, plain), true);
});

test("fewer tips: five eligible turns between tips instead of three", () => {
  let s = coachReducer(INITIAL_STATE, {
    frequency: "low",
    type: "SET_FREQUENCY",
  });
  s = coachReducer(s, { category: "assumption", type: "TIP_SHOWN" });
  const shown: boolean[] = [];
  for (let turn = 0; turn < 5; turn += 1) {
    s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
    shown.push(preGate(s.prefs, s.signals));
  }
  assert.deepEqual(shown, [false, false, false, false, true]);
});

test("switching back to normal from off resumes tips", () => {
  let s = coachReducer(INITIAL_STATE, {
    frequency: "off",
    type: "SET_FREQUENCY",
  });
  s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
  assert.equal(preGate(s.prefs, s.signals), false);
  s = coachReducer(s, { frequency: "normal", type: "SET_FREQUENCY" });
  assert.equal(preGate(s.prefs, s.signals), true);
});

test("assumption tips can be switched off on their own", () => {
  let s = coachReducer(INITIAL_STATE, {
    showAssumptions: false,
    type: "SET_SHOW_ASSUMPTIONS",
  });
  s = coachReducer(s, { isSimple: false, type: "TURN_COMPLETED" });
  assert.equal(shouldShowTip(tip, s.prefs, s.signals, plain), false);
  assert.equal(
    shouldShowTip(
      { ...tip, category: "verification" },
      s.prefs,
      s.signals,
      plain
    ),
    true
  );
});
