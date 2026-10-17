import { countTokens } from "gpt-tokenizer";
import { auth } from "@/app/(auth)/auth";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { useMock } from "@/lib/ai/providers";
import {
  getChatById,
  getMessageById,
  getMessagesByChatId,
  recordPromptMetric,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { costOf, PRICING_MODEL } from "@/lib/reverse-alignment/pricing";

function textOf(dbMessage: DBMessage) {
  const parts = dbMessage.parts as { type: string; text?: string }[];
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

// Best-effort analytics after an answer finishes: never affects the chat. Returns 204 on any skip/failure.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(null, { status: 204 });
    }
    const body = await request.json();
    const { userMessageId, assistantMessageId, assistantReply } = body ?? {};
    // Optional until the worth-responding gate exists; anything else is ignored.
    const gateDecision =
      body?.gateDecision === "answered" || body?.gateDecision === "needs_more"
        ? (body.gateDecision as "answered" | "needs_more")
        : undefined;
    if (
      typeof userMessageId !== "string" ||
      typeof assistantMessageId !== "string" ||
      typeof assistantReply !== "string"
    ) {
      return new Response(null, { status: 204 });
    }

    // The chat route saves the user message before streaming, so it's in the DB by now.
    const [userMessage] = await getMessageById({ id: userMessageId });
    if (userMessage?.role !== "user") {
      return new Response(null, { status: 204 });
    }
    const chat = await getChatById({ id: userMessage.chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new Response(null, { status: 204 });
    }

    const history = (await getMessagesByChatId({ id: chat.id })).filter(
      (m) => m.createdAt < userMessage.createdAt
    );
    const prompt = textOf(userMessage);
    const promptTokens = countTokens(prompt);
    const historyTokens = history.reduce(
      (sum, m) => sum + countTokens(textOf(m)),
      0
    );
    const inputTokens = promptTokens + historyTokens;
    const outputTokens = countTokens(assistantReply);

    const [row] = await recordPromptMetric({
      answerModel: useMock ? "mock" : DEFAULT_CHAT_MODEL,
      assistantMessageId,
      chatId: chat.id,
      // Set here like Message_v2 does, so both tables use the same clock (DB now() is local time).
      createdAt: new Date(),
      gateDecision,
      historyTokens,
      inputTokens,
      outputTokens,
      pricingModel: PRICING_MODEL,
      prompt,
      promptTokens,
      userId: session.user.id,
      userMessageId,
      ...costOf({ inputTokens, outputTokens }),
    });
    return Response.json(row ?? null);
  } catch {
    return new Response(null, { status: 204 });
  }
}
