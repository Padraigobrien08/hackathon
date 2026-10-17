"use client";

import { useCallback, useEffect, useRef } from "react";
import { isSimple } from "@/lib/reverse-alignment/fixtures";
import { preGate, shouldShowTip } from "@/lib/reverse-alignment/policy";
import {
  detectCorrection,
  evidenceText,
  offerFor,
} from "@/lib/reverse-alignment/preference-detector";
import {
  type CoachEvent,
  coachReducer,
} from "@/lib/reverse-alignment/session-state";
import { type CoachResponse, STYLE_KINDS } from "@/lib/reverse-alignment/types";
import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";
import { useCoach } from "./coach-provider";

const COACH_TIMEOUT_MS = 8000;

// Fire-and-forget analytics (app/(chat)/api/prompt-metrics). Never awaited, never surfaces errors.
function recordPromptMetric(
  userMessageId: string,
  assistantMessageId: string,
  assistantReply: string
) {
  fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/prompt-metrics`, {
    body: JSON.stringify({ assistantMessageId, assistantReply, userMessageId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}

type FinishInfo = {
  message: ChatMessage;
  messages: ChatMessage[];
  isAbort: boolean;
  isDisconnect: boolean;
  isError: boolean;
};

/**
 * Runs AFTER an answer has finished streaming. Best-effort: any failure means no tip,
 * and nothing here can delay or break the answer itself.
 */
export function useCoachTurn() {
  const { state, dispatch, setInsight, setOffer, setAdaptation, demo } =
    useCoach();
  // onFinish is registered once by useChat, so read the latest coach state through a ref.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return useCallback(
    async ({
      message,
      messages,
      isAbort,
      isDisconnect,
      isError,
    }: FinishInfo) => {
      if (isAbort || isDisconnect || isError || message.role !== "assistant") {
        return;
      }
      const userMessages = messages.filter((m) => m.role === "user");
      const userMessage = userMessages.at(-1);
      const previousUserMessage = userMessages.at(-2);
      const userText = userMessage ? getTextFromMessage(userMessage) : "";
      const previousUserText = previousUserMessage
        ? getTextFromMessage(previousUserMessage)
        : undefined;
      const replyText = getTextFromMessage(message);
      if (userMessage && replyText.trim()) {
        recordPromptMetric(userMessage.id, message.id, replyText);
      }

      // The styles this answer was written with (sent with the request), for the "Adapted" chip.
      const { confirmedStyles } = stateRef.current.prefs;
      setAdaptation(
        message.id,
        STYLE_KINDS.filter((kind) => confirmedStyles[kind])
      );

      // S5 first: "shorter" is a short message, so the isSimple check below would skip it.
      const isFollowUp = messages.filter((m) => m.role === "user").length > 1;
      const correction = detectCorrection(userText, isFollowUp);
      if (correction) {
        const seen: CoachEvent = {
          at: Date.now(),
          kind: correction,
          text: evidenceText(userText),
          type: "CORRECTION_SEEN",
        };
        dispatch(seen);
        const afterSeen = coachReducer(stateRef.current, seen);
        const offer = offerFor(correction, afterSeen.prefs, afterSeen.signals);
        if (offer) {
          setOffer(message.id, offer);
          return; // one card per turn: the offer replaces any tip
        }
      }

      // Simple turns: no observer call, and they don't count toward the cooldown.
      if (!userText.trim() || !replyText.trim() || isSimple(userText)) {
        return;
      }

      const turn: CoachEvent = { isSimple: false, type: "TURN_COMPLETED" };
      dispatch(turn);
      const afterTurn = coachReducer(stateRef.current, turn);
      // Gate 1: most turns stop here without calling the observer.
      if (!preGate(afterTurn.prefs, afterTurn.signals, { demo })) {
        return;
      }

      let response: CoachResponse;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/coach`,
          {
            body: JSON.stringify({
              assistantReply: replyText,
              previousUserMessage: previousUserText,
              userMessage: userText,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
            signal: AbortSignal.timeout(COACH_TIMEOUT_MS),
          }
        );
        if (!res.ok) {
          return;
        }
        response = await res.json();
      } catch {
        return; // timeout or network: stay silent
      }

      // Gate 2, against the latest state (settings may have changed while we waited).
      const { prefs, signals } = stateRef.current;
      if (
        !shouldShowTip(response.decision, prefs, signals, response, { demo })
      ) {
        return;
      }
      setInsight(message.id, {
        decision: response.decision,
        scripted: response.source === "fixture" || demo,
      });
      dispatch({ category: response.decision.category, type: "TIP_SHOWN" });
    },
    [demo, dispatch, setAdaptation, setInsight, setOffer]
  );
}
