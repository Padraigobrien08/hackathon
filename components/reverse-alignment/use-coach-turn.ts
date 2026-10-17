"use client";

import { useCallback, useEffect, useRef } from "react";
import { isSimple } from "@/lib/reverse-alignment/fixtures";
import { preGate, shouldShowTip } from "@/lib/reverse-alignment/policy";
import {
  type CoachEvent,
  coachReducer,
} from "@/lib/reverse-alignment/session-state";
import type { CoachResponse } from "@/lib/reverse-alignment/types";
import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";
import { useCoach } from "./coach-provider";

const COACH_TIMEOUT_MS = 8000;

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
  const { state, dispatch, setInsight, demo } = useCoach();
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
      const userMessage = messages.findLast((m) => m.role === "user");
      const userText = userMessage ? getTextFromMessage(userMessage) : "";
      const replyText = getTextFromMessage(message);
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
    [demo, dispatch, setInsight]
  );
}
