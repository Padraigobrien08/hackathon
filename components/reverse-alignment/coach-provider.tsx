"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
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
  PromptStrength,
  StyleKind,
} from "@/lib/reverse-alignment/types";
import { CollaborationSettings } from "./collaboration-settings";

export type StoredInsight = {
  decision: CoachingDecision;
  /** Mock-mode fixture: the card says "demo" so scripted tips are never passed off as inferred. */
  scripted: boolean;
};

export type StoredStrength = {
  /** "pending" while the coach is still rating the prompt: shown as a placeholder bar. */
  strength: PromptStrength | "pending";
  /** Mock-mode fixture, as for tips. */
  scripted: boolean;
};

type CoachContextValue = {
  state: CoachState;
  dispatch: (event: CoachEvent) => void;
  /** Tips by assistant message id. Persisted per chat; null = dismissed. */
  insights: ReadonlyMap<string, StoredInsight | null>;
  setInsight: (messageId: string, insight: StoredInsight | null) => void;
  replaceInsights: (insights: Map<string, StoredInsight>) => void;
  /** "Remember this?" offers by assistant message id. Replace the tip on that turn. null = answered. */
  offers: ReadonlyMap<string, PreferenceOffer | null>;
  setOffer: (messageId: string, offer: PreferenceOffer | null) => void;
  /** Remembered styles each assistant message was written with. Browser-only, this page only. */
  adaptations: ReadonlyMap<string, StyleKind[]>;
  setAdaptation: (messageId: string, styles: StyleKind[]) => void;
  /** Prompt tiers by USER message id. Browser-only; shown only while prefs.showStrength is on. */
  strengths: ReadonlyMap<string, StoredStrength>;
  /** null removes it (e.g. the coach failed or returned no tier). */
  setStrength: (messageId: string, strength: StoredStrength | null) => void;
  /** "How I'm helping" panel, opened from the tip card or the sidebar menu. */
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
};

const CoachContext = createContext<CoachContextValue | null>(null);

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
  const [strengths, setStrengths] = useState<Map<string, StoredStrength>>(
    () => new Map()
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setInsight = useCallback(
    (messageId: string, insight: StoredInsight | null) => {
      setInsights((prev) => new Map(prev).set(messageId, insight));
      if (insight === null) {
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/coach/insights?assistantMessageId=${encodeURIComponent(messageId)}`,
          { keepalive: true, method: "DELETE" }
        ).catch(() => undefined);
      }
    },
    []
  );

  const replaceInsights = useCallback(
    (persisted: Map<string, StoredInsight>) => setInsights(persisted),
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

  const setStrength = useCallback(
    (messageId: string, strength: StoredStrength | null) => {
      setStrengths((prev) => {
        const next = new Map(prev);
        if (strength) {
          next.set(messageId, strength);
        } else {
          next.delete(messageId);
        }
        return next;
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      adaptations,
      dispatch,
      insights,
      offers,
      replaceInsights,
      setAdaptation,
      setInsight,
      setOffer,
      setSettingsOpen,
      setStrength,
      settingsOpen,
      state,
      strengths,
    }),
    [
      adaptations,
      dispatch,
      insights,
      offers,
      replaceInsights,
      setAdaptation,
      setInsight,
      setOffer,
      setStrength,
      settingsOpen,
      state,
      strengths,
    ]
  );

  return (
    <CoachContext.Provider value={value}>
      {children}
      <CollaborationSettings />
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
