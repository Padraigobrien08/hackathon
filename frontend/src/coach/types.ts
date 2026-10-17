// Frontend-only learning state (session-local; the backend is stateless). Owner: Dev 3.
import type { CoachingCategory, Preferences } from '@/api'

export type CoachingPreferences = {
  enabled: boolean
  frequency: 'off' | 'low' | 'normal'
  showAssumptions: boolean
  confirmedStyles: Preferences // sent to /api/chat as `preferences`
}

export type LearningSignals = {
  recentCategoriesShown: CoachingCategory[]
  turnsSinceLastTip: number // eligible (non-simple) turns only
  dismissedCategories: CoachingCategory[]
  correctionCounts: Record<string, number>
}

export const COOLDOWN = { low: 5, normal: 3 } as const

export const DEFAULT_PREFERENCES: CoachingPreferences = {
  enabled: true,
  frequency: 'normal',
  showAssumptions: true,
  confirmedStyles: {},
}

export const DEFAULT_SIGNALS: LearningSignals = {
  recentCategoriesShown: [],
  // Start AT the cooldown so the first eligible turn can show a tip (otherwise nothing before turn 4).
  turnsSinceLastTip: COOLDOWN.normal,
  dismissedCategories: [],
  correctionCounts: {},
}
