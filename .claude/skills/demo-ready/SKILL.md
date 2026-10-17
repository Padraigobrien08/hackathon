---
name: demo-ready
description: Pre-demo hardening pass — create convincing demo inputs, run the full demo path, and fix only what would break or embarrass on stage. Use when the user says "feature freeze", "get it demo ready", "will this break on stage?", "we need demo data", or asks to rehearse, and around 15:00.
---

Goal: the demo works every time. Do not add features.

1. Read `CLAUDE.md` and the code to find the main demo flow.
2. **Demo data:** write 3 realistic, impressive inputs for that flow into `demo/inputs.md` (create it) — one "happy path" showcase, one that shows something clever, one backup. Realistic beats lorem ipsum: real-looking names, documents, numbers.
3. **Run the flow** with each input against the running app (`pnpm dev`; real mode if `USE_MOCK=0` in `.env.local`). Report actual responses and how long each took.
4. **Fix only demo-breakers**, smallest fix first: crashes, blank/ugly error states, very slow responses (suggest lowering `EFFORT` or caching a known-good response), raw JSON or markdown showing in the UI, broken layout at laptop/projector width.
5. **Fallback:** if a real-LLM call is slow or flaky, add a hardcoded known-good response for the exact demo inputs so the live demo can't fail.
6. Output a short checklist: what was fixed, what's still risky, and the exact steps to run the demo.
