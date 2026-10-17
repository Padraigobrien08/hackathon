# PromptFlip

An AI assistant that answers your request first, and occasionally offers one optional tip to help you work better with AI. Built on the [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) template, using OpenAI (`gpt-6-luna`) via `@ai-sdk/openai`.

Plan, systems and owners: [PLAN.md](PLAN.md). Rules for Claude Code: [CLAUDE.md](CLAUDE.md).

## Run it

Needs Node 20+, pnpm, and Docker (for local Postgres).

```bash
make start                          # first run: checks tools, creates .env.local, installs, starts Postgres, migrates, runs the app
make real OPENAI_API_KEY=sk-...     # optional: real OpenAI answers (default is mock mode, no key needed)
make help                           # everything else: status, open, check, eval, stop
```

Then open http://localhost:3000. Port taken? `make start PORT=3001`. Postgres port taken? `make start DB_PORT=5433`.

Manual steps, if you'd rather not use make:

```bash
docker run -d --name ra-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=chatbot -p 5432:5432 postgres:16-alpine
cp .env.example .env.local      # then set AUTH_SECRET: openssl rand -base64 32
pnpm install
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. You're signed in automatically as a guest. With `USE_MOCK=1` (the default) you get canned answers without an API key.

Already have the container? `docker start ra-postgres`. Port 3000 taken? `PORT=3001 pnpm dev`.

## Turn on real OpenAI answers

In `.env.local`: `USE_MOCK=0` and `OPENAI_API_KEY=...`. Only the person with the key needs this.

## Checks

```bash
pnpm exec tsc --noEmit   # typecheck
pnpm check               # lint (Biome)
```
