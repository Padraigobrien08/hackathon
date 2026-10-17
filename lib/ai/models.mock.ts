import type { LanguageModel } from "ai";

const mockResponses: Record<string, string> = {
  compare:
    "Happy to compare them. Paste the two claims and I'll check each one against what's known, say which is better supported, and note anything that can't be verified.",
  default: "This is a mock response for testing.",
  email:
    "Here's a short draft:\n\n**Subject:** Request for Friday off\n\nHi [Manager's name],\n\nI'd like to request this Friday, [date], off as a day of leave. My current work is on track, and I'll make sure anything urgent is handed over before then.\n\nPlease let me know if that works.\n\nThanks,\n[Your name]",
  greeting: "Hello! How can I help you today?",
  math: "8 × 9 = 72.",
  newsletter:
    "Here's a simple launch plan:\n\n1. **Goal and audience:** decide who it's for and what they should get from it.\n2. **Format:** pick a cadence (e.g. fortnightly) and 3–4 recurring sections.\n3. **First issue:** gather content a week ahead and get one person to review it.\n4. **Launch:** announce it in your team channel and ask for feedback after issue one.\n5. **Iterate:** check open rates and replies after three issues and adjust.",
  weather: "The weather in San Francisco is sunny and 72°F.",
};
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
  const promptStr = lastUserText(prompt).toLowerCase();

  if (promptStr.includes("weather") || promptStr.includes("temperature")) {
    return mockResponses.weather;
  }
  if (promptStr.includes("email") || promptStr.includes("friday off")) {
    return mockResponses.email;
  }
  if (promptStr.includes("compare") || promptStr.includes("claims")) {
    return mockResponses.compare;
  }
  if (promptStr.includes("newsletter") || promptStr.includes("plan")) {
    return mockResponses.newsletter;
  }
  if (/8\s*[×x*]\s*9/.test(promptStr)) {
    return mockResponses.math;
  }
  if (/\b(hello|hi|hey)\b/.test(promptStr)) {
    return mockResponses.greeting;
  }

  return mockResponses.default;
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
