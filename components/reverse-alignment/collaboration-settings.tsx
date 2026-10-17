"use client";

import { type MouseEvent, useCallback } from "react";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  CoachingCategory,
  CoachingPreferences,
} from "@/lib/reverse-alignment/types";
import { useCoach } from "./coach-provider";

const CATEGORY_LABELS: Record<CoachingCategory, string> = {
  assumption: "Assumptions I made",
  delegation: "Steps you could hand to me",
  missing_context: "Details that would change the answer",
  none: "Other",
  verification: "Things worth double-checking",
};

const FREQUENCY_HINTS: Record<CoachingPreferences["frequency"], string> = {
  low: "Tips are rarer.",
  normal: "At most one tip every few messages, and only when it would help.",
  off: "No tips. Answers are exactly the same either way.",
};

type Option<T extends string> = { value: T; label: string };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onChange(event.currentTarget.dataset.value as T);
    },
    [onChange]
  );
  return (
    <ButtonGroup aria-label={label}>
      {options.map((option) => (
        <Button
          aria-pressed={option.value === value}
          data-value={option.value}
          key={option.value}
          onClick={handleClick}
          size="sm"
          variant={option.value === value ? "secondary" : "outline"}
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

const FREQUENCY_OPTIONS: Option<CoachingPreferences["frequency"]>[] = [
  { label: "Off", value: "off" },
  { label: "Fewer", value: "low" },
  { label: "Normal", value: "normal" },
];

const ON_OFF_OPTIONS: Option<"on" | "off">[] = [
  { label: "Off", value: "off" },
  { label: "On", value: "on" },
];

function HiddenCategoryRow({ category }: { category: CoachingCategory }) {
  const { dispatch } = useCoach();
  const showAgain = useCallback(
    () => dispatch({ category, type: "UNDISMISS_CATEGORY" }),
    [category, dispatch]
  );
  return (
    <li className="flex items-center justify-between gap-2">
      <span>{CATEGORY_LABELS[category]}</span>
      <Button onClick={showAgain} size="xs" variant="ghost">
        Show again
      </Button>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-medium text-foreground text-sm">{title}</h3>
      {children}
    </section>
  );
}

/** "How I'm helping": coaching controls. Shows settings only, never scores or counts. */
export function CollaborationSettings() {
  const { state, dispatch, settingsOpen, setSettingsOpen } = useCoach();
  const { prefs, signals } = state;

  const setFrequency = useCallback(
    (next: CoachingPreferences["frequency"]) =>
      dispatch({ frequency: next, type: "SET_FREQUENCY" }),
    [dispatch]
  );
  const setShowAssumptions = useCallback(
    (value: "on" | "off") =>
      dispatch({
        showAssumptions: value === "on",
        type: "SET_SHOW_ASSUMPTIONS",
      }),
    [dispatch]
  );
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    toast({
      description: "Tip settings and preferences reset.",
      type: "success",
    });
  }, [dispatch]);

  // The UI controls frequency only; `enabled` stays true unless something else turns it off.
  const frequency = prefs.enabled ? prefs.frequency : "off";
  const styles = Object.entries(prefs.confirmedStyles).filter(
    ([, value]) => value !== undefined
  );

  return (
    <Sheet onOpenChange={setSettingsOpen} open={settingsOpen}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>How I'm helping</SheetTitle>
          <SheetDescription>
            I always answer first. Now and then I may add one short, optional
            tip for working with AI. You decide how often.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 text-muted-foreground text-sm">
          <Section title="Tips">
            <Segmented
              label="How often to show tips"
              onChange={setFrequency}
              options={FREQUENCY_OPTIONS}
              value={frequency}
            />
            <p>{FREQUENCY_HINTS[frequency]}</p>
          </Section>

          <Section title="Point out assumptions I made">
            <Segmented
              label="Point out assumptions"
              onChange={setShowAssumptions}
              options={ON_OFF_OPTIONS}
              value={prefs.showAssumptions ? "on" : "off"}
            />
          </Section>

          <Section title="Hidden tip types">
            {signals.dismissedCategories.length > 0 ? (
              <ul className="space-y-1">
                {signals.dismissedCategories.map((category) => (
                  <HiddenCategoryRow category={category} key={category} />
                ))}
              </ul>
            ) : (
              <p>
                None. Choose "Don't show tips like this" on a tip to hide its
                type.
              </p>
            )}
          </Section>

          <Section title="Remembered preferences">
            {styles.length > 0 ? (
              <ul className="space-y-1">
                {styles.map(([key, value]) => (
                  <li key={key}>
                    {key}: {String(value)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                None yet. If you keep asking for the same thing, like shorter
                answers, I'll ask before remembering it.
              </p>
            )}
          </Section>

          <Section title="How this works">
            <p>
              To decide whether a tip would help, I look at your latest message
              and my answer. Settings stay in this browser and nothing is sent
              to analytics. Tips are suggestions, not judgements of you.
            </p>
          </Section>
        </div>

        <SheetFooter>
          <Button onClick={reset} variant="outline">
            Reset tips and preferences
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
