# PromptFlip

An AI assistant that answers your request first, and occasionally offers one optional tip to help you work better with AI. Built on the [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) template, using OpenAI (`gpt-6-luna`) via `@ai-sdk/openai`.

Plan, systems and owners: [PLAN.md](PLAN.md). Rules for Claude Code: [CLAUDE.md](CLAUDE.md).

## Run it

Needs Node 20+, pnpm, and Docker (for local Postgres).

```bash
docker run -d --name ra-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=chatbot -p 5432:5432 postgres:16-alpine
cp .env.example .env.local      # then set AUTH_SECRET: openssl rand -base64 32
pnpm install
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. You're signed in automatically as a guest. With `USE_MOCK=1` (the default) you get canned answers without an API key.

Already have the container? `docker start ra-postgres`. Port 3000 taken? `PORT=3001 pnpm dev`.

## Turn on real Claude

In `.env.local`: `USE_MOCK=0` and `OPENAI_API_KEY=...`. Only the person with the key needs this.

## Checks

```bash
pnpm exec tsc --noEmit   # typecheck
pnpm check               # lint (Biome)
```
