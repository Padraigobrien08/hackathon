import { ratePrompt } from "@/lib/reverse-alignment/rate-prompt";
import type { RateResponse } from "@/lib/reverse-alignment/types";

// Best-effort, sent alongside the chat request. Always 200: a bad request or failure is just "no tier".
export async function POST(request: Request) {
  const none: RateResponse = { source: "fixture" };
  try {
    const body = await request.json();
    if (typeof body?.userMessage !== "string") {
      return Response.json(none);
    }
    return Response.json(
      await ratePrompt({
        previousUserMessage:
          typeof body.previousUserMessage === "string"
            ? body.previousUserMessage
            : undefined,
        userMessage: body.userMessage,
      })
    );
  } catch {
    return Response.json(none);
  }
}
