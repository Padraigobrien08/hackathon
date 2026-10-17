"use client";

import { ArrowLeftIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  type DashboardData,
  QUALITY_CLASSES,
  type QualityClass,
} from "@/lib/reverse-alignment/dashboard";
import { PRICING_MODEL } from "@/lib/reverse-alignment/pricing";
import { cn } from "@/lib/utils";

// Chart colours: validated ordinal blue ramp (dataviz reference palette), same steps in light and dark.
const VIZ_STYLE = `
.ra-viz { --series-1: #2a78d6; --q-weak: #86b6ef; --q-reasonable: #3987e5; --q-strong: #1c5cab;
  --ord-1: #86b6ef; --ord-2: #5598e7; --ord-3: #2a78d6; --ord-4: #1c5cab; --grid: #e1e0d9; --baseline: #c3c2b7; }
.dark .ra-viz { --series-1: #3987e5; --grid: #2c2c2a; --baseline: #383835; }
`;

const QUALITY_COLOR: Record<QualityClass, string> = {
  reasonable: "var(--q-reasonable)",
  strong: "var(--q-strong)",
  weak: "var(--q-weak)",
};
const QUALITY_LABEL: Record<QualityClass, string> = {
  reasonable: "Reasonable",
  strong: "Strong",
  weak: "Weak",
};
// strongest on top of the stack / first in the legend
const QUALITY_TOP_DOWN = [...QUALITY_CLASSES].reverse();
const ORDINAL = [
  "var(--ord-1)",
  "var(--ord-2)",
  "var(--ord-3)",
  "var(--ord-4)",
];

function usd(v: number) {
  if (v >= 100) {
    return `$${Math.round(v).toLocaleString("en-GB")}`;
  }
  if (v >= 1) {
    return `$${v.toFixed(2)}`;
  }
  return `$${v.toPrecision(2)}`;
}
const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number, digits = 1) =>
  v.toLocaleString("en-GB", { maximumFractionDigits: digits });
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const GATE_PENDING = "Waiting for the worth-responding check";
const EVALUATOR_PENDING = "Waiting for the prompt evaluator";

