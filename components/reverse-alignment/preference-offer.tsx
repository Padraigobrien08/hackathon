"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useCoach } from "./coach-provider";

/** The "remember this?" offer for one assistant message, plus its answers. */
export function useMessageOffer(messageId: string) {
  const { offers, setOffer, dispatch } = useCoach();
  const offer = offers.get(messageId);

  const answer = useCallback(
    (accepted: boolean) => {
      if (!offer) {
        return;
      }
      setOffer(messageId, null);
      dispatch({
        kind: offer.kind,
        type: accepted ? "PREFERENCE_ACCEPTED" : "PREFERENCE_DECLINED",
      });
    },
    [offer, dispatch, messageId, setOffer]
  );

  return { answer, offer };
}

/** Asks before remembering a style. Nothing changes unless the user says yes. */
export function PreferenceOfferCard({ messageId }: { messageId: string }) {
  const { answer, offer } = useMessageOffer(messageId);
  const accept = useCallback(() => answer(true), [answer]);
  const decline = useCallback(() => answer(false), [answer]);

  if (!offer) {
    return null;
  }
  return (
    <aside
      aria-label="Remember a preference"
      className="flex animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)] items-start gap-2.5 rounded-lg border border-border/60 border-dashed px-3 py-2.5 text-[13px] text-muted-foreground leading-[1.6]"
      data-testid="preference-offer"
    >
      <SlidersHorizontalIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p>{offer.text}</p>
        <div className="-ml-2.5 flex flex-wrap gap-0.5">
          <Button onClick={accept} size="xs" variant="ghost">
            Yes, remember
          </Button>
          <Button onClick={decline} size="xs" variant="ghost">
            No thanks
          </Button>
        </div>
      </div>
    </aside>
  );
}
