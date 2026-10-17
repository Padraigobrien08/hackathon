"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useCallback } from "react";
import { STYLE_LABELS } from "@/lib/reverse-alignment/preference-detector";
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

/** "Adapted: short answers" under a reply written with remembered styles. Opens the settings panel. */
function AdaptedChip({ messageId }: { messageId: string }) {
  const { adaptations, setSettingsOpen } = useCoach();
  const styles = adaptations.get(messageId);
  const open = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
  if (!styles?.length) {
    return null;
  }
  const labels = styles.map((kind) => STYLE_LABELS[kind].toLowerCase());
  return (
    <button
      className="flex w-fit items-center gap-1.5 rounded-md px-1 text-[11px] text-muted-foreground/80 hover:text-foreground"
      data-testid="adapted-chip"
      onClick={open}
      title="Remembered from your corrections. Change it in How I'm helping."
      type="button"
    >
      <SlidersHorizontalIcon aria-hidden className="size-3" />
      Adapted: {labels.join(", ")}
    </button>
  );
}

/** Under a finished assistant message: the "Adapted" chip, then the tip or offer (narrow screens; wide screens use <TipsPanel>). */
export function MessageInsight({ messageId }: { messageId: string }) {
  return (
    <>
      <AdaptedChip messageId={messageId} />
      <MessageTipOrOffer messageId={messageId} />
    </>
  );
}

function MessageTipOrOffer({ messageId }: { messageId: string }) {
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
