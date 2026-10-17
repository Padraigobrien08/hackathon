import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

// USE_MOCK=1 (or Playwright) serves the template's mock models, so teammates
// without ANTHROPIC_API_KEY can still run the full app.
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

// The live demo chip (lib/reverse-alignment/live.ts) answers with a real model, even in mock mode.
const LIVE_CHAT_MODEL = "gpt-6-luna";

export function getLanguageModel(modelId: string, live = false) {
  if (live && process.env.OPENAI_API_KEY) {
    return openai(LIVE_CHAT_MODEL);
  }
  if (useMock && myProvider) {
    return myProvider.languageModel("chat-model");
  }

  return anthropic(modelId);
}

export function getTitleModel() {
  if (useMock && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return anthropic(titleModel.id);
}
