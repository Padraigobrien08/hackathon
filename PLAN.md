# Reverse Alignment — Build Plan

An AI chat assistant that answers first, and occasionally (optionally) helps the user get better at working with AI.
Foundation: the Vercel AI Chatbot template (Next.js 16, AI SDK 7), calling Claude directly via `@ai-sdk/anthropic`.

**Principle:** Help first. Teach second. Never interrupt unless it materially improves the outcome.

## Systems

```
[S1 template chat UI] --useChat stream--> [S2 app/(chat)/api/chat] --streamed answer--> renders as it arrives
     |
     +-- on stream finish (never blocks the answer):
         [S4 preGate] --pass--> [S3 /api/coach] --decision--> [S4 shouldShowTip] --> [S6 card under message]
         [S5 correction detector] --2 consistent corrections--> preference prompt (S6)
                                    user feedback (dismiss / fewer / accept) --> [S4 learning state]
                                    accepted styles --> sent with next chat request --> S2 system prompt
```

| # | System | Owner | Files |
|---|---|---|---|
| S1 | Chat surface: the template's UI, trimmed (hide model selector, attachments; demo prompts as suggestions) | Dev 1 | `components/chat/multimodal-input.tsx`, `lib/constants.ts` |
| S2 | Assistant: accept `preferences` in the request, add them to the system prompt | Dev 2 | `app/(chat)/api/chat/{route,schema}.ts`, `lib/ai/prompts.ts` |
| S3 | Coach observer: structured `CoachingDecision`, fixtures in mock mode, never throws | Dev 2 | `app/(chat)/api/coach/route.ts`, `lib/reverse-alignment/{observer,fixtures}.ts` |
| S4 | Policy + learning state: preGate, shouldShowTip, reducer, localStorage | Dev 3 | `lib/reverse-alignment/{policy,session-state}.ts` |
| S5 | Correction detection → preference prompt → adaptation | Dev 3 | `lib/reverse-alignment/preference-detector.ts` |
| S6 | Coaching UI: insight card, preference prompt, "How I'm helping" settings; trigger coach on finish | Dev 1 | `components/reverse-alignment/*`, `components/chat/message.tsx`, `hooks/use-active-chat.tsx` |
| S7 | Demo script, `?demo=1` override, P0 checks, backup video | All (after 14:30) | — |

**Hotspots (one owner each):** `components/chat/message.tsx` + `hooks/use-active-chat.tsx` → Dev 1.
`app/(chat)/api/chat/*` + `lib/ai/*` → Dev 2. `lib/reverse-alignment/types.ts` is the shared contract: change only after telling the team.

### Where the template hooks in
- **Send preferences:** `hooks/use-active-chat.tsx` → `prepareSendMessagesRequest` builds the request body; add `preferences` there, and to `postRequestBodySchema` in `schema.ts`.
- **Trigger the coach:** `useChat({ onFinish })` in the same hook fires when the stream ends. Call `/api/coach` there with an ~8s `AbortController`.
- **Render the card:** done. `components/chat/message.tsx` mounts `<MessageInsight messageId>` after the actions (not while `isLoading`). It reads tips from `CoachProvider` (`components/reverse-alignment/coach-provider.tsx`, mounted in `app/(chat)/layout.tsx` around `ActiveChatProvider`). M2: call `useCoach().setInsight(messageId, decision)` and `dispatch(...)` from `onFinish`; delete the `?mockcard=1` path in `message-insight.tsx`.
- **System prompt:** `lib/ai/prompts.ts` (`regularPrompt` / `systemPrompt`).
- **Mock mode:** `USE_MOCK=1` → `lib/ai/models.mock.ts`. The coach route must check `useMock` from `lib/ai/providers.ts` and return fixtures.

## Contract (`lib/reverse-alignment/types.ts`)

```ts
POST /api/coach      // last exchange only: minimum context
  req:  { userMessage, assistantReply }
  res:  { decision: CoachingDecision, isSimple, isSensitive, source: "llm" | "fixture" }

POST /api/chat       // template's existing body, plus:
  preferences?: { concise?: boolean, technicalDetail?: "low" | "normal" | "high" }   // user-APPROVED only

CoachingDecision = { category: "missing_context"|"assumption"|"verification"|"delegation"|"none",
                     insight?, whyRelevant?, confidence, assumedDetail? }
```

## Key design rules

- **Two gates.** `preGate(prefs, signals)` runs *before* calling the observer (enabled, frequency, cooldown), so most turns cost no LLM call. `shouldShowTip(...)` (spec §6) runs on the observer's decision.
- **Cooldown start.** `turnsSinceLastTip` starts at the cooldown value, otherwise no tip is possible before turn 4. Only non-simple turns count.
- **Confidence is a knob, not truth.** The real guard is the observer prompt preferring `none`, plus deterministic isSimple/isSensitive checks before any model call.
- **One card per turn.** A preference prompt suppresses any tip on that turn.
- **Observer failure = silence.** Abort after ~8s; the route returns `none` on any error.
- **Honest fixtures.** Fixture decisions carry `source: "fixture"`. `?demo=1` (cooldown 0) shows a visible badge.
- **Never:** scores, grades, forced rewrites, withheld answers, a tip after every message.

## Milestones (hacking 10:00–16:00, freeze 15:00)

| # | Milestone | Gate |
|---|---|---|
| M0 | ✅ Template running locally on Claude (mock by default); contract in `types.ts` | Guest chat streams an answer and saves to Postgres |
| M1 | ✅ Parallel: S1 trim UI · S3 `/api/coach` with fixtures + real structured call · S4 reducer + policy · S6 static insight card | `/api/coach` curl returns valid JSON for 3 fixtures; card renders under a message |
| M2 | **End-to-end:** answer finishes → coach → card or nothing | Email → tip; "8 × 9" → none; `/api/coach` down → chat unaffected |
| M3 | Feedback + settings | Got it / Don't show this kind / Fewer / Off each change the next turn |
| M4 | Corrections → preference prompt → adaptation (S2 + S5) | 2× "shorter" → prompt → accept → new task is concise; Reset clears |
| M5 | Tone tuning, abstention checks, fade (stretch). **15:00 FREEZE** | P0 list (spec §11) passes by hand |
| M6 | Demo rehearsal ×3, backup video, pitch | 3-min script runs clean in mock and real mode |

**Cut list:** artifacts/documents, weather tool, file uploads, model selector, login/register UI, retrospective view (spec P2), RL / learner models.

**Biggest risk:** observer over-triggers or gives generic tips (feels like a grader).
**Fallback:** fixtures + `?demo=1` guarantee the demo path, labelled honestly.

## Demo fixtures (mock mode)

| User message contains | Decision |
|---|---|
| "email" | `assumption`: formal tone / annual leave |
| "compare", "claim", "which is right" | `verification`: check source dates |
| "plan", "schedule", "steps" | `missing_context`: audience + deadline |
| arithmetic / ≤3 words | `none`, `isSimple: true` |
| crisis / self-harm terms | `none`, `isSensitive: true` |

The Python version of these fixtures (regexes + insight text) is in git history: `git show 5672fc2:backend/app/coach.py`; port it to `lib/reverse-alignment/fixtures.ts`.
