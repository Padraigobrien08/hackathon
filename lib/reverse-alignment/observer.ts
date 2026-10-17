import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { useMock } from "@/lib/ai/providers";
import {
  fixtureDecision,
  isLongInput,
  isSensitive,
  isSimple,
  NONE,
} from "./fixtures";
import type { CoachRequest, CoachResponse } from "./types";

// Small, fast model: this runs after every eligible answer.
const OBSERVER_MODEL = "claude-haiku-5-5";
const OBSERVER_TIMEOUT_MS = 6000;
const MAX_REPLY_CHARS = 4000;
const MAX_PREVIOUS_MESSAGE_CHARS = 1000;

const OBSERVER_PROMPT = `You are a nonjudgmental, passive collaboration coach. The assistant has already answered. Decide whether one brief, specific insight would clearly improve the user's future AI interactions. Prefer "none". Never critique or grade the user, call a prompt weak, ask for a rewrite, or treat prompt length as competence. If useful, return one optional insight of at most 180 characters that is specific to this request, never generic advice. Confidence is how sure the tip is useful (0-1), never a judgement of the user.

Use these principles:
1. Define the task — unclear_task. Missing when the request is only a topic/noun phrase, the desired action or output type is unclear, or several asks have no main one. Tip style: say that an action such as explain, compare, write, or fix helps select the right answer.
2. Provide relevant context — missing_context or assumption. Missing when the answer had to guess audience, environment, version, goal, or constraints; the user refers to unseen code/error/policy; debugging lacks the exact error or reproduction; or the answer must hedge across cases. Tip style: name the consequential missing fact or assumption and how providing it saves a round trip.
3. Define success criteria — success_criteria. Missing when an open-ended ask gives no format, length, detail level, audience, or definition of done; high-stakes output lacks verification criteria; or a follow-up correction such as “shorter”, “no, I meant…”, or “simpler” reveals criteria omitted from the previous request. Tip style: say that stating format or length up front makes the first answer more usable.
4. Efficiency — efficiency. Missing when instructions repeat, a large paste is mostly irrelevant, or fragmented follow-ups could have been one well-specified request. Do not tip on politeness or filler alone. Tip style: suggest including only the relevant function/error/context and a clear question.

Other categories: verification when a consequential claim should be checked before relying on it; delegation when a useful step could be handed to the AI; none when no tip is warranted.

Stay silent with category "none" when the request is simple or conversational; the answer was good anyway and the missing detail did not hurt it; the topic is sensitive, personal, health-related, or emotional; the same category was recently shown or dismissed; confidence is low; or the only possible advice is generic. A wrong tip is worse than no tip.`;

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
  insight: z.string().optional(),
  whyRelevant: z.string().optional(),
});

/** Never throws: any failure is silence (category "none"). */
export async function observe({
  userMessage,
  assistantReply,
  previousUserMessage,
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
      decision: fixtureDecision({
        assistantReply,
        previousUserMessage,
        userMessage,
      }),
      isSensitive: false,
      isSimple: false,
      source: "fixture",
    };
  }

  try {
    const previous = previousUserMessage
      ? `<previous_user_message>\n${previousUserMessage.slice(0, MAX_PREVIOUS_MESSAGE_CHARS)}\n</previous_user_message>\n\n`
      : "";
    const lengthHint = isLongInput(userMessage)
      ? `\n\nThe user's message is long (${userMessage.length} characters); consider whether most of it is relevant (efficiency).`
      : "";
    const { output } = await generateText({
      abortSignal: AbortSignal.timeout(OBSERVER_TIMEOUT_MS),
      instructions: OBSERVER_PROMPT,
      model: anthropic(OBSERVER_MODEL),
      output: Output.object({ schema: decisionSchema }),
      prompt: `${previous}<user_request>\n${userMessage}\n</user_request>\n\n<assistant_answer>\n${assistantReply.slice(0, MAX_REPLY_CHARS)}\n</assistant_answer>${lengthHint}`,
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
