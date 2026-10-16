---
name: plan-idea
description: Turn a rough hackathon idea into a scoped build plan — the one core demo, 2–3 features, API contracts, and a task split for a team of 3. Use at the start of the day or when the team is choosing between ideas.
---

The arguments are a rough idea (or several to compare). Read `CLAUDE.md` and the current code first so the plan fits the existing skeleton. Do not write code.

If several ideas are given, score each 1–5 on: demo impact in 60 seconds, buildable in ~5 hours by 3 people, relevance to the sponsors (Wordsmith: legal AI; Skyscanner: travel), and novelty. Recommend one, in one sentence.

For the chosen idea, output:

1. **One-line pitch:** "<who> struggles with <problem>; we <solution>."
2. **The 60-second demo:** the exact steps a judge will see, input → output.
3. **Must-have features (max 3)**, each with its API contract (route, request, response) in the existing style.
4. **Cut list:** tempting things we are deliberately NOT building.
5. **Task split** for 3 people (AI/backend, frontend, demo+pitch), with what each can start on immediately using mock mode.
6. **Checkpoints:** what should work by 12:30, 13:30 (front end and backend joined up), and 15:00 (freeze).
7. **Biggest risk** and the fallback if it fails.

Keep the whole plan readable in under 2 minutes.
