# Prompt Rubric, Tips & Metrics (coach spec)

Combines `PromptIdeals.md` (what a good prompt looks like) and `Inputevaluation.md` (tiers, dashboards, cost) into one spec the coach can run on. It covers:
1. the rubric the evaluator LLM scores against (internal only),
2. the tip library it picks from,
3. the metrics we measure for the dashboard and for tips,
4. a draft evaluator system prompt.

Where the two source docs disagree, this file says which one wins and why (see §6).

---

## 1. Rubric: four dimensions, scored internally

The evaluator looks at **the user's prompt and the answer it got**. We need the answer too: a gap only matters if it changed the answer (PromptIdeals: tip only "when fixing it would clearly have improved the answer").

| # | Dimension | Question the evaluator asks | Source | Maps to `CoachingCategory` |
|---|---|---|---|---|
| D1 | **Task** | Does the prompt say what to *do* (verb + object), with one main ask? | Ideals §1 | `missing_context` |
| D2 | **Context** | Did the model have to guess the audience, environment, version, goal, or material it couldn't see? | Ideals §2; Eval "Assumption Penalty" | `missing_context`, `assumption` |
| D3 | **Success criteria** | Is the format, length, detail level or definition of done stated? For high-stakes output, is there a request to check it? | Ideals §3; Eval §5 "formatting constraints" | `missing_context` (format), `verification` (high stakes) |
| D4 | **Efficiency** | Does every part carry information: no repeats, no contradictions, no large irrelevant paste, no chain of follow-ups one prompt could have covered? | Ideals §4; Eval "Input Fluff", "Context Relevance Ratio", "Redundancy" | none yet (see §6.4) |

`delegation` stays a separate, answer-side category. It isn't a prompt-quality dimension.

### Scoring each dimension

| Score | Meaning |
|---|---|
| `2` | Present and clear. |
| `1` | Missing or weak, **but the answer was fine anyway** (the model guessed right or the default was harmless). |
| `0` | Missing or weak, **and it visibly cost something**: the answer hedged across cases, guessed something that matters, padded, or the user had to correct it. |
| `null` | Doesn't apply (for example, D3 on "what's the capital of France"). |

A dimension is only **tip-eligible** when it scores `0`. A `1` gets logged for trends but is never shown to the user.

### Evidence the evaluator must cite
For every `0`, the evaluator fills in `evidence`: the specific thing it saw (for example, "answer covered both Python 2 and 3", "assumed formal tone"). If it can't point to evidence, the score is `1`. This keeps the coach from making up problems.

### Prompt strength (user-facing, 3 levels)
Each eligible prompt gets one user-facing label: **Weak / Reasonable / Strong**. This replaces the 5-tier scale in `Inputevaluation.md`. Code derives the label from the dimension scores, not the LLM, so the same scores always give the same label:

