import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  deleteCoachInsight,
  getChatById,
  getCoachInsightByMessageId,
  saveCoachInsight,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const decisionSchema = z.object({
  assumedDetail: z.string().optional(),
  category: z.enum([
    "unclear_task",
    "missing_context",
    "assumption",
    "success_criteria",
    "efficiency",
    "verification",
    "delegation",
    "none",
  ]),
  confidence: z.number().min(0).max(1),
  insight: z.string().max(180).optional(),
  whyRelevant: z.string().optional(),
});

const insightSchema = z.object({
  assistantMessageId: z.uuid(),
  chatId: z.uuid(),
  decision: decisionSchema,
  scripted: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = insightSchema.safeParse(body);
  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const chat = await getChatById({ id: parsed.data.chatId });
  if (!chat) {
    return new ChatbotError("not_found:chat").toResponse();
  }
  if (chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const [saved] = await saveCoachInsight(parsed.data);
  return Response.json(saved, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const assistantMessageId = new URL(request.url).searchParams.get(
    "assistantMessageId"
  );
  if (!assistantMessageId) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const insight = await getCoachInsightByMessageId({ assistantMessageId });
  if (!insight) {
    return new Response(null, { status: 204 });
  }
  const chat = await getChatById({ id: insight.chatId });
  if (!chat || chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  await deleteCoachInsight({ assistantMessageId });
  return new Response(null, { status: 204 });
}
