#!/usr/bin/env bash
# Runs backend (:8000) and frontend (:5173) together. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -d frontend/node_modules ] || (cd frontend && npm install)
trap 'kill 0' EXIT
(cd backend && uv run uvicorn app.main:app --reload --port 8000) &
(cd frontend && npm run dev) &
wait
