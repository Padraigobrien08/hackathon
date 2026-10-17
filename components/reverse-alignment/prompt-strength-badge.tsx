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

// Filled segments out of three, and their colour.
const FILLED: Record<PromptStrength, number> = {
  moderate: 2,
  strong: 3,
  weak: 1,
};

const COLOR: Record<PromptStrength, string> = {
  moderate: "bg-orange-500",
  strong: "bg-emerald-500",
  weak: "bg-red-500",
};

const SEGMENTS = [0, 1, 2];

/** Weak/moderate/strong tier as a 3-segment bar under a user prompt. Opens the settings panel, where it can be turned off. */
export function PromptStrengthBadge({ messageId }: { messageId: string }) {
  const { strengths, state, setSettingsOpen } = useCoach();
  const stored = strengths.get(messageId);
  const open = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
  if (!stored || !state.prefs.showStrength) {
    return null;
  }
  const label = `${LABELS[stored.strength]}${stored.scripted ? " (demo)" : ""}`;
  return (
    <button
      aria-label={label}
      className="-mt-1 flex w-fit items-center gap-1.5 rounded-md p-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
      data-strength={stored.strength}
      data-testid="prompt-strength"
      onClick={open}
      title={`${label}. Based on task, context, what a good answer looks like, and focus. Turn off in How I'm helping.`}
      type="button"
    >
      {stored.scripted ? <span>demo</span> : null}
      <span aria-hidden className="flex gap-0.5">
        {SEGMENTS.map((index) => (
          <span
            className={cn(
              "h-1 w-6 rounded-full transition-colors",
              index < FILLED[stored.strength]
                ? COLOR[stored.strength]
                : "bg-muted-foreground/15"
            )}
            key={index}
          />
        ))}
      </span>
    </button>
  );
}
