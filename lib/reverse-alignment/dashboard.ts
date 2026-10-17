// Manager dashboard: contract + aggregation over PromptMetric rows. Pure functions, used by the page and /api/dashboard.
// Kept out of types.ts so the shared coach contract stays untouched.

import type { PromptStrength } from "./types";

// Same tiers as the coach's prompt strength (types.ts), so evaluator output plugs straight in.
export type QualityClass = PromptStrength;
export const QUALITY_CLASSES: readonly QualityClass[] = [
  "weak",
  "moderate",
  "strong",
];
// weak = 0, moderate = 1, strong = 2; the average is placed on this 0–2 scale.
const QUALITY_SCORE: Record<QualityClass, number> = {
  moderate: 1,
  strong: 2,
  weak: 0,
};

export type MetricRow = {
  person: string;
  chatId: string;
  createdAt: Date;
  historyTokens: number;
  inputTokens: number;
  totalCostUsd: number;
  gateDecision: "answered" | "needs_more" | null;
  taskId: string | null;
  attemptNumber: number | null;
  // from the prompt evaluator (PromptMetric.evaluation.quality); null until evaluated
  quality: QualityClass | null;
};

type QualitySummary = {
  evaluated: number;
  // 0 (weak) – 2 (strong), null when nothing is evaluated
  avgScore: number | null;
  avgClass: QualityClass | null;
  distribution: { quality: QualityClass; count: number; share: number }[];
};

export type PersonSummary = {
  person: string;
  prompts: number;
  quality: QualitySummary;
  // null until the worth-responding gate records decisions
  clearFirstTimeRate: number | null;
  avgPromptsUntilClear: number | null;
  // per day over the team's period (totals.days), so people stay comparable
  vaguePromptSpendPerDayUsd: number | null;
  vaguePromptShare: number | null;
};

export type DashboardData = {
  quality: QualitySummary;
  qualityByDay: {
    date: string;
    evaluated: number;
    shares: Record<QualityClass, number>;
  }[];
  gate: {
    tasks: number;
    clearFirstTimeRate: number | null;
    avgPromptsUntilClear: number | null;
    // spend on prompts the AI had to ask about before it could answer ("needs_more")
    vaguePromptSpendUsd: number | null;
    vaguePromptShare: number | null;
  };
  promptsUntilClear: { prompts: string; tasks: number; share: number }[];
  totals: {
    prompts: number;
    people: number;
    spendUsd: number;
    // calendar days from the first to the newest prompt, inclusive
    days: number;
    dailySpendUsd: number;
    // share of input tokens that were re-sent chat history rather than the new prompt
    historyShareOfInput: number;
  };
  people: PersonSummary[];
};

const DAYS_SHOWN = 14;

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function groupBy<T>(xs: T[], key: (x: T) => string) {
  const map = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const list = map.get(k);
    if (list) {
      list.push(x);
    } else {
      map.set(k, [x]);
    }
  }
  return map;
}

export function classForScore(score: number): QualityClass {
  if (score < 2 / 3) {
    return "weak";
  }
  return score < 4 / 3 ? "moderate" : "strong";
}

function qualityStats(rows: MetricRow[]): QualitySummary {
  const classes = rows
    .map((r) => r.quality)
    .filter((q): q is QualityClass => q !== null);
  const avgScore = classes.length
    ? avg(classes.map((q) => QUALITY_SCORE[q]))
    : null;
  return {
    avgClass: avgScore === null ? null : classForScore(avgScore),
    avgScore,
    distribution: QUALITY_CLASSES.map((quality) => {
      const count = classes.filter((q) => q === quality).length;
      return {
        count,
        quality,
        share: classes.length ? count / classes.length : 0,
      };
    }),
    evaluated: classes.length,
  };
}

