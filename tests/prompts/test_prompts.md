# Test prompts: three quality levels

Each example asks for the same task at three levels of prompt quality. The app should respond differently at each level:

| Level | Prompt quality | Expected behaviour |
|---|---|---|
| 1 | Excellent | **Answer directly.** No tip. |
| 2 | Mediocre | **Answer, then suggest improvements.** One short, optional tip. |
| 3 | Poor | **Coach before answering.** Ask one clarifying question first. |

---

## Example 1: Global warming report

### Level 1: Excellent (answer directly)

> Write a balanced, evidence-based report on the state of global warming in South Africa from 2010 to the present (2026). Cover temperature trends, droughts, water security, agriculture, biodiversity, human health and government climate policies. Compare the Western Cape, Gauteng and the Northern Cape. Use credible sources such as the IPCC, South African Weather Service and government reports. Distinguish observed data from projections, cite key claims, and highlight uncertainties. Aim for 1,500 words, with an executive summary and three recommendations for policymakers.

### Level 2: Mediocre (answer + suggest improvements)

> Write a South Africa modern global warming report.

**What's missing:** the topic and location are given, but the timeframe, audience, report structure, key issues, length and source requirements are all unclear.

**Example AI tip:** "I can do that. To make the report more useful, consider specifying the timeframe, the impacts you want covered, and whether you need academic sources."

### Level 3: Poor (coach before answering)

> Write global warm report.

**What's missing:** almost everything: there is no location, timeframe, audience, scope, length or purpose.

**Example AI question:** "Happy to help. Which country or region should the report focus on, and who is it for (e.g. school, work, policymakers)?"

---

## Example 2: Cover letter

### Level 1: Excellent (answer directly)

> Write a cover letter for a Junior Data Analyst role at Monzo in London. I'm a 2026 Mathematics graduate from the University of Edinburgh with a six-month internship at Skyscanner, where I built SQL dashboards that cut weekly reporting time by 40%. I'm skilled in Python (pandas), SQL and Tableau. The job ad emphasises stakeholder communication and experimentation (A/B testing), so highlight my final-year project on A/B test analysis. Keep it under 350 words, professional but warm, in UK English, and end with a clear call to action.

### Level 2: Mediocre (answer + suggest improvements)

> Write me a cover letter for a data job.

**What's missing:** there is no company, role level, background, skills, achievements, length or tone. The result will be generic and will need heavy editing.

**Example AI tip:** "Here's a draft. If you share the company, the job ad and one or two of your achievements, I can tailor it so it doesn't read like a template."

### Level 3: Poor (coach before answering)

> cover leter

**What's missing:** there's no job, no company, no information about the person and no context at all. It isn't even clear whether they want one written, reviewed or explained.

**Example AI question:** "Sure. What job and company is it for, and could you tell me a little about your experience?"

---

## Example 3: Debugging code

### Level 1: Excellent (answer directly)

> My Python 3.12 function should return the average of a list of numbers but crashes with `ZeroDivisionError: division by zero` when the list is empty. Here's the code:
>
> ```python
> def average(nums):
>     return sum(nums) / len(nums)
> ```
>
> Fix it so an empty list returns `None` instead of crashing, add type hints, and explain the fix in one or two sentences. Don't change the behaviour for non-empty lists.

### Level 2: Mediocre (answer + suggest improvements)

> My average function is broken, can you fix it? It's in Python.

**What's missing:** there is no code, error message, or description of the expected versus actual behaviour. The AI has to guess what "broken" means.

**Example AI tip:** "A common cause is dividing by zero on an empty list; here's a safe version. Next time, pasting the code and the exact error message lets me fix your actual bug rather than a likely one."

### Level 3: Poor (coach before answering)

> code doesnt work fix

**What's missing:** there's no language, no code, no error and no goal. There is nothing to fix.

**Example AI question:** "I can help. Could you paste the code and the error message (or describe what it does versus what you expected)?"

---

## Example 4: Travel itinerary

### Level 1: Excellent (answer directly)

> Plan a 4-day itinerary for Lisbon from 12 to 15 March for two adults in their late 20s. Our budget is about €150 per person per day, excluding flights and our hotel in Baixa. We love food, history and viewpoints, but don't want museums every day. We'll get around on foot and by public transport, and we'd like one day trip (Sintra or Cascais). Give a morning / afternoon / evening plan for each day, with one restaurant suggestion per evening, rough costs, and a note on which sights to book in advance.

### Level 2: Mediocre (answer + suggest improvements)

> Plan a trip to Lisbon for a few days.

**What's missing:** the number of days, dates, budget, group, interests and travel style are all missing, so the itinerary will be a generic tourist list.

**Example AI tip:** "Here's a 3-day starter plan. Tell me your dates, budget and what you enjoy (food, nightlife, history, beaches) and I'll make it fit you."

### Level 3: Poor (coach before answering)

> holiday ideas

**What's missing:** there's no destination, dates, budget, group or interests. It could mean anything from a weekend in the UK to a month in Asia.

**Example AI question:** "Fun! Roughly where would you like to go (or from where), for how long, and what's your budget?"

---

## Example 5: Product launch email

### Level 1: Excellent (answer directly)

> Write a launch email for "FocusFlow", our new Pomodoro timer app for university students. Audience: the 2,000 students on our beta waitlist. Key features: a 25/5-minute focus timer, study streaks, and a shared focus mode for study groups. It's free, with a £2.99/month premium tier. Launch date: 20 October. Tone: friendly and energetic, not salesy. Include a subject line (under 50 characters), a preview line, a body under 150 words, and one call-to-action button that says "Download FocusFlow".

### Level 2: Mediocre (answer + suggest improvements)

> Write an email about our new app launch.

**What's missing:** there's no app name, what it does, audience, key features, pricing, launch date, tone or call to action. The email will be vague and full of placeholders.

**Example AI tip:** "Here's a template with placeholders. If you tell me the app's name, who it's for and its top two features, I can write a version that's ready to send."

### Level 3: Poor (coach before answering)

> email app

**What's missing:** it isn't clear whether they want an email written, an email app recommended or help with an email app. There's no audience, purpose or detail.

**Example AI question:** "Just to check: do you want me to write an email (e.g. announcing an app), or are you looking for an email app recommendation?"
