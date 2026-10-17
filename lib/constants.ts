import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

// Reverse Alignment demo prompts (match the coach fixtures in lib/reverse-alignment/fixtures.ts).
export const suggestions = [
  "Help me write an email asking my manager for Friday off",
  "Compare these two claims and tell me which is right",
  "Make me a plan for launching our team newsletter",
  "What's 8 × 9?",
];
