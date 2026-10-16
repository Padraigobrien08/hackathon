# Hackathon Starter

FastAPI backend + React (Vite) frontend, already wired together. Works in **mock mode** with no API key, so everyone can build straight away.

## Run it (everyone, tonight)

Needs: [uv](https://docs.astral.sh/uv/) and Node 20+.

```bash
./dev.sh
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000 (API docs at http://localhost:8000/docs)

If you see a page, type a question, and get a `[mock]` answer back, you're set.

## Turn on real Claude

In `backend/.env`: set `USE_MOCK=0` and `ANTHROPIC_API_KEY=...`. Only the person with the key needs this; everyone else can stay on mock.

## The contract (don't change without telling the team)

```
POST /api/ask
  request:  { question: string, context?: string }
  response: { answer: string, sources: {title, snippet}[], mock: boolean }
```

Defined in `backend/app/main.py` (Pydantic) and mirrored in `frontend/src/api.ts`. Add new endpoints the same way: write the types in both places **first**, return fake data, then make it real.

## Who owns what

| Area | Files | Owner |
|---|---|---|
| AI / backend logic | `backend/app/llm.py`, `backend/app/main.py` | |
| UI | `frontend/src/App.tsx`, `index.css` | |
| Demo + pitch | demo inputs, slides, backup video | |

## Rules for the day

1. Commit small and often; `git pull --rebase` before pushing.
2. Work on `main` for speed, but **only touch your own files** where possible.
3. Get the front end and backend running together on real data by **13:30**.
4. **15:00 = feature freeze.** Only bug fixes and demo polish after that.
5. Hardcode freely. Fake anything that isn't the core demo.
