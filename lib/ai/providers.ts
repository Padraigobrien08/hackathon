import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// USE_MOCK=1 (or Playwright) serves the template's mock models, so teammates
// without an API key can still run the full app.
export const useMock = process.env.USE_MOCK === "1" || isTestEnvironment;

export const myProvider = useMock
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

// OpenAI only. The live demo chip (lib/reverse-alignment/live.ts) uses this model even in mock mode.
const OPENAI_CHAT_MODEL = "gpt-6-luna";
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

/** The model that actually answers, for labels and metrics. */
export function answerModelId(modelId: string, live = false) {
  if (live && hasOpenAI) {
    return OPENAI_CHAT_MODEL;
  }
  if (useMock) {
    return "mock";
  }
  return modelId;
}

export function getLanguageModel(modelId: string, live = false) {
  if (live && hasOpenAI) {
    return openai(OPENAI_CHAT_MODEL);
  }
  if (useMock && myProvider) {
    return myProvider.languageModel("chat-model");
  }

  return openai(modelId);
}

export function getTitleModel() {
  if (useMock && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return openai(titleModel.id);
}
