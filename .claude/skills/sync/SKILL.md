---
name: sync
description: Safely commit, pull and push in this shared repo (3 people pushing to main). Use when the user says "commit", "push", "sync", "save my work", "pull the latest", "get my teammates' changes", hits a merge conflict, or after finishing a feature.
---

Goal: get this person's work onto `main` and their teammates' work onto their machine, without losing anyone's changes or leaking secrets. Three people push to `main` all day, so small, frequent syncs beat big ones.

1. **Look first.** Run `git status` and `git diff --stat`. Summarise what changed in one or two lines.
2. **Never commit secrets or junk.** Stop and warn if anything staged or untracked looks like `.env`, an API key (`sk-ant-…` or similar), `node_modules/`, `.venv/`, `dist/`, or large binaries. Fix `.gitignore` rather than committing them.
3. **Check it still works** before committing: `pnpm exec tsc --noEmit` (and `pnpm check` for lint). Don't commit a broken build to `main`; if it's broken, say so and ask whether to fix first or commit to a branch.
4. **Commit small and clear.** Stage only the files for this piece of work (not unrelated half-finished edits). Message: short imperative summary of what it does, e.g. "Add clause risk badges to results". If the changes are really two separate things, make two commits.
5. **Pull with rebase:** `git pull --rebase`. If there are uncommitted leftovers, stash them first and pop them after.
6. **Conflicts:** show which files conflict and why. For the shared contract (`lib/reverse-alignment/types.ts`), keep both sides' fields unless they truly clash. For anything ambiguous, ask the user which version wins; never silently drop a teammate's changes. After resolving, re-run the step 3 checks before continuing the rebase.
7. **Push:** `git push`. If it's rejected because someone pushed meanwhile, repeat step 5, then push again.
8. **Report** in 2–3 lines: what was committed, what came in from teammates (`git log --oneline` of the new commits), and anything they should know (e.g. contract changed, new dependency, needs `pnpm install` / `pnpm db:migrate`).

Never: `git push --force`, `git reset --hard` on pushed commits, amending or rebasing commits already on `origin/main`, or committing directly over a teammate's conflict without asking. If something goes badly wrong, stop and explain the state before trying to fix it.
