# Prompt Ideals: what good LLM usage looks like

This is the reference the coach uses to judge a user's prompt. Each principle below lists what it is, how to spot when it is missing, an example, and the kind of tip the coach could give.

The coach answers first and gives **at most one** tip, only when fixing it would clearly have improved the answer. If nothing is clearly missing, the coach says nothing. It never gives a score or a grade.

---

## 1. Define the task

**What good looks like:** the prompt says what the model should *do* (an action verb plus an object), not only the topic. Examples: "Summarise", "Compare X and Y", "Write a function that…", "Find the bug in…".

**Signals it's missing**
- The prompt is only a topic or a noun phrase, e.g. "python decorators" or "marketing plan".
- It's unclear what kind of output is wanted: an explanation, code, a list, or a decision.
- There are several asks mixed together and no main one.

| Weak | Strong |
|---|---|
| "React state" | "Explain when to use `useState` vs `useReducer`, with a short example of each." |

**Tip example:** *"Saying what you want done (explain, compare, write, fix) helps me pick the right kind of answer."*

---

## 2. Provide relevant context

**What good looks like:** the prompt includes the facts the model can't know or guess: who it's for, what the constraints are, what was already tried, the environment or versions, and any source material (code, error text, data).

**Signals it's missing**
- To answer, the model had to guess an audience, language, framework, version or goal.
- The prompt refers to things the model can't see ("my code", "the error", "our policy") without pasting them.
- It's a debugging request with no error message or reproduction steps.
- The answer had to hedge or cover several cases ("If you're using X…, if Y…").

| Weak | Strong |
|---|---|
| "Why does my code crash?" | "This Python 3.12 script crashes with `KeyError: 'id'` on line 14 when the API returns an empty list. Code below: …" |

**Tip example:** *"I assumed you're on Python 3. Mentioning version and the exact error next time saves a round-trip."*

Maps to `missing_context` / `assumption` in `lib/reverse-alignment/types.ts`.

---

## 3. Define success criteria

**What good looks like:** the prompt says what a good answer looks like: its format, length, level of detail, and what "done" means. Examples: "under 100 words", "as a table", "for a non-technical manager", "must pass these tests", "give me 3 options with trade-offs".

**Signals it's missing**
- Open-ended asks with no format or length, where the answer could be one line or a whole essay.
- High-stakes output (code to run, legal or medical text, facts to cite) with no request to check or verify it.
- The user follows up with "shorter", "no, I meant…" or "simpler". That means the criteria were in their head but not in the prompt.

| Weak | Strong |
|---|---|
| "Write a cover letter." | "Write a 250-word cover letter for a junior data analyst role; confident but not salesy; highlight SQL and one project." |

**Tip example:** *"If you tell me the format or length you want up front, the first answer is more likely to be usable."*

Maps to `verification` (asking the model to check its work or state its uncertainty) and `delegation` (being clear about what the model should own and what the user will decide).

---

## 4. Efficiency (concise, low redundancy)

**What good looks like:** every sentence in the prompt carries information. There's no repeated instruction and no long preamble, and the prompt doesn't paste whole files when one function would do. The user also avoids extra round-trips by asking for everything they need in one prompt.

**Signals it's missing**
- The same instruction is repeated in different words.
- A large paste where most of it is irrelevant to the question.
- A string of small follow-ups that one well-specified prompt would have covered.
- Filler that adds no constraint ("I was wondering if maybe you could possibly…"). This is minor; don't tip on politeness alone.

| Weak | Strong |
|---|---|
| 400 lines of code + "something's wrong somewhere" | The failing function + the error + "expected X, got Y" |

**Tip example:** *"Pasting just the function and the error is usually enough, and I'll focus on the right part faster."*

Note: there is no `efficiency` value in `CoachingCategory` yet. Adding one means changing the shared types, so agree it with the team first.

---

## When the coach stays silent

Stay silent (`category: "none"`) when:
- The prompt is simple or conversational ("thanks", "what's 15% of 80", a greeting).
- The answer was good anyway; a missing detail didn't hurt it.
- The topic is sensitive (health, personal, emotional). Don't coach there.
- The same category was shown recently or the user dismissed it (see `LearningSignals`).
- Confidence is low. A wrong tip is worse than no tip.
