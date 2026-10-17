# PromptFlip: one-command setup and run.
#
#   make start                      set everything up (first time) and run the app
#   make real OPENAI_API_KEY=sk-... switch to real OpenAI answers
#   make help                       list everything
#
# Safe to re-run: nothing here deletes data or overwrites an existing .env.local.

SHELL := /bin/bash
.DEFAULT_GOAL := help

PORT ?= 3000
DB_CONTAINER ?= ra-postgres
DB_PORT ?= 5432
DB_IMAGE ?= postgres:16-alpine
ENV_FILE := .env.local
URL := http://localhost:$(PORT)

# Colours only when writing to a terminal.
ifneq ($(TERM),)
  B := \033[1m
  G := \033[32m
  Y := \033[33m
  R := \033[31m
  N := \033[0m
endif

.PHONY: help setup start dev deps env install db migrate mock real status open check test eval stop

help: ## Show this list
	@printf "$(B)PromptFlip$(N): an AI chat that rates your prompt (weak / moderate / strong)\n"
	@printf "and asks one question back when it's weak.\n\n"
	@printf "$(B)Quick start$(N)\n  make start                       set up (first time) and run on $(URL)\n"
	@printf "  make real OPENAI_API_KEY=sk-...  use real OpenAI answers (default: mock, no key needed)\n\n"
	@printf "$(B)All targets$(N)\n"
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  $(G)%-9s$(N) %s\n", $$1, $$2}'
	@printf "\nOptions: PORT=3001 (app port), DB_PORT=5433 (if 5432 is taken)\n"

setup: deps env install db migrate ## Check tools, create .env.local, install, start Postgres, migrate
	@printf "\n$(G)✓ Setup done.$(N) Run $(B)make dev$(N), then open $(URL)\n"

start: setup dev ## Setup (if needed) and run the app

dev: ## Run the app on PORT (default 3000)
	@printf "$(B)Starting PromptFlip on $(URL)$(N) (mode: $$(grep -q '^USE_MOCK=0' $(ENV_FILE) 2>/dev/null && echo real || echo mock)). Ctrl+C to stop.\n\n"
	@PORT=$(PORT) pnpm dev

deps: ## Check Node 20+, pnpm and Docker are available
	@command -v node >/dev/null || { printf "$(R)✗ Node.js not found.$(N) Install Node 20+ from https://nodejs.org\n"; exit 1; }
	@node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' || { printf "$(R)✗ Node $$(node -v) is too old.$(N) Need Node 20+.\n"; exit 1; }
	@command -v pnpm >/dev/null || { printf "$(R)✗ pnpm not found.$(N) Run: corepack enable   (or: npm i -g pnpm)\n"; exit 1; }
	@command -v docker >/dev/null || { printf "$(R)✗ Docker not found.$(N) Install Docker Desktop: https://docs.docker.com/get-docker/\n"; exit 1; }
	@docker info >/dev/null 2>&1 || { printf "$(R)✗ Docker isn't running.$(N) Start Docker Desktop and try again.\n"; exit 1; }
	@printf "$(G)✓$(N) node $$(node -v), pnpm $$(pnpm -v), docker running\n"

env: ## Create .env.local with a generated AUTH_SECRET (never overwrites)
	@if [ -f $(ENV_FILE) ]; then \
	  printf "$(G)✓$(N) $(ENV_FILE) exists (left as is)\n"; \
	else \
	  secret=$$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'); \
	  sed -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$$secret|" \
	      -e "s|^POSTGRES_URL=.*|POSTGRES_URL=postgres://postgres:postgres@localhost:$(DB_PORT)/chatbot|" \
	      .env.example > $(ENV_FILE); \
	  printf "$(G)✓$(N) created $(ENV_FILE) (mock mode, new AUTH_SECRET)\n"; \
	fi

install: ## Install dependencies
	@pnpm install --frozen-lockfile
	@printf "$(G)✓$(N) dependencies installed\n"

db: ## Start Postgres in Docker (creates the container the first time)
	@if [ "$$(docker inspect -f '{{.State.Running}}' $(DB_CONTAINER) 2>/dev/null)" = "true" ]; then \
	  printf "$(G)✓$(N) Postgres ($(DB_CONTAINER)) already running\n"; \
	elif docker inspect $(DB_CONTAINER) >/dev/null 2>&1; then \
	  docker start $(DB_CONTAINER) >/dev/null && printf "$(G)✓$(N) started existing Postgres ($(DB_CONTAINER))\n"; \
	else \
	  docker run -d --name $(DB_CONTAINER) -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=chatbot \
	    -p $(DB_PORT):5432 $(DB_IMAGE) >/dev/null \
	    || { printf "$(R)✗ Couldn't start Postgres.$(N) Is port $(DB_PORT) taken? Try: make setup DB_PORT=5433\n"; exit 1; }; \
	  printf "$(G)✓$(N) created Postgres ($(DB_CONTAINER)) on port $(DB_PORT)\n"; \
	fi
	@printf "  waiting for Postgres"; \
	for i in $$(seq 1 30); do \
	  docker exec $(DB_CONTAINER) pg_isready -U postgres -q 2>/dev/null && { printf " ready\n"; exit 0; }; \
	  printf "."; sleep 1; \
	done; printf "\n$(R)✗ Postgres didn't become ready.$(N) Check: docker logs $(DB_CONTAINER)\n"; exit 1

migrate: ## Apply database migrations
	@npm_config_loglevel=error pnpm -s db:migrate >/dev/null && printf "$(G)✓$(N) database migrated\n"

mock: ## Use canned answers (no API key needed)
	@test -f $(ENV_FILE) || $(MAKE) -s env
	@perl -pi -e 's/^USE_MOCK=.*/USE_MOCK=1/' $(ENV_FILE)
	@printf "$(G)✓$(N) mock mode. Restart the app (Ctrl+C, then make dev) to apply.\n"

real: ## Use real OpenAI answers: make real OPENAI_API_KEY=sk-...
	@test -f $(ENV_FILE) || $(MAKE) -s env
	@if [ -n "$$OPENAI_API_KEY" ]; then \
	  KEY="$$OPENAI_API_KEY" perl -pi -e 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$$ENV{KEY}/' $(ENV_FILE); \
	fi
	@grep -q '^OPENAI_API_KEY=..' $(ENV_FILE) || { printf "$(R)✗ No OpenAI key.$(N) Run: make real OPENAI_API_KEY=sk-...\n"; exit 1; }
	@perl -pi -e 's/^USE_MOCK=.*/USE_MOCK=0/' $(ENV_FILE)
	@printf "$(G)✓$(N) real mode (gpt-6-luna). Restart the app (Ctrl+C, then make dev) to apply.\n"

status: ## Show mode, key, database and app status
	@printf "mode:     %s\n" "$$(grep -q '^USE_MOCK=0' $(ENV_FILE) 2>/dev/null && echo 'real (OpenAI)' || echo 'mock (canned answers)')"
	@printf "api key:  %s\n" "$$(grep -q '^OPENAI_API_KEY=..' $(ENV_FILE) 2>/dev/null && echo set || echo 'not set')"
	@printf "env file: %s\n" "$$(test -f $(ENV_FILE) && echo $(ENV_FILE) || echo 'missing (run make env)')"
	@printf "postgres: %s\n" "$$([ "$$(docker inspect -f '{{.State.Running}}' $(DB_CONTAINER) 2>/dev/null)" = true ] && echo "running ($(DB_CONTAINER))" || echo 'stopped (run make db)')"
	@printf "app:      %s\n" "$$(curl -s -o /dev/null -m 3 -w '%{http_code}' $(URL)/ping | grep -q 200 && echo "running at $(URL)" || echo "not running on $(URL) (run make dev)")"

open: ## Open the app in your browser
	@(command -v open >/dev/null && open $(URL)) || (command -v xdg-open >/dev/null && xdg-open $(URL)) || printf "Open $(URL)\n"

check: ## Typecheck, lint and unit tests
	@pnpm exec tsc --noEmit && printf "$(G)✓$(N) typecheck\n"
	@pnpm -s check && printf "$(G)✓$(N) lint\n"
	@pnpm exec tsx --test lib/reverse-alignment/*.test.ts lib/ai/*.test.ts

test: check ## Same as check

eval: ## Run the prompt-coaching eval cases (mock mode, no key)
	@USE_MOCK=1 pnpm exec tsx --conditions=react-server prompt_eval/run.mts

stop: ## Stop Postgres (data is kept)
	@docker stop $(DB_CONTAINER) >/dev/null 2>&1 && printf "$(G)✓$(N) Postgres stopped (data kept; make db to restart)\n" || printf "Postgres wasn't running\n"
