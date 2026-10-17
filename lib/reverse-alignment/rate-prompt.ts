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
import type { RateRequest, RateResponse, Rubric } from "./types";

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
Be fair to short, clear requests: a specific one-line question is 2 on task. Score 0 only when the gap would clearly change the answer. Return only the scores.`;

const score = z.number().int().min(0).max(2).nullable();
// biome-ignore assist/source/useSortedKeys: same order as the rubric everywhere else.
const scoresSchema = z.object({
  task: score,
  context: score,
  success_criteria: score,
  efficiency: score,
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
    return rubric
      ? { rubric, source: "fixture", strength: promptStrength(rubric) }
      : { source: "fixture" };
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
    // Schema already limits each score to an integer 0-2 or null.
    const rubric = { ...output, evidence: [] } as Rubric;
    return { rubric, source: "llm", strength: promptStrength(rubric) };
  } catch (error) {
    console.warn("[rate] prompt rating failed, no tier:", error);
    return { source: "llm" };
  }
}
