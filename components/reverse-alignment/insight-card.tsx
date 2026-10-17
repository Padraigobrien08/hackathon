"use client";

import { useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DismissKind } from "@/lib/reverse-alignment/session-state";
import type { CoachingDecision } from "@/lib/reverse-alignment/types";

type Props = {
  decision: CoachingDecision;
  onDismiss: (kind: DismissKind) => void;
  onOpenSettings: () => void;
  /** Present in the desktop rail, where the related answer may be off-screen. */
  onShowAnswer?: () => void;
  /** Scripted (fixture/demo) tip: say so on the card. */
  scripted?: boolean;
};

/** A quiet, optional tip under a finished answer. Never a grade, never blocking. */
export function InsightCard({
  decision,
  onDismiss,
  onOpenSettings,
  onShowAnswer,
}: Props) {
  const gotIt = useCallback(() => onDismiss("got_it"), [onDismiss]);
  const notThisKind = useCallback(
    () => onDismiss("not_this_kind"),
    [onDismiss]
  );
  if (!decision.insight) {
    return null;
  }
  return (
    <aside
      aria-label="Optional tip"
      className="relative animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)] rounded-lg border border-border/60 bg-muted/15 px-3.5 py-3"
      data-testid="insight-card"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More tip options"
            className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <span aria-hidden className="-mt-1 text-base leading-none">
              …
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44 shadow-none">
          <DropdownMenuItem onSelect={notThisKind}>
            Hide tips like this
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenSettings}>
            Tip settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="pr-8 text-[13px] text-foreground/80 leading-[1.55]">
        {decision.insight}
      </p>
      <div className="mt-3 flex items-center gap-3 border-border/50 border-t pt-2.5 text-[11px]">
        {onShowAnswer ? (
          <button
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={onShowAnswer}
            type="button"
          >
            View answer
          </button>
        ) : null}
        <button
          className="ml-auto font-medium text-foreground/80 transition-colors hover:text-foreground"
          onClick={gotIt}
          type="button"
        >
          Got it
        </button>
      </div>
    </aside>
  );
}