// A task runs from its first prompt to the first one the gate answered. Unfinished tasks are left out.
function gateStats(rows: MetricRow[]) {
  const gated = rows.filter((r) => r.gateDecision && r.taskId);
  const promptsUntilClear = [...groupBy(gated, (r) => r.taskId ?? "").values()]
    .map(
      (taskRows) =>
        taskRows.find((r) => r.gateDecision === "answered")?.attemptNumber
    )
    .filter((a): a is number => typeof a === "number");
  const spend = sum(rows.map((r) => r.totalCostUsd));
  const vagueSpend = sum(
    gated
      .filter((r) => r.gateDecision === "needs_more")
      .map((r) => r.totalCostUsd)
  );
  const hasGate = gated.length > 0;
  return {
    avgPromptsUntilClear: promptsUntilClear.length
      ? avg(promptsUntilClear)
      : null,
    clearFirstTimeRate: promptsUntilClear.length
      ? promptsUntilClear.filter((a) => a === 1).length /
        promptsUntilClear.length
      : null,
    promptsUntilClear,
    vaguePromptShare: hasGate && spend > 0 ? vagueSpend / spend : null,
    vaguePromptSpendUsd: hasGate ? vagueSpend : null,
  };
}

export function aggregate(rows: MetricRow[]): DashboardData {
  const spendUsd = sum(rows.map((r) => r.totalCostUsd));
  const days = rows.length
    ? Math.round(
        (Date.parse(
          dayKey(new Date(Math.max(...rows.map((r) => r.createdAt.getTime()))))
        ) -
          Date.parse(
            dayKey(
              new Date(Math.min(...rows.map((r) => r.createdAt.getTime())))
            )
          )) /
          86_400_000
      ) + 1
    : 1;
  const inputTokens = sum(rows.map((r) => r.inputTokens));
  const gate = gateStats(rows);

  // Quality mix per day over the last DAYS_SHOWN days ending at the newest row.
  const byDay = groupBy(rows, (r) => dayKey(r.createdAt));
  const newest = rows.length
    ? new Date(Math.max(...rows.map((r) => r.createdAt.getTime())))
    : new Date();
  const qualityByDay = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date(newest);
    d.setUTCDate(d.getUTCDate() - (DAYS_SHOWN - 1 - i));
    const stats = qualityStats(byDay.get(dayKey(d)) ?? []);
    return {
      date: dayKey(d),
      evaluated: stats.evaluated,
      shares: Object.fromEntries(
        stats.distribution.map((x) => [x.quality, x.share])
      ) as Record<QualityClass, number>,
    };
  });

  const buckets = ["1", "2", "3", "4+"];
  const promptsUntilClear = buckets.map((label, i) => {
    const tasks = gate.promptsUntilClear.filter((a) =>
      i === 3 ? a >= 4 : a === i + 1
    ).length;
    return {
      prompts: label,
      share: gate.promptsUntilClear.length
        ? tasks / gate.promptsUntilClear.length
        : 0,
      tasks,
    };
  });

  // Weakest average quality first: who might benefit from coaching.
  const people = [...groupBy(rows, (r) => r.person).entries()]
    .map(([person, personRows]): PersonSummary => {
      const personGate = gateStats(personRows);
      return {
        avgPromptsUntilClear: personGate.avgPromptsUntilClear,
        clearFirstTimeRate: personGate.clearFirstTimeRate,
        person,
        prompts: personRows.length,
        quality: qualityStats(personRows),
        vaguePromptShare: personGate.vaguePromptShare,
        vaguePromptSpendPerDayUsd:
          personGate.vaguePromptSpendUsd === null
            ? null
            : personGate.vaguePromptSpendUsd / days,
      };
    })
    .sort(
      (a, b) =>
        (a.quality.avgScore ?? Number.POSITIVE_INFINITY) -
        (b.quality.avgScore ?? Number.POSITIVE_INFINITY)
    );

  return {
    gate: {
      avgPromptsUntilClear: gate.avgPromptsUntilClear,
      clearFirstTimeRate: gate.clearFirstTimeRate,
      tasks: gate.promptsUntilClear.length,
      vaguePromptShare: gate.vaguePromptShare,
      vaguePromptSpendUsd: gate.vaguePromptSpendUsd,
    },
    people,
    promptsUntilClear,
    quality: qualityStats(rows),
    qualityByDay,
    totals: {
      dailySpendUsd: spendUsd / days,
      days,
      historyShareOfInput: inputTokens
        ? sum(rows.map((r) => r.historyTokens)) / inputTokens
        : 0,
      people: people.length,
      prompts: rows.length,
      spendUsd,
    },
  };
}
