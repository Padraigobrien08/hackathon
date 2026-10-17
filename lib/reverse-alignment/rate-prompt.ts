import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { useMock } from "@/lib/ai/providers";
import {
  fixtureDecision,
  fixtureRubric,
  isSensitive,
  isSimple,
} from "./fixtures";
import { promptStrength } from "./strength";
import type {
  PromptStrength,
  RateRequest,
  RateResponse,
  Rubric,
} from "./types";

const RATE_MODEL = "gpt-6-luna";
// Reasoning off: ~1.5s on our eval cases, as sensible as the post-answer coach. Runs alongside the answer.
const RATE_TIMEOUT_MS = 6000;
const MAX_PREVIOUS_MESSAGE_CHARS = 1000;

const RATE_PROMPT = `You rate a prompt someone is about to send to an AI assistant, before it answers. Score four dimensions, each 2 (clear), 1 (missing but probably harmless for this request), 0 (missing and the answer will have to guess or will likely miss what they want), or null (not applicable):
- task: says what to do (an action plus an object), with one main ask. A topic or noun phrase alone is 0.
- context: gives the audience, environment, goal, constraints, or the material the assistant would need. Referring to code, an error or a document that isn't pasted is 0.
- success_criteria: states format, length, detail level or definition of done where the request is open-ended. Simple factual questions don't need it (2 or null).
- efficiency: no repeated or contradictory instructions, no large irrelevant paste, one well-specified request.
If a previous message is given and the new one corrects the answer to it ("shorter", "no, I meant…", "simpler"), score the new message in that light: the criteria were missing from the previous request.
Be fair to short, clear requests: a specific one-line question is 2 on task. Score 0 only when the gap would clearly change the answer.
If any dimension is 0, also write question: ONE short, friendly question (max 120 characters) asking for the single most useful missing detail, specific to this prompt, e.g. "Who is the newsletter for, and how often should it go out?". Never mention scores or call the prompt weak. Otherwise question is null.`;

const MAX_QUESTION_CHARS = 160;

// Used when the model gives no question (and in mock mode): asks for the lowest-scored dimension.
const FALLBACK_QUESTIONS: Record<keyof Omit<Rubric, "evidence">, string> = {
  context:
    "Who is this for, and what should it help them do? Any details I can't see would help too.",
  efficiency: "Which part matters most, and what exactly should I do with it?",
  success_criteria:
    "What should a good answer look like: format, length, or level of detail?",
  task: "What would you like me to do with this: explain it, compare options, write something, or fix a problem?",
};

function questionFor(
  rubric: Rubric,
  strength: PromptStrength,
  modelQuestion?: string | null
) {
  if (strength !== "weak") {
    return;
  }
  const trimmed = modelQuestion?.trim();
  if (trimmed) {
    return trimmed.slice(0, MAX_QUESTION_CHARS);
  }
  const order = ["task", "context", "success_criteria", "efficiency"] as const;
  const weakest = order.find((key) => rubric[key] === 0) ?? "task";
  return FALLBACK_QUESTIONS[weakest];
}

const score = z.number().int().min(0).max(2).nullable();
// biome-ignore assist/source/useSortedKeys: same order as the rubric everywhere else.
const scoresSchema = z.object({
  task: score,
  context: score,
  success_criteria: score,
  efficiency: score,
  question: z.string().nullable(),
});

/** Never throws: any failure is "no tier". */
export async function ratePrompt({
  userMessage,
  previousUserMessage,
}: RateRequest): Promise<RateResponse> {
  if (isSimple(userMessage) || isSensitive(userMessage)) {
    return { source: "fixture" };
  }
  if (useMock) {
    const rubric = fixtureRubric(
      userMessage,
      fixtureDecision({ assistantReply: "", previousUserMessage, userMessage })
    );
    if (!rubric) {
      return { source: "fixture" };
    }
    const strength = promptStrength(rubric);
    return {
      question: questionFor(rubric, strength),
      rubric,
      source: "fixture",
      strength,
    };
  }
  try {
    const previous = previousUserMessage
      ? `<previous_user_message>\n${previousUserMessage.slice(0, MAX_PREVIOUS_MESSAGE_CHARS)}\n</previous_user_message>\n\n`
      : "";
    const { output } = await generateText({
      abortSignal: AbortSignal.timeout(RATE_TIMEOUT_MS),
      instructions: RATE_PROMPT,
      model: openai(RATE_MODEL),
      output: Output.object({ schema: scoresSchema }),
      prompt: `${previous}<user_request>\n${userMessage}\n</user_request>`,
      // forceReasoning: the SDK doesn't recognise gpt-6-luna as a reasoning model and would drop the effort.
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "none" },
      },
    });
    const { question, ...scores } = output;
    // Schema already limits each score to an integer 0-2 or null.
    const rubric = { ...scores, evidence: [] } as Rubric;
    const strength = promptStrength(rubric);
    return {
      question: questionFor(rubric, strength, question),
      rubric,
      source: "llm",
      strength,
    };
  } catch (error) {
    console.warn("[rate] prompt rating failed, no tier:", error);
    return { source: "llm" };
  }
}
