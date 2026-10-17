import {
  isSensitive,
  isSimple,
  isTopicOnly,
  UNSEEN_MATERIAL,
} from "./fixtures";

/**
 * Pre-send check for prompts too thin to answer well. Returns one clarifying question, or null.
 * Deterministic and narrow on purpose: a false positive in front of the user is worse than a miss.
 */
export function clarifyingQuestion(text: string): string | null {
  if (!text.trim() || isSimple(text) || isSensitive(text)) {
    return null;
  }
  if (UNSEEN_MATERIAL.test(text) && !text.includes("```")) {
    return "I can't see that yet. Can you paste the exact error and the code it points to?";
  }
  if (isTopicOnly(text)) {
    return "What would you like me to do with this: explain it, compare options, write something, or fix a problem?";
  }
  return null;
}
