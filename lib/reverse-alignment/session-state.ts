"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CorrectionKind } from "./preference-detector";
import {
  type CoachingCategory,
  type CoachingPreferences,
  DEFAULT_PREFERENCES,
  DEFAULT_SIGNALS,
  type LearningSignals,
} from "./types";

export type CoachState = {
  prefs: CoachingPreferences;
  signals: LearningSignals;
};

export type DismissKind = "got_it" | "dismiss" | "not_this_kind";

export type CoachEvent =
  | { type: "TURN_COMPLETED"; isSimple: boolean } // dispatch BEFORE preGate for the turn
  | { type: "TIP_SHOWN"; category: CoachingCategory }
  | { type: "TIP_DISMISSED"; category: CoachingCategory; kind: DismissKind }
  | { type: "UNDISMISS_CATEGORY"; category: CoachingCategory } // "Show again" in settings
  | { type: "SET_FREQUENCY"; frequency: CoachingPreferences["frequency"] }
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "SET_SHOW_ASSUMPTIONS"; showAssumptions: boolean }
  | { type: "CORRECTION_SEEN"; kind: CorrectionKind; text: string; at: number }
  | { type: "PREFERENCE_ACCEPTED"; kind: CorrectionKind }
  | { type: "PREFERENCE_DECLINED"; kind: CorrectionKind } // count restarts: may ask again, never every turn
  | { type: "PREFERENCE_CLEARED"; kind: CorrectionKind } // "Forget" in settings
  | { type: "RESET" }
  | { type: "HYDRATE"; state: CoachState };

// Closing a tip with X pushes the next one further away ("a dismissal should reduce future frequency").
// "Got it" is an acknowledgement, not a complaint, so it costs nothing.
export const DISMISS_PENALTY_TURNS = 2;
const RECENT_LIMIT = 5;
const EVIDENCE_LIMIT = 3;

export const INITIAL_STATE: CoachState = {
  prefs: DEFAULT_PREFERENCES,
  signals: DEFAULT_SIGNALS,
};

export function coachReducer(state: CoachState, event: CoachEvent): CoachState {
  const { prefs, signals } = state;
  switch (event.type) {
    case "TURN_COMPLETED":
      return event.isSimple
        ? state
        : {
            ...state,
            signals: {
              ...signals,
              turnsSinceLastTip: signals.turnsSinceLastTip + 1,
            },
          };
    case "TIP_SHOWN":
      return {
        ...state,
        signals: {
          ...signals,
          recentCategoriesShown: [
            ...signals.recentCategoriesShown,
            event.category,
          ].slice(-RECENT_LIMIT),
          turnsSinceLastTip: 0,
        },
      };
    case "TIP_DISMISSED":
      if (event.kind === "not_this_kind") {
        return signals.dismissedCategories.includes(event.category)
          ? state
          : {
              ...state,
              signals: {
                ...signals,
                dismissedCategories: [
                  ...signals.dismissedCategories,
                  event.category,
                ],
              },
            };
      }
      if (event.kind === "dismiss") {
        return {
          ...state,
          signals: {
            ...signals,
            turnsSinceLastTip: Math.min(
              signals.turnsSinceLastTip,
              -DISMISS_PENALTY_TURNS
            ),
          },
        };
      }
      return state;
    case "UNDISMISS_CATEGORY":
      return {
        ...state,
        signals: {
          ...signals,
          dismissedCategories: signals.dismissedCategories.filter(
            (category) => category !== event.category
          ),
        },
      };
    case "SET_FREQUENCY":
      return { ...state, prefs: { ...prefs, frequency: event.frequency } };
    case "SET_ENABLED":
      return { ...state, prefs: { ...prefs, enabled: event.enabled } };
    case "SET_SHOW_ASSUMPTIONS":
      return {
        ...state,
        prefs: { ...prefs, showAssumptions: event.showAssumptions },
      };
    case "CORRECTION_SEEN":
      return {
        ...state,
        signals: {
          ...signals,
          correctionCounts: {
            ...signals.correctionCounts,
            [event.kind]: (signals.correctionCounts[event.kind] ?? 0) + 1,
          },
          correctionLog: {
            ...signals.correctionLog,
            [event.kind]: [
              ...(signals.correctionLog[event.kind] ?? []),
              { at: event.at, text: event.text },
            ].slice(-EVIDENCE_LIMIT),
          },
        },
      };
    case "PREFERENCE_ACCEPTED":
    case "PREFERENCE_DECLINED":
    case "PREFERENCE_CLEARED": {
      const accepted = event.type === "PREFERENCE_ACCEPTED";
      return {
        prefs: {
          ...prefs,
          confirmedStyles: {
            ...prefs.confirmedStyles,
            [event.kind]: accepted ? true : undefined,
          },
        },
        signals: {
          ...signals,
          correctionCounts: { ...signals.correctionCounts, [event.kind]: 0 },
          // Accepted styles keep their evidence ("learned from"); declined or forgotten ones drop it.
          correctionLog: {
            ...signals.correctionLog,
            [event.kind]: accepted
              ? signals.correctionLog[event.kind]
              : undefined,
          },
        },
      };
    }
    case "RESET":
      return INITIAL_STATE;
    case "HYDRATE":
      return event.state;
    default:
      return state;
  }
}

const STORAGE_KEY = "reverse-alignment:coach:v1";

function load(): CoachState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CoachState>;
    return {
      prefs: { ...DEFAULT_PREFERENCES, ...parsed.prefs },
      signals: { ...DEFAULT_SIGNALS, ...parsed.signals },
    };
  } catch {
    return null;
  }
}

/** Session-local coach state, persisted to localStorage. Starts from defaults on the server and first render. */
export function useCoachState() {
  const [state, rawDispatch] = useReducer(coachReducer, INITIAL_STATE);
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = load();
    if (saved) {
      rawDispatch({ state: saved, type: "HYDRATE" });
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode): state still works for this page.
    }
  }, [state]);

  const dispatch = useCallback((event: CoachEvent) => rawDispatch(event), []);
  return { dispatch, state };
}
