"use client";

import { LightbulbIcon } from "lucide-react";
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
      className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-border/40 border-l px-4 py-6 lg:flex"
      data-testid="tips-panel"
    >
      <h2 className="flex items-center gap-1.5 font-medium text-[13px] text-muted-foreground">
        <LightbulbIcon aria-hidden className="size-3.5" />
        Tips
      </h2>
      {withTips.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
          Most answers won't need one. If a small change to how you ask would
          help, it shows up here.
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
    <div className="space-y-1">
      {offer ? (
        <PreferenceOfferCard messageId={messageId} />
      ) : stored ? (
        <InsightCard
          decision={stored.decision}
          onDismiss={onDismiss}
          onOpenSettings={openSettings}
          scripted={stored.scripted}
        />
      ) : null}
      <button
        className="px-1 text-[11px] text-muted-foreground/70 hover:text-foreground"
        onClick={showReply}
        type="button"
      >
        Show the answer
      </button>
    </div>
  );
}
