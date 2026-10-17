const LEADING_FILLER =
  /^(?:please\s+|can you\s+|could you\s+|would you\s+|help me\s+|i need (?:you )?to\s+)+/i;
const TRAILING_CONNECTOR = /^(?:a|an|and|about|for|of|or|the|to|with)$/i;

/** A useful, stable title when the local mock model cannot generate one. */
export function conversationTitleFromText(input: string) {
  const normalized = input
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/[`*_#>]/g, " ")
    .replace(/[^\p{L}\p{N}+'’-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_FILLER, "");

  if (!normalized) {
    return "New Conversation";
  }
  if (/\bcompare\b/i.test(normalized) && /\bclaims?\b/i.test(normalized)) {
    return "Claim Comparison";
  }
  if (
    /\bcode\b/i.test(normalized) &&
    /\b(?:bug|debug|error|fix|wrong)\b/i.test(normalized)
  ) {
    return "Code Debugging";
  }

  const words = normalized.split(" ").slice(0, 5);
  while (words.length > 1 && TRAILING_CONNECTOR.test(words.at(-1) ?? "")) {
    words.pop();
  }

  return words
    .map((word, index) => {
      if (/^[A-Z\d]{2,}$/.test(word)) {
        return word;
      }
      if (index > 0 && TRAILING_CONNECTOR.test(word)) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
