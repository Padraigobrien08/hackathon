# Hackathon project

6-hour hackathon (Edinburgh AI, Sat 17 Oct). Hacking 10:00–16:00, judging after.
**Priority: a working, demoable feature over clean code.** No refactors, no tests, hardcoding is fine.

## Stack
- Backend: FastAPI, Python 3.12, managed with `uv` — `backend/app/main.py` (routes + Pydantic contract), `backend/app/llm.py` (all LLM calls).
- Frontend: React + TypeScript + Vite — `frontend/src/App.tsx`, `frontend/src/api.ts` (typed client mirroring the Pydantic models).
- Vite proxies `/api/*` to `localhost:8000`; frontend always calls relative `/api/...` URLs.

## Run
- `./dev.sh` — starts backend (:8000) and frontend (:5173).
- Backend only: `cd backend && uv run uvicorn app.main:app --reload --port 8000`
- Typecheck frontend: `cd frontend && npx tsc -b`
- `USE_MOCK=1` in `backend/.env` returns fake LLM answers (default). `USE_MOCK=0` + `ANTHROPIC_API_KEY` uses Claude.

## Rules
- The API contract lives in BOTH `main.py` (Pydantic) and `api.ts` (TS types). Change them together, in the same commit.
- Every new LLM feature must keep working in mock mode, so teammates without a key aren't blocked.
- Three people work on `main` in parallel: keep changes small and inside the files your task needs.
- After a change, verify it: curl the endpoint and/or check it in the browser. Don't say done without checking.
- After 15:00 (feature freeze): bug fixes and demo polish only.
- Speed over ceremony today: only show a plan first for multi-feature work; otherwise just build and report.
- This repo uses Vite + npm and plain CSS (not Next.js/pnpm/shadcn) — stick with it; switching mid-hackathon costs too much time.

## Lessons (add one line each time Claude gets the same thing wrong twice)
-
