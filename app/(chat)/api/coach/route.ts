import { NONE } from "@/lib/reverse-alignment/fixtures";
import { observe } from "@/lib/reverse-alignment/observer";
import type { CoachResponse, Rubric } from "@/lib/reverse-alignment/types";

const SCORE_KEYS = [
  "task",
  "context",
  "success_criteria",
  "efficiency",
] as const;

/** Accept a rating only if it has the four scores, each 0-2 or null. */
function parseRating(value: unknown): Rubric | undefined {
  if (!value || typeof value !== "object") {
    return;
  }
  const record = value as Record<string, unknown>;
  const valid = SCORE_KEYS.every(
    (key) => record[key] === null || [0, 1, 2].includes(record[key] as number)
  );
  return valid ? ({ ...record, evidence: [] } as unknown as Rubric) : undefined;
}

// Best-effort, post-answer. Always 200 with a valid CoachResponse: a bad request or failure is just "no tip".
export async function POST(request: Request) {
  const silent: CoachResponse = {
    decision: NONE,
    isSensitive: false,
    isSimple: false,
    source: "fixture",
  };
  try {
    const body = await request.json();
    if (
      typeof body?.userMessage !== "string" ||
      typeof body?.assistantReply !== "string"
    ) {
      return Response.json(silent);
    }
    return Response.json(
      await observe({
        assistantReply: body.assistantReply,
        previousUserMessage:
          typeof body.previousUserMessage === "string"
            ? body.previousUserMessage
            : undefined,
        rating: parseRating(body.rating),
        userMessage: body.userMessage,
      })
    );
  } catch {
    return Response.json(silent);
  }
}
