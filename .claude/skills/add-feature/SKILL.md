---
name: add-feature
description: Add a new feature end to end in this hackathon app — API contract, mock + real backend, and UI wiring — then verify it runs. Use whenever the user wants to build, add, or wire up something new: "add a X endpoint", "let's build the summary feature", "make it also do Y", "hook this up to the UI", or any new AI capability.
---

Add the feature described in the arguments, in this order. Keep it minimal: the smallest version that demos well.

1. **Contract first.** Propose the request/response shape in one short block and state it before writing code. Add the types to `lib/reverse-alignment/types.ts`.
2. **Mock path.** New routes go in `app/(chat)/api/<name>/route.ts`. When `useMock` (from `lib/ai/providers.ts`) is true, return realistic fake data so others aren't blocked.
3. **Real path.** Call Claude through the AI SDK with `anthropic(...)` from `@ai-sdk/anthropic` (see `lib/ai/providers.ts`; model ids in `lib/ai/models.ts`). When the response is more than plain text, use structured output (`generateText` with `Output.object({ schema })` and a zod schema) so the shape is guaranteed. On error, refusal or an invalid object, return a sensible default in the contract's shape instead of throwing.
4. **UI.** Put new components in `components/reverse-alignment/`. Touch template files (`components/chat/*`, `hooks/use-active-chat.tsx`) only as much as needed to mount them.
5. **Verify.** `pnpm exec tsc --noEmit`, make sure `pnpm dev` is running, curl the route in mock mode (routes need the guest session cookie: `curl -c jar -L localhost:3000/` first, then `-b jar`), and report the actual response.
6. **Summarise** in 3–4 lines: the contract, files touched, and anything a teammate needs to know.

Do not refactor unrelated code, add tests, or add dependencies unless the feature can't work without them.
