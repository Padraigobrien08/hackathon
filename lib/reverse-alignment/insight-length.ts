// /api/coach/insights rejects longer tips, and a tip is only shown once it's saved.
export const MAX_INSIGHT_CHARS = 180;

/** The model is asked for <= 180 chars but doesn't always comply: cut at a word boundary. */
export function clampInsight(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_INSIGHT_CHARS) {
    return trimmed;
  }
  const cut = trimmed.slice(0, MAX_INSIGHT_CHARS - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}