export function ManagerDashboard({
  data,
}: {
  data: DashboardData & { liveRows: number };
}) {
  const { totals, gate, quality } = data;
  const pricingName = PRICING_MODEL.replace("gpt-6-", "GPT-6 ").replace(
    /\b\w/g,
    (c) => c.toUpperCase()
  );

  return (
    <div className="ra-viz min-h-dvh bg-background text-foreground">
      <style>{VIZ_STYLE}</style>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              className="flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="/"
            >
              <ArrowLeftIcon className="size-4" />
              Back to chat
            </Link>
            <h1 className="font-semibold text-2xl tracking-tight">
              Prompting overview
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm">
              How well the team is prompting: how strong prompts are, how often
              the AI has to ask for more, and what vague prompts cost.
            </p>
          </div>
          <DataToggle liveRows={data.liveRows} source={data.source} />
        </header>

        {data.source === "sample" ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong className="font-medium">Sample data.</strong> Six
              fictional people over 14 days, including mock quality classes
              until the prompt evaluator is connected. Switch to Live once real
              prompts have been recorded ({data.liveRows} so far).
            </span>
          </div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            subtitle={
              quality.evaluated
                ? `Across ${num(quality.evaluated, 0)} evaluated prompts`
                : undefined
            }
            title="Average prompt quality"
          >
            {quality.avgScore === null || quality.avgClass === null ? (
              <Empty>{EVALUATOR_PENDING}: no prompts classed yet.</Empty>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <span className="font-semibold text-3xl">
                    {QUALITY_LABEL[quality.avgClass]}
                  </span>
                  <QualityScale score={quality.avgScore} />
                </div>
                <QualityMix distribution={quality.distribution} />
              </div>
            )}
          </Card>
          <Card
            subtitle="Spend on prompts the AI had to ask about before it could answer"
            title="Cost of vague prompts"
          >
            {gate.vaguePromptSpendUsd === null ? (
              <Empty>{GATE_PENDING}.</Empty>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="font-semibold text-3xl">
                  {usd(gate.vaguePromptSpendUsd)}
                </span>
                {gate.vaguePromptShare === null ? null : (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: "var(--series-1)",
                          width: `${gate.vaguePromptShare * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {pct(gate.vaguePromptShare)} of all spend went on prompts
                      that needed clarifying first
                    </span>
                  </>
                )}
              </div>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Clear first time"
            note={
              gate.clearFirstTimeRate === null
                ? GATE_PENDING
                : "of requests were clear enough to answer straight away"
            }
            value={
              gate.clearFirstTimeRate === null
                ? "—"
                : pct(gate.clearFirstTimeRate)
            }
          />
          <StatTile
            label="Prompts until clear"
            note={
              gate.avgPromptsUntilClear === null
                ? GATE_PENDING
                : "messages on average before the AI could answer"
            }
            value={
              gate.avgPromptsUntilClear === null
                ? "—"
                : gate.avgPromptsUntilClear.toFixed(2)
            }
          />
          <StatTile
            label="Re-sent history"
            note="of input was earlier messages. Start a new chat when the old context isn't relevant."
            value={pct(totals.historyShareOfInput)}
          />
          <StatTile
            label="Estimated daily spend"
            note={`average over ${num(totals.days, 0)} ${totals.days === 1 ? "day" : "days"}, at ${pricingName} rates`}
            value={usd(totals.dailySpendUsd)}
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            subtitle="Share of each day's prompts in each class, last 14 days"
            title="Prompt quality over time"
          >
            {quality.evaluated === 0 ? (
              <Empty>{EVALUATOR_PENDING}.</Empty>
            ) : (
              <QualityOverTime days={data.qualityByDay} />
            )}
          </Card>
          <Card
            subtitle="How many messages a request took before the AI judged it clear enough to answer"
            title="Prompts until clear"
          >
            {gate.avgPromptsUntilClear === null ? (
              <Empty>{GATE_PENDING}: no decisions recorded yet.</Empty>
            ) : (
              <PromptsUntilClear rows={data.promptsUntilClear} />
            )}
          </Card>
        </section>

        <Card
          subtitle="Weakest average quality first, to spot who might benefit from coaching. Not a ranking."
          title="By person"
        >
          <PeopleTable people={data.people} />
        </Card>
      </div>
    </div>
  );
}

function DataToggle({
  source,
  liveRows,
}: {
  source: DashboardData["source"];
  liveRows: number;
}) {
  const options = [
    { href: "/dashboard?data=sample", key: "sample", label: "Sample" },
    { href: "/dashboard?data=live", key: "live", label: `Live (${liveRows})` },
  ] as const;
  return (
    <nav
      aria-label="Data set"
      className="flex w-fit rounded-lg border border-border bg-card p-0.5 text-sm"
    >
      {options.map((o) => (
        <Link
          aria-current={source === o.key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 transition-colors",
            source === o.key
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          href={o.href}
          key={o.key}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="font-medium text-sm">{title}</h2>
        {subtitle ? (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-2xl">{value}</span>
      <span className="text-muted-foreground text-xs">{note}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

// Weak | Reasonable | Strong track with a marker at the average (score 0–2).
function QualityScale({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  return (
    <div
      aria-label={`Average quality ${num(score, 2)} on a scale from weak (0) to strong (2)`}
      className={cn("flex flex-col gap-1.5", compact ? "w-28" : "w-full")}
      role="img"
    >
      <div
        className={cn(
          "relative grid grid-cols-3 gap-[2px]",
          compact ? "h-1.5" : "h-2.5"
        )}
      >
        <div className="rounded-l-full bg-muted" />
        <div className="bg-muted" />
        <div className="rounded-r-full bg-muted" />
        <div
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm",
            compact ? "size-3" : "size-5"
          )}
          style={{
            background: "var(--series-1)",
            left: `${(score / 2) * 100}%`,
          }}
        />
      </div>
      {compact ? null : (
        <div className="grid grid-cols-3 text-muted-foreground text-xs">
          <span>Weak</span>
          <span className="text-center">Reasonable</span>
          <span className="text-right">Strong</span>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
      {QUALITY_TOP_DOWN.map((q) => (
        <span className="flex items-center gap-1.5" key={q}>
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: QUALITY_COLOR[q] }}
          />
          {QUALITY_LABEL[q]}
        </span>
      ))}
    </div>
  );
}

// One 100% bar: strong | reasonable | weak, with direct labels underneath.
function QualityMix({
  distribution,
}: {
  distribution: DashboardData["quality"]["distribution"];
}) {
  const ordered = QUALITY_TOP_DOWN.map(
    (q) => distribution.find((d) => d.quality === q) ?? { quality: q, share: 0 }
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 gap-[2px]">
        {ordered
          .filter((d) => d.share > 0)
          .map((d, i, shown) => (
            <div
              className={cn(
                i === 0 && "rounded-l-[4px]",
                i === shown.length - 1 && "rounded-r-[4px]"
              )}
              key={d.quality}
              style={{
                background: QUALITY_COLOR[d.quality],
                width: `${d.share * 100}%`,
              }}
              title={`${QUALITY_LABEL[d.quality]}: ${pct(d.share)}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {ordered.map((d) => (
          <span className="flex items-center gap-1.5" key={d.quality}>
            <span
              className="size-2.5 rounded-[3px]"
              style={{ background: QUALITY_COLOR[d.quality] }}
            />
            <span className="font-medium tabular-nums">{pct(d.share)}</span>
            <span className="text-muted-foreground">
              {QUALITY_LABEL[d.quality].toLowerCase()}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Stacked 100% columns per day. Hover (or focus) a column for its mix.
function QualityOverTime({ days }: { days: DashboardData["qualityByDay"] }) {
  const [active, setActive] = useState<number | null>(null);
  const show = useCallback(
    (e: React.SyntheticEvent<HTMLButtonElement>) =>
      setActive(Number(e.currentTarget.dataset.index)),
    []
  );
  const hide = useCallback(() => setActive(null), []);
  const labelEvery = 3;

  return (
    <div className="flex flex-col gap-3">
      <Legend />
      <div className="flex gap-2">
        <div className="relative h-44 w-9 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
          {[1, 0.5, 0].map((t) => (
            <span
              className="absolute right-0 -translate-y-1/2"
              key={t}
              style={{ top: `${(1 - t) * 100}%` }}
            >
              {pct(t)}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="relative flex h-44 items-end gap-[3px] border-b"
            style={{ borderColor: "var(--baseline)" }}
          >
            {days.map((d, i) => (
              <button
                aria-label={`${shortDate(d.date)}: ${QUALITY_TOP_DOWN.map((q) => `${pct(d.shares[q])} ${q}`).join(", ")}`}
                className="relative flex h-full flex-1 flex-col justify-end gap-[2px] outline-none"
                data-index={i}
                key={d.date}
                onBlur={hide}
                onFocus={show}
                onMouseEnter={show}
                onMouseLeave={hide}
                style={{
                  opacity: active === null || active === i ? 1 : 0.45,
                }}
                type="button"
              >
                {d.evaluated === 0
                  ? null
                  : QUALITY_TOP_DOWN.filter((q) => d.shares[q] > 0).map(
                      (q, j) => (
                        <div
                          className={cn("w-full", j === 0 && "rounded-t-[4px]")}
                          key={q}
                          style={{
                            background: QUALITY_COLOR[q],
                            height: `${d.shares[q] * 100}%`,
                          }}
                        />
                      )
                    )}
                {active === i ? (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-left text-popover-foreground text-xs shadow-md">
                    <div className="font-medium">{shortDate(d.date)}</div>
                    {d.evaluated === 0 ? (
                      <div className="text-muted-foreground">No prompts</div>
                    ) : (
                      QUALITY_TOP_DOWN.map((q) => (
                        <div className="tabular-nums" key={q}>
                          {pct(d.shares[q])}{" "}
                          <span className="text-muted-foreground">{q}</span>
                        </div>
                      ))
                    )}
                    <div className="text-muted-foreground">
                      {num(d.evaluated, 0)} prompts
                    </div>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px] text-[11px] text-muted-foreground">
            {days.map((d, i) => (
              <span
                className="flex flex-1 justify-center overflow-visible whitespace-nowrap"
                key={d.date}
              >
                {/* anchored on the newest day so the last label never collides */}
                {(days.length - 1 - i) % labelEvery === 0
                  ? shortDate(d.date)
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal ordinal bars: 1, 2, 3, 4+ messages. Darker = more messages needed.
function PromptsUntilClear({
  rows,
}: {
  rows: DashboardData["promptsUntilClear"];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div className="flex items-center gap-3 text-sm" key={r.prompts}>
          <span className="w-8 shrink-0 text-muted-foreground tabular-nums">
            {r.prompts}
          </span>
          <div className="h-5 flex-1">
            <div
              className="h-full rounded-r-[4px]"
              style={{
                background: ORDINAL[i],
                minWidth: r.tasks > 0 ? 2 : 0,
                width: `${r.share * 100}%`,
              }}
              title={`${r.tasks} requests`}
            />
          </div>
          <span className="w-12 shrink-0 text-right tabular-nums">
            {pct(r.share)}
          </span>
        </div>
      ))}
      <p className="border-border border-t pt-3 text-muted-foreground text-sm">
        A request counts as clear when the AI answers it instead of asking for
        more. Requests needing 3+ messages usually started without the audience,
        format or context.
      </p>
    </div>
  );
}

function PeopleTable({ people }: { people: DashboardData["people"] }) {
  const weakShare = (p: DashboardData["people"][number]) =>
    p.quality.evaluated
      ? (p.quality.distribution.find((d) => d.quality === "weak")?.share ?? 0)
      : null;
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[720px] text-sm tabular-nums">
        <thead>
          <tr className="border-border border-b text-left text-muted-foreground text-xs">
            <th className="py-2 pr-3 font-normal">Person</th>
            <th className="py-2 pr-3 text-right font-normal">Prompts</th>
            <th className="py-2 pr-3 font-normal">Average quality</th>
            <th className="py-2 pr-3 text-right font-normal">Weak prompts</th>
            <th className="py-2 pr-3 text-right font-normal">
              Clear first time
            </th>
            <th className="py-2 pr-3 text-right font-normal">
              Prompts until clear
            </th>
            <th className="py-2 text-right font-normal">
              Vague prompt cost / day
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => {
            const weak = weakShare(p);
            return (
              <tr
                className="border-border/60 border-b last:border-0"
                key={p.person}
              >
                <td className="py-2.5 pr-3 font-medium">{p.person}</td>
                <td className="py-2.5 pr-3 text-right">{num(p.prompts, 0)}</td>
                <td className="py-2.5 pr-3">
                  {p.quality.avgScore === null ||
                  p.quality.avgClass === null ? (
                    "—"
                  ) : (
                    <div className="flex items-center gap-3">
                      <QualityScale compact score={p.quality.avgScore} />
                      <span>{QUALITY_LABEL[p.quality.avgClass]}</span>
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  {weak === null ? "—" : pct(weak)}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  {p.clearFirstTimeRate === null
                    ? "—"
                    : pct(p.clearFirstTimeRate)}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  {p.avgPromptsUntilClear === null
                    ? "—"
                    : p.avgPromptsUntilClear.toFixed(2)}
                </td>
                <td className="py-2.5 text-right">
                  {p.vaguePromptSpendPerDayUsd === null ? (
                    "—"
                  ) : (
                    <>
                      {usd(p.vaguePromptSpendPerDayUsd)}
                      {p.vaguePromptShare === null ? null : (
                        <span className="ml-1.5 text-muted-foreground text-xs">
                          {pct(p.vaguePromptShare)}
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