| Label | Rule (over applicable dimensions) |
|---|---|
| **Strong** | no `0`, at most one `1` |
| **Reasonable** | no `0` and two or more `1`, **or** exactly one `0` |
| **Weak** | two or more `0`, **or** `task` = `0` (the model couldn't tell what you wanted) |

- **No label** on simple or sensitive turns, or when the coach returns no rubric (on failure or timeout). Silence is better than a label we can't back up.
- **A Weak label always comes with its reason**: the top `0` dimension in one line ("I had to guess the audience"), even when the tip cooldown suppresses the full tip. A bare "Weak" with no reason feels like a grade and teaches nothing.
- Dollar costs and token counts never appear next to the label. Those go on the manager dashboard.

We don't score persona use. Assigning a role does little on current models, and rewarding it would teach a ritual rather than a skill.

---

## 2. Tip library

Rules from `PromptIdeals.md` and `CLAUDE.md` still apply: at most one tip, optional, ≤180 characters, first person ("I assumed…"), forward-looking, no grades, silence by default.

A tip is selected only when **all** of these hold: a dimension scored `0` with evidence; `confidence ≥ 0.7`; not simple or sensitive; the policy gates pass (cooldown, category not dismissed). If more than one dimension scored `0`, pick the one whose fix would have changed the answer most. Usually that's D2, then D3, D1, D4.

Templates (the evaluator fills the `{}` slots from the evidence and should rephrase naturally instead of copying):

| Dim | Trigger (evidence) | Tip template |
|---|---|---|
| D1 | Prompt is a topic or noun phrase only | "Saying what you want done (explain, compare, write, fix) helps me pick the right kind of answer." |
| D1 | Several asks with no main one | "You asked a few things at once. Saying which matters most lets me go deep on that one." |
| D2 | Model guessed an audience or tone | "I assumed {assumption}. Saying who it's for next time would change the tone and detail." |
| D2 | Model guessed an environment or version | "I assumed {assumption}. Mentioning your version or setup saves a round-trip." |
| D2 | Prompt refers to unseen material ("my code", "the error") | "I couldn't see {thing}, so I answered generally. Pasting it gets you a specific fix." |
| D2 | Debugging with no error or repro steps | "The exact error message and what you expected would let me pinpoint the cause instead of listing possibilities." |
| D3 | Open-ended ask; answer length was a guess | "Telling me the format or length you want (e.g. '3 bullets', 'under 100 words') makes the first answer more usable." |
| D3 | User followed up with "shorter" / "simpler" / "no, I meant" | "Your follow-up suggests {criterion} was what you wanted. Putting that in the first message gets there in one go." |
| D3 | High-stakes output (code to run, legal, medical, facts to cite) with no check requested | "For something you'll rely on, ask me to flag what I'm unsure of or what to double-check." |
| D4 | Large paste, mostly irrelevant (uses metric `pasted_tokens`) | "You pasted about {pasted_tokens} tokens. The relevant function plus the error is usually enough, and I'll focus faster." |
| D4 | Long paste mixed in with the question | "With long material, putting it in a block (``` … ```) separate from your question helps me tell the data from the ask." |
| D4 | Same instruction repeated or contradicted | "A couple of instructions point different ways ({a} vs {b}). Picking one avoids me guessing which wins." |
| D4 | Chain of small follow-ups (session-level, see `followup_chain`) | "These last few messages could have been one: listing everything up front saves you the back-and-forth." |

Don't tip on: politeness or filler alone, prompt length alone ("never treat prompt length as competence"), sensitive topics, simple turns, or anything already shown or dismissed recently.

---

## 3. Metrics

Measured facts come first. Estimates are kept separate and always labelled. Field names below are AI SDK 7 `LanguageModelUsage` (`ai@7.0.15`), which `streamText` / `generateText` return on finish.

### 3.1 Per assistant turn (measured)

| Metric | Definition | Source |
|---|---|---|
| `input_tokens` | All tokens sent to the model: system prompt + full history + new message | `usage.inputTokens` |
| `cache_read_tokens` / `cache_write_tokens` | Portion of input served from / written to prompt cache | `usage.inputTokenDetails.cacheReadTokens` / `.cacheWriteTokens` |
| `output_tokens` | Tokens generated, including reasoning | `usage.outputTokens` |
| `reasoning_tokens` | Thinking tokens within output | `usage.outputTokenDetails.reasoningTokens` |
| `ttft_ms` | Request start → first text chunk | timestamp in chat route (`onChunk` first text) |
| `latency_ms` | Request start → stream finish | timestamp in `onFinish` |
| `cost_usd` | See §3.4 | computed |

**Important:** `input_tokens` is mostly *our* system prompt and the conversation history, not the user's prompt. Don't attribute it to the user or use it to judge them. For the user's own contribution use:

| Metric | Definition | Source |
|---|---|---|
| `prompt_tokens` | Tokens in the user's latest message only | estimate `ceil(chars / 4)` (label "≈"), or exact via `count_tokens` if needed |
| `pasted_tokens` | Tokens inside fenced code blocks or pasted blocks of more than 20 lines | same estimate, on the extracted blocks |
| `output_input_ratio` | `output_tokens / prompt_tokens` | derived |

### 3.2 Per conversation (measured, derived)

| Metric | Definition |
|---|---|
| `turns` | Non-simple user turns |
| `correction_turns` | User turns detected as a correction ("shorter", "no, I meant", "simpler", "that's not what I asked"). Reuse the S5 preference detector |
| `rework_tokens` | For each correction turn: `output_tokens` of the corrected answer + `input_tokens + output_tokens` of the correction turn. **This is our measured waste**: tokens spent because the first prompt didn't carry what the user wanted |
| `rework_cost_usd` | `rework_tokens` priced per §3.4 |
| `followup_chain` | Run of 3 or more consecutive short follow-ups on the same task (feeds the D4 tip) |
| `first_answer_accept_rate` | Share of answers not followed by a correction turn |

### 3.3 Coaching (measured)

| Metric | Definition |
|---|---|
| `gap_rate[dim]` | Share of eligible turns where dimension scored `0`. **This is the skill trend line**: a falling gap rate over time is the "user is improving" story |
| `tip_rate` | Tips shown / eligible turns (should stay low; the target is under 20%) |
| `tip_accept_rate`, `tip_dismiss_rate` | From card feedback (Got it / Don't show this kind) |
| `coach_tokens`, `coach_cost_usd` | The coach's own `usage` per call. **Always show the coach's overhead next to any savings claim** |
| `coach_silence_rate` | Share of coach calls that returned `none` (healthy if high) |

### 3.4 Cost formula

Prices from the Anthropic price list (cached 2026-10-06), USD per 1M tokens. Keep these in one constant so they're easy to update.

| Model (role) | Input | Output | Cache read | Cache write (5-min) |
|---|---|---|---|---|
| `claude-sonnet-5-5` (chat) | 2.00 | 10.00 | 0.20 | 2.50 (1.25 × input) |
| `claude-haiku-5-5` (titles) | 0.10 | 0.50 | 0.01 (0.1 × input) | 0.125 (1.25 × input) |
| `gpt-6-luna` (coach, OpenAI) | 0.10 | 0.50 | 0.01 | 0.125 |

Haiku 5.5 prices apply to prompts up to 100K tokens ($0.50 / $2.50 beyond). `gpt-6-luna` prices are OpenAI's standard short-context rate (the long-context rate is higher). The coach stays well under both limits.

```
cost = (noCacheTokens × in + cacheReadTokens × cacheRead + cacheWriteTokens × cacheWrite + outputTokens × out) / 1e6
```

Worked example: a chat turn with 1,500 input / 600 output on Sonnet 5.5 costs about $0.009. The coach call on gpt-6-luna (~1,500 in / 150 out) costs about $0.0002, roughly 2.5% overhead.

### 3.5 Estimated ambiguity waste (optional, always labelled "estimate")

`Inputevaluation.md` proposes a flat 25–40% output-token penalty for poor prompts. **We have no source for that figure**, so it shouldn't be presented as a benchmark. If the manager view wants a forward-looking estimate as well as the measured `rework_tokens`:

```
estimated_waste_tokens = Σ output_tokens over turns with ≥1 dimension scored 0 × WASTE_RATE
WASTE_RATE = 0.30   // assumption, configurable, shown as "assumed 30%"
```

Example: 10M output tokens a month, 40% of turns with a scored gap, 30% assumed waste → 1.2M tokens ≈ **$12/month at Sonnet 5.5 output prices**. That's small. The bigger cost is people's time on correction rounds, so lead with `correction_turns` and `first_answer_accept_rate`. Put dollars second.

---

## 4. Where each number is shown

| View | Shows | Never shows |
|---|---|---|
| **Per message (user)** | Weak / Reasonable / Strong label (§1); for Weak, a one-line reason; the optional tip, which may quote a fact about *this* prompt (`pasted_tokens`, what was assumed) | Dimension scores, tokens, cost |
| **User "How I'm helping" / progress view** | Share of Weak / Reasonable / Strong over recent prompts, `gap_rate` trend per dimension in plain words ("You've added context more often this week"), the most common gap | Dollar cost, comparison with others |
| **Manager dashboard** | Aggregates: tokens in/out, cost, `rework_tokens` + cost, `correction_turns`, `first_answer_accept_rate`, Weak/Reasonable/Strong distribution, `gap_rate` by dimension, coach overhead, TTFT p50/p95 | Per-message tips or prompt text (privacy) |

A per-user leaderboard ("who needs training") is left out on purpose. It turns the coach into surveillance and goes against "nonjudgmental".

---

## 5. Draft evaluator prompt (for `lib/reverse-alignment/observer.ts`)

```
You review one exchange between a user and an AI assistant. The assistant has already answered. Your job is to decide whether ONE short, optional tip would help the user get a better first answer next time. Prefer saying nothing.

Score the user's prompt on four dimensions, each 2 (clear), 1 (missing but the answer was fine anyway), 0 (missing AND it visibly hurt the answer), or null (not applicable):
- task: does it say what to do (an action plus an object), with one main ask?
- context: did the assistant have to guess the audience, environment, version, goal, or material it couldn't see?
- success_criteria: is the format, length or definition of done stated? For high-stakes output (code to run, legal, medical, facts to cite), is a check requested?
- efficiency: are there repeated or contradictory instructions, a large irrelevant paste, or filler that changes nothing?

A 0 needs evidence from the answer: hedging across cases, a consequential guess, padding, or a mismatch with what the user clearly wanted. Quote it in evidence. If you can't point to evidence, score 1.

Then pick at most one tip, only for a dimension scored 0, choosing the gap whose fix would have changed the answer most. Write it as the assistant speaking to the user ("I assumed…", "If you share…, I can…"), never in the user's voice, under 180 characters, forward-looking, specific to this prompt (say what you assumed or what was missing). Never grade, never ask for a rewrite, never comment on length or politeness alone. If the topic is sensitive, the exchange is casual, or you are unsure, return category "none".

confidence is how sure you are that the tip is useful (0-1), never a judgement of the user.
```

Output schema: the existing `CoachingDecision` plus an optional `rubric` field:

```ts
rubric?: {
  task: 0 | 1 | 2 | null;
  context: 0 | 1 | 2 | null;
  success_criteria: 0 | 1 | 2 | null;
  efficiency: 0 | 1 | 2 | null;
  evidence?: string[]; // one per 0
};
```

The LLM returns only the dimension scores. `strength: "weak" | "reasonable" | "strong"` is computed from them in code (§1 rules) and added to `CoachResponse`. The UI reads `strength` and, for Weak, the top `evidence` line. It never shows the raw scores.

---

## 6. Decisions and open questions

1. **Users see a 3-level label (decided).** Weak / Reasonable / Strong per prompt, derived in code (§1), replaces the 5-tier scale. Everything else (tokens, cost, rework) is manager-only. This conflicts with the "no scores, grades" rule in `CLAUDE.md`, `PLAN.md` and `PromptIdeals.md` ("It never gives a score or a grade"), so update those before anyone builds against the old rule. To keep it from feeling like a grader: no label on simple or sensitive turns, a reason on every Weak, and no numbers shown to the user.
2. **Measured waste over an assumed %.** `rework_tokens` comes from real corrections. The 25–40% figure is unsourced, so it's kept only as a labelled, configurable estimate (§3.5).
3. **TTFT is measured, not inferred.** Longer input does add prefill time, but at chat-sized prompts the effect is small compared with output length and model choice. We record `ttft_ms` directly and don't penalise "fluff" for latency.
4. **`efficiency` category.** D4 has no `CoachingCategory`. Options: (a) add `"efficiency"` to `types.ts` (shared contract, so tell the team), or (b) log D4 in `rubric` only and show no D4 tips for now. Recommended: (b) for the hackathon.
5. **Token capture isn't wired up yet.** Nothing records `usage` today. It needs `onFinish` usage + TTFT in `app/(chat)/api/chat/route.ts` (Dev 2 hotspot) and in `observer.ts`, plus somewhere to store it: a new table, or simply in-memory/JSON for the demo.
