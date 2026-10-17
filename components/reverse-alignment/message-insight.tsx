"use client";

import { useCallback } from "react";
import type { DismissKind } from "@/lib/reverse-alignment/session-state";
import type { CoachingDecision } from "@/lib/reverse-alignment/types";
import { useCoach } from "./coach-provider";
import { InsightCard } from "./insight-card";

const MOCK_INSIGHT: CoachingDecision = {
  category: "assumption",
  confidence: 0.9,
  insight:
    "I assumed the email should sound formal. You can mention the relationship or tone if you want it tailored.",
};

/** Mounted under every finished assistant message; renders a tip only if one was decided for it. */
export function MessageInsight({ messageId }: { messageId: string }) {
  const { insights, setInsight, dispatch, mockCard } = useCoach();
  const stored = insights.get(messageId);
  const decision =
    stored === null
      ? undefined
      : (stored ?? (mockCard ? MOCK_INSIGHT : undefined));

  const onDismiss = useCallback(
    (kind: DismissKind) => {
      if (!decision) {
        return;
      }
      setInsight(messageId, null);
      dispatch({ category: decision.category, kind, type: "TIP_DISMISSED" });
    },
    [decision, dispatch, messageId, setInsight]
  );

  if (!decision) {
    return null; // no tip for this message, or it was dismissed
  }
  return (
    <InsightCard decision={decision} onDismiss={onDismiss} scripted={!stored} />
  );
}
