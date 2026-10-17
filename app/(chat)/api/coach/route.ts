import { NONE } from "@/lib/reverse-alignment/fixtures";
import { observe } from "@/lib/reverse-alignment/observer";
import type { CoachResponse } from "@/lib/reverse-alignment/types";

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
      await observe(
        {
          assistantReply: body.assistantReply,
          previousUserMessage:
            typeof body.previousUserMessage === "string"
              ? body.previousUserMessage
              : undefined,
          userMessage: body.userMessage,
        },
        { live: body.live === true }
      )
    );
  } catch {
    return Response.json(silent);
  }
}
