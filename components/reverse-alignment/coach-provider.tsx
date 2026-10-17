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

export type StoredInsight = {
  decision: CoachingDecision;
  /** Fixture or ?demo=1: the card says "demo" so scripted tips are never passed off as inferred. */
  scripted: boolean;
};

type CoachContextValue = {
  state: CoachState;
  dispatch: (event: CoachEvent) => void;
  /** Tips by assistant message id. Browser-only: never saved with the chat. null = dismissed. */
  insights: ReadonlyMap<string, StoredInsight | null>;
  setInsight: (messageId: string, insight: StoredInsight | null) => void;
  /** ?demo=1: skip the cooldown (scripted demo; shown with a badge). */
  demo: boolean;
};

const CoachContext = createContext<CoachContextValue | null>(null);
const DEMO_KEY = "reverse-alignment:demo";

export function CoachProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useCoachState();
  const [insights, setInsights] = useState<Map<string, StoredInsight | null>>(
    () => new Map()
  );
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    // Read in an effect so server and first client render match. Kept for the browser tab
    // (chat URLs drop the query string), so a reload mid-demo stays in demo mode; ?demo=0 clears it.
    const param = new URLSearchParams(window.location.search).get("demo");
    try {
      if (param !== null) {
        window.sessionStorage.setItem(DEMO_KEY, param === "0" ? "0" : "1");
      }
      setDemo(window.sessionStorage.getItem(DEMO_KEY) === "1");
    } catch {
      setDemo(param !== null && param !== "0");
    }
  }, []);

  const setInsight = useCallback(
    (messageId: string, insight: StoredInsight | null) => {
      setInsights((prev) => new Map(prev).set(messageId, insight));
    },
    []
  );

  const value = useMemo(
    () => ({ demo, dispatch, insights, setInsight, state }),
    [demo, dispatch, insights, setInsight, state]
  );

  return (
    <CoachContext.Provider value={value}>
      {children}
      {demo ? (
        <div className="pointer-events-none fixed top-3 right-3 z-50 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-border/60">
          Demo mode: tip cooldown off
        </div>
      ) : null}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error("useCoach must be used inside <CoachProvider>");
  }
  return context;
}
