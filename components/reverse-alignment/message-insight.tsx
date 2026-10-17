"use client";

import { useCallback } from "react";
import type { DismissKind } from "@/lib/reverse-alignment/session-state";
import { useCoach } from "./coach-provider";
import { InsightCard } from "./insight-card";
import { PreferenceOfferCard, useMessageOffer } from "./preference-offer";

/** The tip decided for one assistant message, plus its actions. Shared by the inline card and <TipsPanel>. */
export function useMessageTip(messageId: string) {
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

  return { onDismiss, openSettings, stored };
}

/** Inline tip under a finished assistant message. Narrow screens only; wide screens use <TipsPanel>. */
export function MessageInsight({ messageId }: { messageId: string }) {
  const { onDismiss, openSettings, stored } = useMessageTip(messageId);
  const { offer } = useMessageOffer(messageId);

  if (offer) {
    return (
      <div className="lg:hidden">
        <PreferenceOfferCard messageId={messageId} />
      </div>
    );
  }
  if (!stored) {
    return null; // no tip for this message, or it was dismissed (null)
  }
  return (
    <div className="lg:hidden">
      <InsightCard
        decision={stored.decision}
        onDismiss={onDismiss}
        onOpenSettings={openSettings}
        scripted={stored.scripted}
      />
    </div>
  );
}
