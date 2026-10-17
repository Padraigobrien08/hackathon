// Run: pnpm exec tsx --test lib/reverse-alignment/preference-detector.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type CorrectionKind,
  detectCorrection,
  offerFor,
} from "./preference-detector";
import { type CoachEvent, coachReducer, INITIAL_STATE } from "./session-state";

const seen = (kind: CorrectionKind, text = "shorter"): CoachEvent => ({
  at: 0,
  kind,
  text,
  type: "CORRECTION_SEEN",
});

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
  const once = coachReducer(INITIAL_STATE, seen("concise"));
  assert.equal(offerFor("concise", once.prefs, once.signals), null);
  const twice = coachReducer(once, seen("concise"));
  assert.ok(offerFor("concise", twice.prefs, twice.signals));
});

test("accept remembers concise; no further offers; reset clears", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, seen("concise"));
  state = coachReducer(state, seen("concise"));
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_ACCEPTED" });
  assert.equal(state.prefs.confirmedStyles.concise, true);
  state = coachReducer(state, seen("concise"));
  state = coachReducer(state, seen("concise"));
  assert.equal(offerFor("concise", state.prefs, state.signals), null);
  state = coachReducer(state, { type: "RESET" });
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
});

test("decline restarts the count; forget turns the style off", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, seen("concise"));
  state = coachReducer(state, seen("concise"));
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_DECLINED" });
  assert.equal(state.signals.correctionCounts.concise, 0);
  assert.equal(offerFor("concise", state.prefs, state.signals), null);
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_ACCEPTED" });
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_CLEARED" });
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
});

test("detects bullets, plain and code-only corrections", () => {
  assert.equal(
    detectCorrection("Can you do that as bullet points?", true),
    "bullets"
  );
  assert.equal(detectCorrection("put it in a list", true), "bullets");
  assert.equal(detectCorrection("less jargon please", true), "plain");
  assert.equal(detectCorrection("explain it simply", true), "plain");
  assert.equal(detectCorrection("just the code", true), "codeOnly");
  assert.equal(
    detectCorrection("just give me the code, shorter", true),
    "codeOnly"
  );
  assert.equal(detectCorrection("Explain how a mortgage works", true), null);
});

test("offer quotes the user's words; accept keeps them, forget drops them", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, seen("bullets", "as bullet points"));
  state = coachReducer(state, seen("bullets", "in a list please"));
  const offer = offerFor("bullets", state.prefs, state.signals);
  assert.deepEqual(offer?.evidence, ["as bullet points", "in a list please"]);
  state = coachReducer(state, { kind: "bullets", type: "PREFERENCE_ACCEPTED" });
  assert.equal(state.prefs.confirmedStyles.bullets, true);
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
  assert.equal(state.signals.correctionLog.bullets?.length, 2);
  state = coachReducer(state, { kind: "bullets", type: "PREFERENCE_CLEARED" });
  assert.equal(state.prefs.confirmedStyles.bullets, undefined);
  assert.equal(state.signals.correctionLog.bullets, undefined);
});

test("styles are independent", () => {
  let state = INITIAL_STATE;
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_ACCEPTED" });
  state = coachReducer(state, { kind: "plain", type: "PREFERENCE_ACCEPTED" });
  state = coachReducer(state, { kind: "concise", type: "PREFERENCE_CLEARED" });
  assert.equal(state.prefs.confirmedStyles.plain, true);
  assert.equal(state.prefs.confirmedStyles.concise, undefined);
});
