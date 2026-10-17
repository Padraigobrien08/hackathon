"use client";

import { useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { useCoach } from "./coach-provider";
import { InsightCard } from "./insight-card";
import { useMessageTip } from "./message-insight";
import { PreferenceOfferCard, useMessageOffer } from "./preference-offer";

/** Right-hand panel listing this chat's tips (wide screens only), so answers stay uncluttered. */
export function TipsPanel({
  messages,
  streamingId,
}: {
  messages: ChatMessage[];
  /** The assistant message still streaming: no tip until it finishes. */
  streamingId?: string;
}) {
  const { insights, offers } = useCoach();
  const withTips = messages.filter(
    (m) =>
      m.role === "assistant" &&
      m.id !== streamingId &&
      (insights.get(m.id) || offers.get(m.id))
  );

  return (
    <aside
      aria-label="Tips"
      className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-border/40 border-l px-5 py-7 lg:flex"
      data-testid="tips-panel"
    >
      <h2 className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
        Tips
      </h2>
      {withTips.length === 0 ? (
        <p className="max-w-56 text-[12px] text-muted-foreground/70 leading-relaxed">
          Useful suggestions will appear here as you work.
        </p>
      ) : (
        withTips.map((m) => <TipsPanelItem key={m.id} messageId={m.id} />)
      )}
    </aside>
  );
}

function TipsPanelItem({ messageId }: { messageId: string }) {
  const { onDismiss, openSettings, stored } = useMessageTip(messageId);
  const { offer } = useMessageOffer(messageId);
  const showReply = useCallback(() => {
    document
      .getElementById(`message-${messageId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [messageId]);

  if (!(stored || offer)) {
    return null;
  }
  return (
    <div>
      {offer ? (
        <PreferenceOfferCard messageId={messageId} />
      ) : stored ? (
        <InsightCard
          decision={stored.decision}
          onDismiss={onDismiss}
          onOpenSettings={openSettings}
          onShowAnswer={showReply}
          scripted={stored.scripted}
        />
      ) : null}
    </div>
  );
}
