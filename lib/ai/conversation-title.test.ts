import assert from "node:assert/strict";
import { test } from "node:test";
import { conversationTitleFromText } from "./conversation-title";

test("labels comparison conversations", () => {
  assert.equal(
    conversationTitleFromText(
      "Compare these two claims and tell me which is right"
    ),
    "Claim Comparison"
  );
});

test("labels debugging conversations", () => {
  assert.equal(
    conversationTitleFromText("My code is wrong tell me whats wrong"),
    "Code Debugging"
  );
});

test("removes request filler and limits generic titles", () => {
  assert.equal(
    conversationTitleFromText(
      "Could you please explain photosynthesis to a beginner?"
    ),
    "Explain Photosynthesis to a Beginner"
  );
});

test("uses a safe title for empty input", () => {
  assert.equal(conversationTitleFromText("   "), "New Conversation");
});
