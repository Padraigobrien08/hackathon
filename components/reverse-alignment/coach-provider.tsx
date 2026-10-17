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
import type { PreferenceOffer } from "@/lib/reverse-alignment/preference-detector";
import {
  type CoachEvent,
  type CoachState,
  useCoachState,
} from "@/lib/reverse-alignment/session-state";
import type {
  CoachingDecision,
  StyleKind,
} from "@/lib/reverse-alignment/types";
import { CollaborationSettings } from "./collaboration-settings";

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
  /** "Remember this?" offers by assistant message id. Replace the tip on that turn. null = answered. */
  offers: ReadonlyMap<string, PreferenceOffer | null>;
  setOffer: (messageId: string, offer: PreferenceOffer | null) => void;
  /** Remembered styles each assistant message was written with. Browser-only, this page only. */
  adaptations: ReadonlyMap<string, StyleKind[]>;
  setAdaptation: (messageId: string, styles: StyleKind[]) => void;
  /** ?demo=1: skip the cooldown (scripted demo; shown with a badge). */
  demo: boolean;
  /** "How I'm helping" panel, opened from the tip card or the sidebar menu. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
};

const CoachContext = createContext<CoachContextValue | null>(null);
const DEMO_KEY = "reverse-alignment:demo";

export function CoachProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useCoachState();
  const [insights, setInsights] = useState<Map<string, StoredInsight | null>>(
    () => new Map()
  );
  const [offers, setOffers] = useState<Map<string, PreferenceOffer | null>>(
    () => new Map()
  );
  const [adaptations, setAdaptations] = useState<Map<string, StyleKind[]>>(
    () => new Map()
  );
  const [demo, setDemo] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const setOffer = useCallback(
    (messageId: string, offer: PreferenceOffer | null) => {
      setOffers((prev) => new Map(prev).set(messageId, offer));
    },
    []
  );

  const setAdaptation = useCallback(
    (messageId: string, styles: StyleKind[]) => {
      setAdaptations((prev) => new Map(prev).set(messageId, styles));
    },
    []
  );

  const value = useMemo(
    () => ({
      adaptations,
      demo,
      dispatch,
      insights,
      offers,
      setAdaptation,
      setInsight,
      setOffer,
      setSettingsOpen,
      settingsOpen,
      state,
    }),
    [
      adaptations,
      demo,
      dispatch,
      insights,
      offers,
      setAdaptation,
      setInsight,
      setOffer,
      settingsOpen,
      state,
    ]
  );

  return (
    <CoachContext.Provider value={value}>
      {children}
      <CollaborationSettings />
      {demo ? (
        <div className="pointer-events-none fixed top-3 right-3 z-50 lg:top-auto lg:bottom-3 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-border/60">
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
