---
name: plan-idea
description: Turn a rough hackathon idea into a scoped build plan — the one core demo, 2–3 features, API contracts, and a task split for a team of 3. Use when the user describes an idea, asks "what should we build?", compares ideas, asks if something is too big, or needs to re-scope after falling behind.
---

The arguments are a rough idea (or several to compare). Read `CLAUDE.md` and the current code first so the plan fits the existing skeleton. Do not write code.

If several ideas are given, score each 1–5 on: demo impact in 60 seconds, buildable in ~5 hours by 3 people, relevance to the sponsors (Wordsmith: legal AI; Skyscanner: travel), and how clearly it beats "just use ChatGPT". Recommend one, in one sentence.

For the chosen idea, output:

1. **One-line pitch:** "<who> struggles with <problem>; we <solution>."
2. **"Why not just ChatGPT?"** Judges always ask this. Name the differentiator as something we *build* and can show in the demo (e.g. verified quotes highlighted in the source, a domain-specific checklist, an action at the end), not a claim. If there isn't a convincing one, say so and adjust the idea.
3. **The 60-second demo:** the exact steps a judge will see, input → output.
4. **Must-have features (max 3)**, each with its API contract (route, request, response) in the existing style.
5. **Cut list:** tempting things we are deliberately NOT building.
6. **Task split** for 3 people (AI/backend, frontend, demo+pitch), with what each can start on immediately using mock mode.
7. **Checkpoints:** what should work by 12:30, 13:30 (front end and backend joined up), and 15:00 (freeze).
8. **Biggest risk** and the fallback if it fails.

Keep the whole plan readable in under 2 minutes.
