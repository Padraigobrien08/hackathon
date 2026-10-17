// Demo data for the manager dashboard: a 12-person small business over 14 days, deterministic.
// Everything flows from one model so the numbers agree with each other:
//   skill (rises over the fortnight) -> prompt quality -> whether the AI has to ask for more
//   -> prompts until clear, clear first time and cost of vague prompts.
import type { MetricRow, QualityClass } from "./dashboard";
import { costOf } from "./pricing";

type Person = {
  person: string;
  // prompting skill at the start (roughly 0–1; below 0 = very weak) and how much it improves by day 14
  skill: number;
  gain: number;
  // requests per weekday, requests per chat, typical prompt length in tokens
  requestsPerDay: number;
  requestsPerChat: [number, number];
  promptTokens: [number, number];
  // chance a prompt pastes in a document / long context
  pasteChance: number;
};

const PEOPLE: Person[] = [
  {
    gain: 0.25,
    pasteChance: 0.25,
    person: "Aisha",
    promptTokens: [80, 220],
    requestsPerChat: [1, 3],
    requestsPerDay: 14,
    skill: 0.6,
  },
  {
    gain: 0.45,
    pasteChance: 0.15,
    person: "Ben",
    promptTokens: [8, 30],
    requestsPerChat: [2, 5],
    requestsPerDay: 18,
    skill: -0.15,
  },
  {
    gain: 0.3,
    pasteChance: 0.4,
    person: "Chloe",
    promptTokens: [60, 160],
    requestsPerChat: [3, 6],
    requestsPerDay: 12,
    skill: 0.45,
  },
  {
    gain: 0.35,
    pasteChance: 0.2,
    person: "Dev",
    promptTokens: [25, 80],
    requestsPerChat: [1, 4],
    requestsPerDay: 16,
    skill: 0.3,
  },
  {
    gain: 0.15,
    pasteChance: 0.3,
    person: "Eilidh",
    promptTokens: [120, 300],
    requestsPerChat: [1, 2],
    requestsPerDay: 9,
    skill: 0.75,
  },
  {
    gain: 0.25,
    pasteChance: 0.15,
    person: "Finn",
    promptTokens: [10, 40],
    requestsPerChat: [2, 5],
    requestsPerDay: 10,
    skill: -0.1,
  },
  {
    gain: 0.4,
    pasteChance: 0.35,
    person: "Grace",
    promptTokens: [40, 120],
    requestsPerChat: [2, 4],
    requestsPerDay: 15,
    skill: 0.25,
  },
  {
    gain: 0.35,
    pasteChance: 0.25,
    person: "Hamza",
    promptTokens: [30, 90],
    requestsPerChat: [1, 3],
    requestsPerDay: 13,
    skill: 0.35,
  },
  {
    gain: 0.3,
    pasteChance: 0.2,
    person: "Isla",
    promptTokens: [50, 140],
    requestsPerChat: [1, 3],
    requestsPerDay: 11,
    skill: 0.5,
  },
  {
    gain: 0.4,
    pasteChance: 0.45,
    person: "Jack",
    promptTokens: [15, 60],
    requestsPerChat: [2, 6],
    requestsPerDay: 17,
    skill: 0.15,
  },
  {
    gain: 0.3,
    pasteChance: 0.3,
    person: "Kai",
    promptTokens: [40, 110],
    requestsPerChat: [1, 4],
    requestsPerDay: 14,
    skill: 0.4,
  },
  {
    gain: 0.35,
    pasteChance: 0.2,
    person: "Leah",
    promptTokens: [20, 70],
    requestsPerChat: [2, 4],
    requestsPerDay: 12,
    skill: 0.2,
  },
];

const DAYS = 14;
const DAY_MS = 86_400_000;
const WEEKEND_VOLUME = 0.4;
const MAX_PROMPTS_PER_REQUEST = 4;
// Chance the AI asks for more instead of answering, by the prompt's quality.
const NEEDS_MORE: Record<QualityClass, number> = {
  moderate: 0.4,
  strong: 0.08,
  weak: 0.85,
};
// A follow-up after "needs more" adds the missing detail, so it's drawn as if the person were this much better.
const FOLLOW_UP_BOOST = 0.3;

// mulberry32: tiny seeded PRNG
function rng(seed: number) {
  let a = seed;
  return () => {
    a = Math.trunc(a + 0x6d_2b_79_f5);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function drawQuality(skill: number, r: number): QualityClass {
  const pStrong = clamp(skill * 0.9 - 0.1, 0, 0.9);
  const pWeak = clamp(0.75 - skill * 0.95, 0.03, 0.85);
  if (r < pStrong) {
    return "strong";
  }
  return r < pStrong + pWeak ? "weak" : "moderate";
}

export function sampleMetricRows(now = new Date()): MetricRow[] {
  const rand = rng(7);
  const between = ([lo, hi]: [number, number]) =>
    Math.round(lo + rand() * (hi - lo));
  const rows: MetricRow[] = [];
  // the DAYS full days before today (UTC), so no partial day skews the averages
  const start = Math.floor(now.getTime() / DAY_MS) * DAY_MS - DAYS * DAY_MS;
  let id = 0;

  for (let day = 0; day < DAYS; day += 1) {
    const weekday = new Date(start + day * DAY_MS).getUTCDay();
    const volume = weekday === 0 || weekday === 6 ? WEEKEND_VOLUME : 1;
    const progress = day / (DAYS - 1);

    for (const p of PEOPLE) {
      const skill = p.skill + p.gain * progress;
      let requestsLeft = Math.round(
        p.requestsPerDay * volume * (0.8 + rand() * 0.4)
      );
      while (requestsLeft > 0) {
        id += 1;
        const chatId = `demo-chat-${id}`;
        let t = start + day * DAY_MS + (8.5 + rand() * 9) * 3_600_000;
        let history = 0;
        const requests = Math.min(requestsLeft, between(p.requestsPerChat));
        requestsLeft -= requests;

        for (let req = 0; req < requests; req += 1) {
          id += 1;
          const taskId = `demo-task-${id}`;
          // each request runs until the AI answers (forced on the last allowed prompt)
          for (
            let attempt = 1;
            attempt <= MAX_PROMPTS_PER_REQUEST;
            attempt += 1
          ) {
            const quality = drawQuality(
              skill + (attempt > 1 ? FOLLOW_UP_BOOST : 0),
              rand()
            );
            const needsMore =
              attempt < MAX_PROMPTS_PER_REQUEST && rand() < NEEDS_MORE[quality];
            const promptTokens =
              between(p.promptTokens) +
              (rand() < p.pasteChance ? between([3000, 10_000]) : 0);
            // a clarifying question is short; a real answer is longer
            const outputTokens = needsMore
              ? between([40, 110])
              : between([600, 1800]);
            const inputTokens = promptTokens + history;
            rows.push({
              attemptNumber: attempt,
              chatId,
              createdAt: new Date(t),
              gateDecision: needsMore ? "needs_more" : "answered",
              historyTokens: history,
              inputTokens,
              person: p.person,
              quality,
              taskId,
              totalCostUsd: costOf({ inputTokens, outputTokens }).totalCostUsd,
            });
            history += promptTokens + outputTokens;
            t += (1 + rand() * 3) * 60_000;
            if (!needsMore) {
              break;
            }
          }
        }
      }
    }
  }
  return rows;
}
