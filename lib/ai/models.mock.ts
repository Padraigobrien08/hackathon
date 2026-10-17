import type { LanguageModel } from "ai";
import { detectCorrection } from "@/lib/reverse-alignment/preference-detector";
import { STYLE_KINDS, type StyleKind } from "@/lib/reverse-alignment/types";
import { STYLE_PROMPTS } from "./prompts";

const EXPLAIN_LONG =
  "A mortgage is a secured loan where the property acts as collateral. You borrow the purchase price minus your deposit, and repay principal plus interest over a fixed term, usually 25–35 years. The loan-to-value (LTV) ratio sets your rate band: a lower LTV usually gets a better rate. Rates are either fixed for an initial period or variable, tracking the lender's standard variable rate or a base rate. Early on, most of each payment is interest; amortisation shifts that towards principal over time. If you stop paying, the lender can repossess the property.";
const EXPLAIN_BULLETS =
  "- **What it is:** a loan to buy a home, secured on the home itself.\n- **How much:** the price minus your deposit.\n- **Repaying:** monthly payments of loan plus interest over 25–35 years.\n- **Your rate:** a bigger deposit usually means a lower rate. Fixed rates stay put for a few years; variable ones move.\n- **Risk:** if you stop paying, the lender can take the home.";
const EXPLAIN_PLAIN =
  "A mortgage is a big loan to buy a home. You pay part of the price up front (the deposit) and borrow the rest. Then you pay the bank back every month, with a bit extra on top (interest), for around 25 to 35 years. Put down more at the start and the bank usually charges you less. If you stop paying, the bank can take the home back.";
const CODE_LONG =
  'Here\'s a function that checks whether a word is a palindrome. It lowercases the text and strips anything that isn\'t a letter, so "Racecar" and "A man, a plan" both work. Then it compares the cleaned string with its reverse.\n\n```python\ndef is_palindrome(text: str) -> bool:\n    cleaned = "".join(c for c in text.lower() if c.isalnum())\n    return cleaned == cleaned[::-1]\n```\n\nSlicing with `[::-1]` reverses the string. It runs in linear time, which is fine for anything you\'d type.';
const CODE_ONLY =
  '```python\ndef is_palindrome(text: str) -> bool:\n    cleaned = "".join(c for c in text.lower() if c.isalnum())\n    return cleaned == cleaned[::-1]\n```';

const mockResponses: Record<string, string> = {
  bullets: `Sure, as bullet points:\n\n${EXPLAIN_BULLETS}`,
  code: CODE_LONG,
  codeOnly: CODE_ONLY,
  compare:
    "Happy to compare them. Paste the two claims and I'll check each one against what's known, say which is better supported, and note anything that can't be verified.",
  default: "This is a mock response for testing.",
  email:
    "Here's a short draft:\n\n**Subject:** Request for Friday off\n\nHi [Manager's name],\n\nI'd like to request this Friday, [date], off as a day of leave. My current work is on track, and I'll make sure anything urgent is handed over before then.\n\nPlease let me know if that works.\n\nThanks,\n[Your name]",
  explain: EXPLAIN_LONG,
  greeting: "Hello! How can I help you today?",
  math: "8 × 9 = 72.",
  newsletter:
    "Here's a simple launch plan:\n\n1. **Goal and audience:** decide who it's for and what they should get from it.\n2. **Format:** pick a cadence (e.g. fortnightly) and 3–4 recurring sections.\n3. **First issue:** gather content a week ahead and get one person to review it.\n4. **Launch:** announce it in your team channel and ask for feedback after issue one.\n5. **Iterate:** check open rates and replies after three issues and adjust.",
  plain: `In plain terms: ${EXPLAIN_PLAIN}`,
  shorter:
    "Sure, shorter: **Subject:** Friday off. Hi [Manager's name], could I take this Friday, [date], off? Work is on track and I'll hand over anything urgent. Thanks, [Your name]",
  weather: "The weather in San Francisco is sunny and 72°F.",
};

// What the mock says when the user approved a style (the system prompt carries that style's STYLE_PROMPTS text).
// The first approved style with a reply for the request wins.
const conciseResponses: Record<string, string> = {
  compare:
    "Paste the two claims and I'll say which is better supported, and what can't be verified.",
  email:
    "**Subject:** Friday off. Hi [Manager's name], could I take this Friday, [date], off? Work is on track and I'll hand over anything urgent. Thanks, [Your name]",
  newsletter:
    "Pick your audience and a fortnightly cadence, draft issue one a week early, and announce it in your team channel. Review what's working after three issues.",
};

const styledResponses: Record<StyleKind, Record<string, string>> = {
  bullets: {
    compare:
      "- Paste the two claims.\n- I'll check each against what's known.\n- I'll say which is better supported and what can't be verified.",
    explain: EXPLAIN_BULLETS,
  },
  codeOnly: { code: CODE_ONLY },
  concise: {
    ...conciseResponses,
    code: CODE_ONLY,
    explain:
      "A mortgage is a loan to buy a home, secured on the home and repaid monthly with interest over 25–35 years.",
  },
  plain: { explain: EXPLAIN_PLAIN },
};

