"use client";

import { useCallback } from "react";
import type { DismissKind } from "@/lib/reverse-alignment/session-state";
import { useCoach } from "./coach-provider";
import { InsightCard } from "./insight-card";

/** Mounted under every finished assistant message; renders a tip only if one was decided for it. */
export function MessageInsight({ messageId }: { messageId: string }) {
  const { insights, setInsight, dispatch, setSettingsOpen } = useCoach();
  const stored = insights.get(messageId);

  const onDismiss = useCallback(
    (kind: DismissKind) => {
      if (!stored) {
        return;
      }
      setInsight(messageId, null);
      dispatch({
        category: stored.decision.category,
        kind,
        type: "TIP_DISMISSED",
      });
    },
    [stored, dispatch, messageId, setInsight]
  );

  const openSettings = useCallback(
    () => setSettingsOpen(true),
    [setSettingsOpen]
  );

  if (!stored) {
    return null; // no tip for this message, or it was dismissed (null)
  }
  return (
    <InsightCard
      decision={stored.decision}
      onDismiss={onDismiss}
      onOpenSettings={openSettings}
      scripted={stored.scripted}
    />
  );
}
