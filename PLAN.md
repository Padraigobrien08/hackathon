# Reverse Alignment — Build Plan

An AI chat assistant that answers first, and occasionally (optionally) helps the user get better at working with AI.
Full spec: `reverse_alignment_hackathon_spec.md` (shared separately). This file is how we build it **in this repo**.

**Principle:** Help first. Teach second. Never interrupt unless it materially improves the outcome.

## Stack decision

We build on this starter (Vite + React + FastAPI), **not** the Vercel Next.js template the spec mentions.
The spec allows adapting the layout; the starter already has mock mode, proxy, shadcn and structured outputs.
Trade-off: no streaming responses (a loading skeleton instead). No acceptance criterion needs streaming.

## Systems

```
[S1 Chat UI] --messages + approved prefs--> [S2 /api/chat] --reply--> render immediately
     |
     +-- after render (never blocks the answer):
         [S4 preGate] --pass--> [S3 /api/coach] --decision--> [S4 shouldShowTip] --> [S6 card]
         [S5 correction detector] --2 consistent corrections--> preference prompt (S6)
                                    user feedback (dismiss / fewer / accept) --> [S4 learning state]
```

| # | System | Owner | Files |
|---|---|---|---|
| S1 | Chat surface: multi-turn thread, composer, loading/error | Dev 1 | `frontend/src/App.tsx`, `components/chat/*` |
| S2 | Assistant generation: history + approved prefs → reply | Dev 2 | `backend/app/llm.py` (`chat()`), `main.py` |
| S3 | Coach observer: structured `CoachingDecision`, fixtures, never raises | Dev 2 | `backend/app/coach.py` |
| S4 | Policy + learning state: preGate, shouldShowTip, reducer, localStorage | Dev 3 | `frontend/src/coach/{types,policy,state}.ts` |
| S5 | Correction detection → preference prompt → adaptation | Dev 3 | `frontend/src/coach/corrections.ts` |
| S6 | Coaching UI: InsightCard, PreferencePrompt, CoachSettings | Dev 1 | `components/coach/*` |
| S7 | Demo script, `?demo=1` override, P0 checks, backup video | All (after 14:30) | — |

**Ownership rules (we all work on `main`):** only Dev 1 edits `App.tsx`; others export hooks/components for it.
Only Dev 2 edits the contract (`main.py` + `api.ts`, always together).

## Contracts (locked at M0)

```ts
POST /api/chat
  req:  { messages: {role: "user"|"assistant", content}[], preferences: { concise?, technicalDetail?: "low"|"normal"|"high" } }
  res:  { reply: string, mock: boolean }

POST /api/coach      // only the last exchange: minimum context
  req:  { userMessage: string, assistantReply: string }
  res:  { decision: CoachingDecision, isSimple: boolean, isSensitive: boolean, source: "llm"|"fixture" }

CoachingDecision = { category: "missing_context"|"assumption"|"verification"|"delegation"|"none",
                     insight?, whyRelevant?, confidence, assumedDetail? }
```

`CoachingPreferences` and `LearningSignals` are frontend-only (`frontend/src/coach/types.ts`); the backend stays stateless.

## Key design rules

- **Two gates.** `preGate(prefs, signals)` runs *before* calling the observer (enabled, frequency, cooldown), so most turns cost no LLM call. `shouldShowTip(...)` (spec §6) runs on the observer's decision.
- **Cooldown start.** `turnsSinceLastTip` starts at the cooldown value, otherwise no tip is possible before turn 4. Only non-simple turns count toward eligibility.
- **Confidence is a knob, not truth.** The real guard is the observer prompt preferring `none`, plus the isSimple/isSensitive flags.
- **One card per turn.** A preference prompt suppresses any tip on that turn.
- **Observer failure = silence.** Frontend aborts `/api/coach` after ~8s; backend returns `none` on any error.
- **Honest fixtures.** Mock/fixture decisions carry `source: "fixture"`. `?demo=1` (cooldown 0) shows a visible badge.
- **Never:** scores, grades, forced rewrites, withheld answers, a tip after every message.

## Milestones (hacking 10:00–16:00, freeze 15:00)

| # | By | Milestone | Gate |
|---|---|---|---|
| M0 | 11:15 | Contracts locked; `/api/chat` + `/api/coach` return mock data | curl both in mock mode; `npx tsc -b` passes |
| M1 | 12:15 | Parallel: S1 multi-turn chat · S2 real `chat()` · S3 structured observer · S4 reducer + policy | Chat keeps history; hard-coded InsightCard renders; observer returns valid JSON for 3 fixtures |
| M2 | 13:15 | **End-to-end:** chat → answer → coach → card or nothing | Email → tip; "8 × 9" → none; `/api/coach` down → chat unaffected |
| M3 | 13:45 | Feedback + settings | Got it / Don't show this kind / Fewer / Off each change the next turn |
| M4 | 14:30 | Corrections → preference prompt → adaptation | 2× "shorter" → prompt → accept → new task is concise; Reset clears |
| M5 | 15:00 | Tone tuning, abstention checks, fade (stretch) | P0 list (spec §11) passes by hand. **FREEZE** |
| M6 | 16:00 | Demo rehearsal ×3, backup video, pitch | 3-min script runs clean in mock and real mode |

**Cut list:** streaming, auth/DB, retrospective view (spec P2), RL / learner models, multiple providers.

**Biggest risk:** observer over-triggers or gives generic tips (feels like a grader).
**Fallback:** fixtures + `?demo=1` guarantee the demo path, labelled honestly.

## Demo fixtures (mock mode, `backend/app/coach.py`)

| User message contains | Decision |
|---|---|
| "email" | `assumption`: formal tone / annual leave |
| "compare", "claim", "which is right" | `verification`: check source dates |
| "plan", "schedule", "steps" | `missing_context`: audience + deadline |
| arithmetic / ≤3 words | `none`, `isSimple: true` |
| crisis / self-harm terms | `none`, `isSensitive: true` |
