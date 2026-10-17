"use client";

import { LightbulbIcon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { DismissKind } from "@/lib/reverse-alignment/session-state";
import type { CoachingDecision } from "@/lib/reverse-alignment/types";

type Props = {
  decision: CoachingDecision;
  onDismiss: (kind: DismissKind) => void;
  /** Scripted (fixture/demo) tip: say so on the card. */
  scripted?: boolean;
};

/** A quiet, optional tip under a finished answer. Never a grade, never blocking. */
export function InsightCard({ decision, onDismiss, scripted }: Props) {
  const gotIt = useCallback(() => onDismiss("got_it"), [onDismiss]);
  const notThisKind = useCallback(
    () => onDismiss("not_this_kind"),
    [onDismiss]
  );
  const dismiss = useCallback(() => onDismiss("dismiss"), [onDismiss]);

  if (!decision.insight) {
    return null;
  }
  return (
    <aside
      aria-label="Optional tip"
      className="flex animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)] items-start gap-2.5 rounded-lg border border-border/60 border-dashed px-3 py-2.5 text-[13px] text-muted-foreground leading-[1.6]"
      data-testid="insight-card"
    >
      <LightbulbIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p>
          <span className="font-medium text-foreground">Small tip</span>
          {scripted ? (
            <span className="ml-1.5 rounded bg-muted px-1 py-px text-[11px]">
              demo
            </span>
          ) : null}
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          {decision.insight}
        </p>
        <div className="-ml-2.5 flex flex-wrap gap-0.5">
          <Button onClick={gotIt} size="xs" variant="ghost">
            Got it
          </Button>
          <Button onClick={notThisKind} size="xs" variant="ghost">
            Don't show tips like this
          </Button>
        </div>
      </div>
      <Button
        aria-label="Dismiss tip"
        className="-mt-0.5 -mr-1"
        onClick={dismiss}
        size="icon-xs"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </aside>
  );
}
