# Hackathon project: Reverse Alignment

6-hour hackathon (Edinburgh AI, Sat 17 Oct). Hacking 10:00–16:00, judging after.
**Priority: a working, demoable feature over clean code.** No refactors, hardcoding is fine.
Product: a normal AI chat that answers first and occasionally offers ONE optional collaboration tip (or stays silent). See `PLAN.md`.

## Stack (foundation: Vercel AI Chatbot template, github.com/vercel/ai-chatbot)
- Next.js 16 (App Router) + React 19 + TypeScript, AI SDK 7 (`ai`, `@ai-sdk/react` `useChat`), Tailwind v4, shadcn/ui, **pnpm**.
- Template infra: NextAuth guest sessions (`app/(auth)`, `proxy.ts` auto-redirects to guest login), Postgres via Drizzle (`lib/db`). Redis and Blob are optional; leave unset.
- Model: Claude via `@ai-sdk/anthropic` (pinned 4.0.9 to match `ai@7.0.15`; don't bump one without the other). Chat `claude-sonnet-5-5`, titles `claude-haiku-5-5`, set in `lib/ai/models.ts`. No AI Gateway.
- Keep the template's chat UI, streaming, history and message actions. Add our layer on top; don't rebuild what the template already does.

## Where things live
| What | Path |
|---|---|
| Chat route (streamText, system prompt, saves messages) | `app/(chat)/api/chat/route.ts`, request schema `schema.ts` |
| System prompt | `lib/ai/prompts.ts` (`systemPrompt`, `regularPrompt`) |
| Model selection / mock models | `lib/ai/providers.ts`, `lib/ai/models.ts`, `lib/ai/models.mock.ts` |
| Message rendering (insight card goes under the assistant message) | `components/chat/message.tsx`, `messages.tsx`, `message-actions.tsx` |
| Empty-state suggestions (use our demo prompts) | `lib/constants.ts` (`suggestions`) |
| **Our code** | `app/(chat)/api/coach/route.ts`, `lib/reverse-alignment/*` (types, observer, policy, session-state, preference-detector, fixtures), `components/reverse-alignment/*` (insight-card, collaboration-settings) |

## Run
- Postgres: `docker start ra-postgres` (first time: see README). Then `pnpm install`, `pnpm db:migrate`, `pnpm dev` → http://localhost:3000 (`PORT=3001 pnpm dev` if taken).
- Typecheck: `pnpm exec tsc --noEmit`. Policy tests: `pnpm exec tsx --test lib/reverse-alignment/policy.test.ts`. Lint/format: `pnpm check` / `pnpm fix` (Biome via ultracite).
- Env lives in `.env.local` (copy `.env.example`): `AUTH_SECRET`, `POSTGRES_URL`, `USE_MOCK`, `ANTHROPIC_API_KEY`. Never commit `.env.local`.
- **Mock mode:** `USE_MOCK=1` (default) serves `lib/ai/models.mock.ts` via `useMock` in `lib/ai/providers.ts`. Every LLM feature, including the coach, must keep working with `USE_MOCK=1` so teammates without a key aren't blocked.
- **Real mode without an Anthropic key:** `USE_MOCK=0` with only `OPENAI_API_KEY` set uses OpenAI (`gpt-6-luna`) for chat and titles (`lib/ai/providers.ts`); with `ANTHROPIC_API_KEY` set, chat stays on Claude. The coach observer is always OpenAI.
- **Live demo chip:** the "Make me a plan for launching our team newsletter" suggestion (`lib/reverse-alignment/live.ts`, tagged "live") sends `live: true`, so that chat's answers and coach calls use real OpenAI (`gpt-6-luna`) even with `USE_MOCK=1`. Needs `OPENAI_API_KEY` in `.env.local`; without it the chip silently stays mocked. Real observer calls take 5–7s (timeouts: 12s server, 15s client).
- The template's tools (artifacts, weather, suggestions) are off: `getCapabilities()` reports `tools: false`, so answers stay in the chat. Model selector, attachments, visibility selector and Vercel links are hidden in the UI.
- Guest message cap raised to 500/hour in `lib/ai/entitlements.ts` (template default 10/hour blocks demo rehearsals). Lower it before any public deploy.
- Fallback: if auth/DB breaks and costs more than ~30 min, run an unauthenticated session per the spec; don't debug infra all day.

## Rules
- **The coach never blocks the answer.** It runs after the stream finishes (separate `/api/coach` call). If it fails or times out, the chat is unaffected and shows nothing.
- Shared contracts live in `lib/reverse-alignment/types.ts` (one file, used by route and UI). Change it only after telling the team.
- No scores, grades, forced rewrites, or a tip after every message. Silence is the default outcome. One deliberate exception: the weak/moderate/strong prompt tier (on by default, user can turn it off; see PLAN.md "Prompt tier").
- Fixture/scripted coaching is labelled (`source: "fixture"`); never present it as inferred.
- Three people work on `main` in parallel: stay inside the files your task needs. `components/chat/message.tsx` and the chat route are hotspots: one owner each (see `PLAN.md`). Use `/sync` to commit, pull and push.
- After a change, verify it: typecheck, curl the route and/or check it in the browser. Don't say done without checking.
- After 15:00 (feature freeze): bug fixes and demo polish only.
- Speed over ceremony today: only show a plan first for multi-feature work; otherwise just build and report.

## Lessons (add one line each time Claude gets the same thing wrong twice)
-
