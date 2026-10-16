---
name: add-feature
description: Add a new feature end to end in this hackathon app — API contract, mock + real backend, and UI wiring — then verify it runs. Use whenever the user wants to build, add, or wire up something new: "add a X endpoint", "let's build the summary feature", "make it also do Y", "hook this up to the UI", or any new AI capability.
---

Add the feature described in the arguments, in this order. Keep it minimal: the smallest version that demos well.

1. **Contract first.** Propose the request/response shape in one short block and state it before writing code. Add the Pydantic models + route in `backend/app/main.py` and the matching TS types + fetch function in `frontend/src/api.ts`.
2. **Mock path.** Make the route return realistic fake data when `llm.USE_MOCK` is true, so the frontend can be built immediately.
3. **Real path.** Add the LLM logic in `backend/app/llm.py` (reuse the existing client and call pattern). If structured output is needed, ask the model for JSON and parse it defensively, falling back to a sensible default.
4. **UI.** Wire it into `frontend/src/App.tsx` (or a new component if App.tsx is getting crowded). Plain and readable beats pretty.
5. **Verify.** Typecheck (`cd frontend && npx tsc -b`), start the backend if it isn't running, curl the new endpoint in mock mode, and report the actual response.
6. **Summarise** in 3–4 lines: the contract, files touched, and anything a teammate needs to know.

Do not refactor unrelated code, add tests, or add dependencies unless the feature can't work without them.
