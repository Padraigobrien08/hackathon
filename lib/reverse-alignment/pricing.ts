// Cost estimates use GPT-6 Astra list prices (Standard, short context), whatever model actually answered.
// USD per 1M tokens. Hardcoded on purpose: label any figure from this as "estimated at GPT-6 Astra rates".
export const PRICING_MODEL = "gpt-6-astra";

export const PRICE_PER_MILLION = {
  cachedInput: 1,
  input: 10,
  output: 50,
} as const;

// Unused for now: long-context rates, kept for reference.
export const LONG_CONTEXT_PRICE_PER_MILLION = {
  cachedInput: 2,
  input: 20,
  output: 75,
} as const;

export function costOf({
  inputTokens,
  outputTokens,
}: {
  inputTokens: number;
  outputTokens: number;
}) {
  const inputCostUsd = (inputTokens / 1_000_000) * PRICE_PER_MILLION.input;
  const outputCostUsd = (outputTokens / 1_000_000) * PRICE_PER_MILLION.output;
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  };
}
