import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { useMock } from "@/lib/ai/providers";
import {
  fixtureDecision,
  fixtureRubric,
  isLongInput,
  isSensitive,
  isSimple,
  NONE,
} from "./fixtures";
import { clampInsight } from "./insight-length";
import { promptStrength } from "./strength";
import type {
  CoachingDecision,
  CoachRequest,
  CoachResponse,
  Rubric,
} from "./types";

// Small, fast model: this runs after every eligible answer.
const OBSERVER_MODEL = "gpt-6-luna"; // needs OPENAI_API_KEY
const OBSERVER_TIMEOUT_MS = 12_000; // real calls take 5-7s; this runs after the answer, so it never delays it
const MAX_REPLY_CHARS = 4000;
const MAX_PREVIOUS_MESSAGE_CHARS = 1000;

const OBSERVER_PROMPT = `You are a nonjudgmental, passive collaboration coach. The assistant has already answered. Decide whether one brief, specific insight would clearly improve the user's future AI interactions. Prefer "none". In the insight, never critique or grade the user, call a prompt weak, ask for a rewrite, or treat prompt length as competence. If useful, return one optional insight of at most 180 characters that is specific to this request, never generic advice. Confidence is how sure the tip is useful (0-1), never a judgement of the user.

Use these principles:
1. Define the task — unclear_task. Missing when the request is only a topic/noun phrase, the desired action or output type is unclear, or several asks have no main one. Tip style: say that an action such as explain, compare, write, or fix helps select the right answer.
2. Provide relevant context — missing_context or assumption. Missing when the answer had to guess audience, environment, version, goal, or constraints; the user refers to unseen code/error/policy; debugging lacks the exact error or reproduction; or the answer must hedge across cases. Tip style: name the consequential missing fact or assumption and how providing it saves a round trip.
3. Define success criteria — success_criteria. Missing when an open-ended ask gives no format, length, detail level, audience, or definition of done; high-stakes output lacks verification criteria; or a follow-up correction such as “shorter”, “no, I meant…”, or “simpler” reveals criteria omitted from the previous request. Tip style: say that stating format or length up front makes the first answer more usable.
4. Efficiency — efficiency. Missing when instructions repeat, a large paste is mostly irrelevant, or fragmented follow-ups could have been one well-specified request. Do not tip on politeness or filler alone. Tip style: suggest including only the relevant function/error/context and a clear question.

Other categories: verification when a consequential claim should be checked before relying on it; delegation when a useful step could be handed to the AI; none when no tip is warranted.

Stay silent with category "none" when the request is simple or conversational; the answer was good anyway and the missing detail did not hurt it; the topic is sensitive, personal, health-related, or emotional; the same category was recently shown or dismissed; confidence is low; or the only possible advice is generic. A wrong tip is worse than no tip.

Before choosing a tip, score the user's prompt in rubric on four dimensions, each 2 (clear), 1 (missing but the answer was fine anyway), 0 (missing AND it visibly hurt the answer), or null (not applicable): task (principle 1), context (principle 2), success_criteria (principle 3), efficiency (principle 4). A 0 needs evidence from the answer: hedging across cases, a consequential guess, padding, or a mismatch with what the user clearly wanted. Put one short phrase per 0 in evidence; if you can't point to evidence, score 1. A tip is REQUIRED when any dimension scores 0 or 1: write it for the lowest-scored dimension, even if the topic is personal (the stay-silent rules above don't apply then). Otherwise prefer none. Score simple, casual exchanges fairly: a clear one-line request is 2 on task.

Set answerBlocked to true only when the assistant could not attempt the task at all and its reply mainly asks the user for material they referred to but did not include (e.g. "these claims", "my code", "the article"). If it answered, even partially or with stated assumptions, set it to false.`;

const score = z.number().int().min(0).max(2).nullable();

// OpenAI strict JSON mode needs every key present, so optional fields are nullable here
// and nulls are dropped before the decision leaves this file.
// biome-ignore assist/source/useSortedKeys: rubric must come first so the model scores before it writes a tip.
const decisionSchema = z.object({
  // biome-ignore assist/source/useSortedKeys: scores first, then the evidence for any 0.
  rubric: z.object({
    task: score,
    context: score,
    success_criteria: score,
    efficiency: score,
    evidence: z.array(z.string()),
  }),
  answerBlocked: z.boolean(),
  assumedDetail: z.string().nullable(),
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
  insight: z.string().nullable(),
  whyRelevant: z.string().nullable(),
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
    const decision = fixtureDecision({
      assistantReply,
      previousUserMessage,
      userMessage,
    });
    const rubric = fixtureRubric(userMessage, decision);
    return {
      decision,
      isSensitive: false,
      isSimple: false,
      rubric,
      source: "fixture",
      strength: rubric ? promptStrength(rubric) : undefined,
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
      model: openai(OBSERVER_MODEL),
      output: Output.object({ schema: decisionSchema }),
      prompt: `${previous}<user_request>\n${userMessage}\n</user_request>\n\n<assistant_answer>\n${assistantReply.slice(0, MAX_REPLY_CHARS)}\n</assistant_answer>${lengthHint}`,
      // "low" instead of the default "medium": ~1s faster with tiers as sensible on our eval cases.
      // "none" was 2x faster but rated strong prompts moderate. forceReasoning: the SDK would drop it otherwise.
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low" },
      },
    });
    // Schema already limits each score to an integer 0-2 or null.
    const rubric = output.rubric as Rubric;
    const strength = promptStrength(rubric, { blocked: output.answerBlocked });
    // The model is told a weak/moderate tier requires a tip; strong never gets one, so the two can't contradict.
    // If it returns none anyway, show no tip rather than a canned one.
    const decision: CoachingDecision =
      strength !== "strong" &&
      output.category !== "none" &&
      output.insight?.trim()
        ? {
            assumedDetail: output.assumedDetail ?? undefined,
            category: output.category,
            confidence: output.confidence,
            insight: clampInsight(output.insight),
            whyRelevant: output.whyRelevant ?? undefined,
          }
        : NONE;
    return {
      decision,
      isSensitive: false,
      isSimple: false,
      rubric,
      source: "llm",
      strength,
    };
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
