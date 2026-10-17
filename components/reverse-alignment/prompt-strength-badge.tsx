"use client";

import { useCallback } from "react";
import type { PromptStrength } from "@/lib/reverse-alignment/types";
import { cn } from "@/lib/utils";
import { useCoach } from "./coach-provider";

const LABELS: Record<PromptStrength, string> = {
  moderate: "Moderate prompt",
  strong: "Strong prompt",
  weak: "Weak prompt",
};

const DOT: Record<PromptStrength, string> = {
  moderate: "bg-amber-500",
  strong: "bg-emerald-500",
  weak: "bg-rose-500",
};

/** Weak/moderate/strong tier under a user prompt. Opens the settings panel, where it can be turned off. */
export function PromptStrengthBadge({ messageId }: { messageId: string }) {
  const { strengths, state, setSettingsOpen } = useCoach();
  const stored = strengths.get(messageId);
  const open = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
  if (!stored || !state.prefs.showStrength) {
    return null;
  }
  return (
    <button
      className="flex w-fit items-center gap-1.5 rounded-md px-1 text-[11px] text-muted-foreground/80 hover:text-foreground"
      data-strength={stored.strength}
      data-testid="prompt-strength"
      onClick={open}
      title="Based on task, context, what a good answer looks like, and focus. Turn off in How I'm helping."
      type="button"
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", DOT[stored.strength])}
      />
      {LABELS[stored.strength]}
      {stored.scripted ? (
        <span className="text-muted-foreground/60">· demo</span>
      ) : null}
    </button>
  );
}
