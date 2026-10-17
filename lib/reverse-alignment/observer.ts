import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { useMock } from "@/lib/ai/providers";
import { fixtureResult, isSensitive, isSimple, NONE } from "./fixtures";
import { promptStrength } from "./strength";
import type {
  CoachingDecision,
  CoachRequest,
  CoachResponse,
  Rubric,
} from "./types";

// Small, fast model: this runs after every eligible answer.
const OBSERVER_MODEL = "gpt-6-luna"; // needs OPENAI_API_KEY
const OBSERVER_TIMEOUT_MS = 8000;
// Hedging/guessing shows early in a reply; a shorter slice keeps the call fast.
const MAX_REPLY_CHARS = 1500;

// Rubric spec: prompt_eval/Rubric.md (§1 dimensions, §5 this prompt).
const OBSERVER_PROMPT = `You review one exchange between a user and an AI assistant. The assistant has already answered. Decide whether ONE short, optional tip would help the user get a better first answer next time. Prefer saying nothing.

First score the user's prompt on four dimensions, each 2 (clear), 1 (missing but the answer was fine anyway), 0 (missing AND it visibly hurt the answer), or null (not applicable):
- task: does it say what to do (an action plus an object), with one main ask?
- context: did the assistant have to guess the audience, environment, version, goal, or material it couldn't see?
- success_criteria: is the format, length or definition of done stated? For high-stakes output (code to run, legal, medical, facts to cite), is a check requested?
- efficiency: are there repeated or contradictory instructions, a large irrelevant paste, or filler that changes nothing?

A 0 needs evidence from the answer: hedging across cases, a consequential guess, padding, or a mismatch with what the user clearly wanted. Put one short phrase per 0 in evidence. If you can't point to evidence, score 1.

Then pick at most one tip, only for a dimension scored 0, choosing the gap whose fix would have changed the answer most. Write it as the assistant speaking to the user ("I assumed…", "If you share…, I can…"), never in the user's voice, under 180 characters, forward-looking, specific to this prompt (say what you assumed or what was missing). Never grade, never ask for a rewrite, never comment on length or politeness alone. If the topic is sensitive, the exchange is casual, or you are unsure, use category "none" and no insight.

category: missing_context (task, context or format was missing), assumption (the answer rested on a consequential guess; put it in assumedDetail), verification (high-stakes output or a claim to check before relying on it), delegation (a step could be handed to the AI), none.
whyRelevant: one short internal sentence on why the tip matters here.
confidence is how sure you are that the tip is useful (0-1), never a judgement of the user.`;

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
  assumedDetail: z.string().nullable(),
  category: z.enum([
    "missing_context",
    "assumption",
    "verification",
    "delegation",
    "none",
  ]),
  confidence: z.number().min(0).max(1),
  insight: z.string().nullable(),
  whyRelevant: z.string().nullable(),
});

/** One LLM call. Throws on failure; observe() turns that into silence. */
export async function assess({ userMessage, assistantReply }: CoachRequest) {
  const { output } = await generateText({
    abortSignal: AbortSignal.timeout(OBSERVER_TIMEOUT_MS),
    instructions: OBSERVER_PROMPT,
    model: openai(OBSERVER_MODEL),
    output: Output.object({ schema: decisionSchema }),
    prompt: `<user_request>\n${userMessage}\n</user_request>\n\n<assistant_answer>\n${assistantReply.slice(0, MAX_REPLY_CHARS)}\n</assistant_answer>`,
  });
  // Schema already limits each score to an integer 0-2 or null.
  const rubric = output.rubric as Rubric;
  // Rubric.md §2: a tip needs a dimension scored 0. Enforced here, not left to the model.
  const hasGap = [
    rubric.task,
    rubric.context,
    rubric.success_criteria,
    rubric.efficiency,
  ].includes(0);
  const decision: CoachingDecision =
    hasGap && output.category !== "none" && output.insight?.trim()
      ? {
          assumedDetail: output.assumedDetail ?? undefined,
          category: output.category,
          confidence: output.confidence,
          insight: output.insight,
          whyRelevant: output.whyRelevant ?? undefined,
        }
      : NONE;
  return { decision, rubric, strength: promptStrength(rubric) };
}

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
      ...fixtureResult(userMessage),
      isSensitive: false,
      isSimple: false,
      source: "fixture",
    };
  }

  try {
    const { decision, rubric, strength } = await assess({
      assistantReply,
      userMessage,
    });
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
