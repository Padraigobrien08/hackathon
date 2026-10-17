// Run: pnpm exec tsx --test lib/reverse-alignment/preference-detector.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCorrection, offerFor } from "./preference-detector";
import { coachReducer, INITIAL_STATE } from "./session-state";

test("detects 'shorter' style corrections on follow-ups only", () => {
  assert.equal(detectCorrection("shorter", true), "concise");
  assert.equal(
    detectCorrection("That's too long, cut it down", true),
    "concise"
  );
  assert.equal(detectCorrection("tl;dr please", true), "concise");
  assert.equal(detectCorrection("shorter", false), null);
  assert.equal(detectCorrection("Thanks, looks good", true), null);
});

test("offer only after two corrections", () => {
  const once = coachReducer(INITIAL_STATE, {
    kind: "concise",
    type: "CORRECTION_SEEN",
  });
  assert.equal(offerFor("concise", once.prefs, once.signals), null);
  const twice = coachReducer(once, {
    kind: "concise",
    type: "CORRECTION_SEEN",
  });
  assert.ok(offerFor("concise", twice.prefs, twice.signals));
});

test("accept remembers concise; no further offers; reset clears", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_ACCEPTED" });
  assert.equal(state.prefs.confirmedStyles.concise, true);
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  assert.equal(offerFor("concise", state.prefs, state.signals), null);
  state = coachReducer(state, { type: "RESET" });
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
});

test("decline restarts the count; forget turns the style off", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  state = coachReducer(state, { kind: "concise", type: "CORRECTION_SEEN" });
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_DECLINED" });
  assert.equal(state.signals.correctionCounts.concise, 0);
  assert.equal(offerFor("concise", state.prefs, state.signals), null);
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_ACCEPTED" });
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_CLEARED" });
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
});
