import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { useMock } from "@/lib/ai/providers";
import { fixtureDecision, isSensitive, isSimple, NONE } from "./fixtures";
import type { CoachRequest, CoachResponse } from "./types";

// Small, fast model: this runs after every eligible answer.
const OBSERVER_MODEL = "claude-haiku-5-5";
const OBSERVER_TIMEOUT_MS = 6000;
const MAX_REPLY_CHARS = 4000;

const OBSERVER_PROMPT = `You are a nonjudgmental, passive collaboration coach. Assess whether one brief, specific insight would make the user's *future* AI interactions more effective. The assistant has already fulfilled the request. Do not critique the user, grade the prompt, or ask for a rewrite. Prefer "none". If a consequential assumption or verification gap is present, suggest one clear, optional insight of no more than 180 characters. Omit it if the assistant already handled the uncertainty or the insight would be generic. Never treat prompt length as competence.

Categories: missing_context (an unstated audience, format or constraint mattered), assumption (the answer rested on a consequential default; put it in assumedDetail), verification (a claim should be checked before relying on it), delegation (a step could be handed to the AI), none.
confidence is how sure you are the insight is useful (0-1), never a judgement of the user.`;

const decisionSchema = z.object({
  assumedDetail: z.string().optional(),
  category: z.enum([
    "missing_context",
    "assumption",
    "verification",
    "delegation",
    "none",
  ]),
  confidence: z.number().min(0).max(1),
  insight: z.string().optional(),
  whyRelevant: z.string().optional(),
});

/** Never throws: any failure is silence (category "none"). */
export async function observe({
  userMessage,
  assistantReply,
}: CoachRequest): Promise<CoachResponse> {
  const simple = isSimple(userMessage);
  const sensitive = isSensitive(userMessage);
  if (simple || sensitive) {
    return {
      decision: NONE,
      isSensitive: sensitive,
      isSimple: simple,
      source: "fixture",
    };
  }

  if (useMock) {
    return {
      decision: fixtureDecision(userMessage),
      isSensitive: false,
      isSimple: false,
      source: "fixture",
    };
  }

  try {
    const { output } = await generateText({
      abortSignal: AbortSignal.timeout(OBSERVER_TIMEOUT_MS),
      instructions: OBSERVER_PROMPT,
      model: anthropic(OBSERVER_MODEL),
      output: Output.object({ schema: decisionSchema }),
      prompt: `<user_request>\n${userMessage}\n</user_request>\n\n<assistant_answer>\n${assistantReply.slice(0, MAX_REPLY_CHARS)}\n</assistant_answer>`,
    });
    const decision = output.insight?.trim() ? output : NONE;
    return { decision, isSensitive: false, isSimple: false, source: "llm" };
  } catch (error) {
    console.warn("[coach] observer failed, staying silent:", error);
    return {
      decision: NONE,
      isSensitive: false,
      isSimple: false,
      source: "llm",
    };
  }
}
