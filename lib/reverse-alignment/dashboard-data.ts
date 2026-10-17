import "server-only";

import { getPromptMetricsWithUser } from "@/lib/db/queries";
import {
  aggregate,
  type DashboardData,
  type MetricRow,
  QUALITY_CLASSES,
  type QualityClass,
} from "./dashboard";
import { sampleMetricRows } from "./dashboard-fixtures";

// Below this many real prompts the charts are empty, so default to the (labelled) sample set.
const MIN_LIVE_ROWS = 30;

// Contract with the prompt evaluator: PromptMetric.evaluation = { quality: "strong" | "reasonable" | "weak", ... }
const qualityOf = (evaluation: unknown): QualityClass | null => {
  const quality = (evaluation as { quality?: unknown } | null)?.quality;
  return QUALITY_CLASSES.includes(quality as QualityClass)
    ? (quality as QualityClass)
    : null;
};

const personLabel = (email: string | null) => {
  if (!email) {
    return "Unknown";
  }
  const guest = /^guest-(\d+)$/.exec(email);
  return guest ? `Guest ${guest[1].slice(-4)}` : email;
};

export async function loadDashboard(
  requested?: "live" | "sample"
): Promise<DashboardData & { liveRows: number }> {
  let live: MetricRow[] = [];
  try {
    live = (await getPromptMetricsWithUser()).map(({ email, metric }) => ({
      attemptNumber: metric.attemptNumber,
      chatId: metric.chatId,
      createdAt: metric.createdAt,
      gateDecision: metric.gateDecision,
      historyTokens: metric.historyTokens,
      inputTokens: metric.inputTokens,
      person: personLabel(email),
      quality: qualityOf(metric.evaluation),
      taskId: metric.taskId,
      totalCostUsd: metric.totalCostUsd,
    }));
  } catch {
    // DB down or table missing: fall through to sample data
  }
  const source =
    requested ?? (live.length >= MIN_LIVE_ROWS ? "live" : "sample");
  return {
    ...aggregate(source === "live" ? live : sampleMetricRows(), source),
    liveRows: live.length,
  };
}