function approvedStyles(prompt: unknown): StyleKind[] {
  if (!Array.isArray(prompt)) {
    return [];
  }
  const system = prompt
    .filter((message: { role?: string }) => message?.role === "system")
    .map((message: { content?: unknown }) => String(message.content))
    .join("\n");
  return STYLE_KINDS.filter((kind) => system.includes(STYLE_PROMPTS[kind]));
}
const mockUsage = {
  inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 10, total: 10 },
  outputTokens: { reasoning: 0, text: 20, total: 20 },
};

/** Text of the last user message only: the system prompt and history would match every keyword. */
function lastUserText(prompt: unknown): string {
  if (!Array.isArray(prompt)) {
    return JSON.stringify(prompt);
  }
  const last = prompt.findLast(
    (message: { role?: string }) => message?.role === "user"
  );
  const content = last?.content;
  if (!Array.isArray(content)) {
    return String(content ?? "");
  }
  return content.map((part: { text?: string }) => part?.text ?? "").join(" ");
}

function getResponseForPrompt(prompt: unknown): string {
  const key = getResponseKey(lastUserText(prompt).toLowerCase());
  const styled = approvedStyles(prompt)
    .map((kind) => styledResponses[kind][key])
    .find(Boolean);
  return styled ?? mockResponses[key];
}

function getResponseKey(promptStr: string): string {
  // Corrections ("shorter", "as bullet points", ...) get a canned redo, as in the demo script.
  const correction = detectCorrection(promptStr, true);
  if (correction) {
    return correction === "concise" ? "shorter" : correction;
  }

  if (promptStr.includes("weather") || promptStr.includes("temperature")) {
    return "weather";
  }
  if (promptStr.includes("email") || promptStr.includes("friday off")) {
    return "email";
  }
  if (promptStr.includes("compare") || promptStr.includes("claims")) {
    return "compare";
  }
  if (promptStr.includes("newsletter") || promptStr.includes("plan")) {
    return "newsletter";
  }
  if (/\b(python|function|code|script)\b/.test(promptStr)) {
    return "code";
  }
  if (promptStr.includes("mortgage") || promptStr.includes("explain")) {
    return "explain";
  }
  if (/8\s*[×x*]\s*9/.test(promptStr)) {
    return "math";
  }
  if (/\b(hello|hi|hey)\b/.test(promptStr)) {
    return "greeting";
  }

  return "default";
}

const createMockModel = (): LanguageModel =>
  ({
    defaultObjectGenerationMode: "tool",
    doGenerate: async ({ prompt }: { prompt: unknown }) => ({
      content: [{ text: getResponseForPrompt(prompt), type: "text" }],
      finishReason: "stop",
      usage: mockUsage,
      warnings: [],
    }),
    doStream: ({ prompt }: { prompt: unknown }) => {
      const response = getResponseForPrompt(prompt);
      const words = response.split(" ");

      return {
        stream: new ReadableStream({
          async start(controller) {
            controller.enqueue({ id: "t1", type: "text-start" });
            await words.reduce<Promise<void>>(async (previous, word) => {
              await previous;
              controller.enqueue({
                delta: `${word} `,
                id: "t1",
                type: "text-delta",
              });
              await new Promise((resolve) => {
                setTimeout(resolve, 10);
              });
            }, Promise.resolve());
            controller.enqueue({ id: "t1", type: "text-end" });
            controller.enqueue({
              finishReason: "stop",
              type: "finish",
              usage: mockUsage,
            });
            controller.close();
          },
        }),
      };
    },
    modelId: "mock-model",
    provider: "mock",
    specificationVersion: "v3",
    supportedUrls: {},
  }) as unknown as LanguageModel;

const createMockTitleModel = (): LanguageModel =>
  ({
    defaultObjectGenerationMode: "tool",
    doGenerate: async () => ({
      content: [{ text: "Test Conversation", type: "text" }],
      finishReason: "stop",
      usage: {
        inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 5, total: 5 },
        outputTokens: { reasoning: 0, text: 5, total: 5 },
      },
      warnings: [],
    }),
    doStream: () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ id: "t1", type: "text-start" });
          controller.enqueue({
            delta: "Test Conversation",
            id: "t1",
            type: "text-delta",
          });
          controller.enqueue({ id: "t1", type: "text-end" });
          controller.enqueue({
            finishReason: "stop",
            type: "finish",
            usage: {
              inputTokens: {
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 5,
                total: 5,
              },
              outputTokens: { reasoning: 0, text: 5, total: 5 },
            },
          });
          controller.close();
        },
      }),
    }),
    modelId: "mock-title-model",
    provider: "mock",
    specificationVersion: "v3",
    supportedUrls: {},
  }) as unknown as LanguageModel;

export const chatModel = createMockModel();
export const titleModel = createMockTitleModel();
