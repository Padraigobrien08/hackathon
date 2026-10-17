"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CoachEvent,
  type CoachState,
  useCoachState,
} from "@/lib/reverse-alignment/session-state";
import type { CoachingDecision } from "@/lib/reverse-alignment/types";

type CoachContextValue = {
  state: CoachState;
  dispatch: (event: CoachEvent) => void;
  /** Tips by assistant message id. Browser-only: never saved with the chat. null = dismissed. */
  insights: ReadonlyMap<string, CoachingDecision | null>;
  setInsight: (messageId: string, decision: CoachingDecision | null) => void;
  /** ?demo=1: skip the cooldown (scripted demo; shown with a badge). */
  demo: boolean;
  /** ?mockcard=1 (M1 only): fixed tip on every answer for building the card. Removed in M2. */
  mockCard: boolean;
};

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useCoachState();
  const [insights, setInsights] = useState<
    Map<string, CoachingDecision | null>
  >(() => new Map());
  const [flags, setFlags] = useState({ demo: false, mockCard: false });

  useEffect(() => {
    // Read in an effect so server and first client render match.
    const params = new URLSearchParams(window.location.search);
    setFlags({ demo: params.has("demo"), mockCard: params.has("mockcard") });
  }, []);

  const setInsight = useCallback(
    (messageId: string, decision: CoachingDecision | null) => {
      setInsights((prev) => new Map(prev).set(messageId, decision));
    },
    []
  );

  const value = useMemo(
    () => ({ dispatch, insights, setInsight, state, ...flags }),
    [dispatch, insights, setInsight, state, flags]
  );

  return (
    <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error("useCoach must be used inside <CoachProvider>");
  }
  return context;
}
