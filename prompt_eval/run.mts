import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { observe } from "../lib/reverse-alignment/observer";
import type {
  CoachingCategory,
  CoachRequest,
} from "../lib/reverse-alignment/types";

type EvaluationCase = CoachRequest & {
  id: string;
  principle: string;
  expect: CoachingCategory;
};

const casesPath = fileURLToPath(new URL("./cases.json", import.meta.url));
const cases = JSON.parse(readFileSync(casesPath, "utf8")) as EvaluationCase[];
const rows = await Promise.all(
  cases.map(async (evaluationCase) => {
    const result = await observe(evaluationCase);
    return {
      expect: evaluationCase.expect,
      got: result.decision.category,
      id: evaluationCase.id,
      insight: result.decision.insight ?? "",
    };
  })
);

const matched = rows.filter((row) => row.got === row.expect).length;
const falseTips = rows.filter(
  (row) => row.expect === "none" && row.got !== "none"
).length;

console.table(rows, ["id", "expect", "got", "insight"]);
console.log(
  `${matched}/${cases.length} matched; ${falseTips} false tips (expected none, got a tip)`
);
