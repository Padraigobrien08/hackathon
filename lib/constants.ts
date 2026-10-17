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
// One example per prompt tier. Each rated the same in 4/4 real-mode runs (and in mock mode).
// Clicking one goes through the same pre-send check as typing it, so the weak one asks back.
export const suggestions = [
  { text: "marketing plan", tier: "weak" },
  {
    text: "Help me write an email asking my manager for Friday off",
    tier: "moderate",
  },
  {
    text: "Explain how a mortgage works for a first-time buyer in the UK, in 5 bullet points",
    tier: "strong",
  },
] as const;
