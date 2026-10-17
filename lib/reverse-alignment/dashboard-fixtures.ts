// Sample data for the manager dashboard (source: "sample", always labelled in the UI).
// Six fictional people with different prompting habits, 14 days, deterministic so the demo looks the same every time.
import type { MetricRow, QualityClass } from "./dashboard";
import { costOf } from "./pricing";

type Style = {
  person: string;
  chatsPerDay: number;
  turnsPerChat: [number, number];
  promptTokens: [number, number];
  outputTokens: [number, number];
  // chance a prompt is too vague to answer, and of giving up after a "needs more"
  needsMore: number;
  giveUp: number;
  // baseline prompting skill (about 0–1): drives the evaluator's quality class
  skill: number;
};

const STYLES: Style[] = [
  {
    chatsPerDay: 2,
    giveUp: 0.05,
    needsMore: 0.08,
    outputTokens: [250, 500],
    person: "Aisha",
    promptTokens: [60, 140],
    skill: 0.75,
    turnsPerChat: [2, 4],
  },
  {
    chatsPerDay: 3,
    giveUp: 0.3,
    needsMore: 0.45,
    outputTokens: [300, 700],
    person: "Ben",
    promptTokens: [6, 20],
    skill: -0.15,
    turnsPerChat: [3, 6],
  },
  {
    chatsPerDay: 1,
    giveUp: 0.1,
    needsMore: 0.15,
    outputTokens: [400, 900],
    person: "Chloe",
    promptTokens: [40, 90],
    skill: 0.6,
    turnsPerChat: [8, 14],
  },
  {
    chatsPerDay: 2,
    giveUp: 0.15,
    needsMore: 0.25,
    outputTokens: [200, 450],
    person: "Dev",
    promptTokens: [20, 60],
    skill: 0.45,
    turnsPerChat: [2, 5],
  },
  {
    chatsPerDay: 2,
    giveUp: 0.05,
    needsMore: 0.1,
    outputTokens: [150, 350],
    person: "Eilidh",
    promptTokens: [80, 200],
    skill: 0.85,
    turnsPerChat: [1, 3],
  },
  {
    chatsPerDay: 1,
    giveUp: 0.4,
    needsMore: 0.35,
    outputTokens: [350, 800],
    person: "Finn",
    promptTokens: [10, 30],
    skill: 0.05,
    turnsPerChat: [4, 9],
  },
];

const DAYS = 14;
// Over the 14 days everyone improves a little (the coaching story): more strong prompts, fewer vague ones.
const IMPROVEMENT = 0.5;
const DAY_MS = 86_400_000;

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

export function sampleMetricRows(now = new Date()): MetricRow[] {
  const rand = rng(42);
  const between = ([lo, hi]: [number, number]) =>
    Math.round(lo + rand() * (hi - lo));
  const rows: MetricRow[] = [];
  // midnight UTC, DAYS - 1 days ago; rows after `now` are dropped
  const start =
    Math.floor(now.getTime() / DAY_MS) * DAY_MS - (DAYS - 1) * DAY_MS;
  let id = 0;

  for (let day = 0; day < DAYS; day += 1) {
    for (const style of STYLES) {
      // fewer chats at weekends
      const weekday = new Date(start + day * DAY_MS).getUTCDay();
      const chats =
        weekday === 0 || weekday === 6
          ? Math.round(style.chatsPerDay * 0.3)
          : style.chatsPerDay;
      for (let c = 0; c < chats; c += 1) {
        id += 1;
        const chatId = `sample-chat-${id}`;
        let t = start + day * DAY_MS + (9 + rand() * 8) * 3_600_000;
        let history = 0;
        let taskId = "";
        let attempt = 0;
        let lastDecision: MetricRow["gateDecision"] = null;
        const turns = between(style.turnsPerChat);
        for (let turn = 0; turn < turns; turn += 1) {
          if (lastDecision !== "needs_more") {
            id += 1;
            taskId = `sample-task-${id}`;
            attempt = 0;
          }
          attempt += 1;
          const progress = day / (DAYS - 1);
          const gateDecision =
            rand() < style.needsMore * (1 - progress * 0.4) && attempt < 4
              ? "needs_more"
              : "answered";
          const skill = Math.min(1, style.skill + IMPROVEMENT * progress);
          const q = rand();
          let quality: QualityClass;
          if (gateDecision === "needs_more") {
            quality = q < 0.8 ? "weak" : "moderate";
          } else if (q < skill - 0.15) {
            quality = "strong";
          } else {
            quality = q > skill + 0.45 ? "weak" : "moderate";
          }
          const promptTokens = between(style.promptTokens);
          // a "needs more" reply is a short clarifying question
          const outputTokens =
            gateDecision === "needs_more"
              ? between([40, 90])
              : between(style.outputTokens);
          const inputTokens = promptTokens + history;
          rows.push({
            attemptNumber: attempt,
            chatId,
            createdAt: new Date(t),
            gateDecision,
            historyTokens: history,
            inputTokens,
            person: style.person,
            quality,
            taskId,
            totalCostUsd: costOf({ inputTokens, outputTokens }).totalCostUsd,
          });
          history += promptTokens + outputTokens;
          lastDecision = gateDecision;
          t += (1 + rand() * 4) * 60_000;
          if (gateDecision === "needs_more" && rand() < style.giveUp) {
            break; // abandoned
          }
        }
      }
    }
  }
  return rows.filter((r) => r.createdAt <= now);
}
