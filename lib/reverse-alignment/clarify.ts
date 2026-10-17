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
// "Compare these two claims", "summarise this article": text the user points at but didn't include.
// No "email"/"letter": "write this email" asks us to create it, not read it.
const REFERENCED_TEXT =
  /\b(these|those|this|both|the following|the attached|the above)\s+(two\s+|2\s+|three\s+)?(claims?|statements?|articles?|passages?|paragraphs?|quotes?|sources?|texts?|links?|screenshots?|images?|files?)\b/i;
// Long or multi-line messages probably include the material already.
const MAX_REFERENCE_ONLY_CHARS = 200;

export function clarifyingQuestion(text: string): string | null {
  if (!text.trim() || isSimple(text) || isSensitive(text)) {
    return null;
  }
  if (UNSEEN_MATERIAL.test(text) && !text.includes("```")) {
    return "I can't see that yet. Can you paste the exact error and the code it points to?";
  }
  const referenced = text.match(REFERENCED_TEXT);
  if (
    referenced &&
    text.length <= MAX_REFERENCE_ONLY_CHARS &&
    !text.includes("\n")
  ) {
    return `I can't see ${referenced[1].toLowerCase()} ${referenced[2] ?? ""}${referenced[3].toLowerCase()} yet. Can you paste them into your message?`;
  }
  if (isTopicOnly(text)) {
    return "What would you like me to do with this: explain it, compare options, write something, or fix a problem?";
  }
  return null;
}
