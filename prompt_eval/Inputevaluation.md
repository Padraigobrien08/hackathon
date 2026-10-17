# Prompt Evaluation & Analytics Framework

## 1. System Overview
This framework uses a secondary "Evaluator LLM" (LLM-as-a-judge) to analyze user prompts. The goal is to qualitatively improve user interaction with the AI by evaluating their inputs, while quantitatively tracking total token usage to estimate the rough financial impact of ambiguous prompting. 

The system powers two separate views: a **User Dashboard** focused on behavioral improvement and a **Manager Dashboard** focused on financial ROI and aggregate performance.

---

## 2. The 5-Tier Evaluation Rubric
To keep feedback intuitive and avoid overwhelming users with raw numbers, prompts are classified into one of five qualitative tiers. The user only sees their position on this scale, along with constructive feedback.

1. **Optimal (Super Strong):** Highly structured. Assigns a persona, provides clear constraints (length, format), and flawlessly separates context from instructions.
2. **Effective (Strong):** Clear goal and good context, but might be missing minor formatting constraints. LLM makes no major assumptions.
3. **Adequate (Fair):** Achieves the goal but instructions might be slightly vague, leading to potential conversational filler.
4. **Needs Improvement (Weak):** Ambiguous intent. The LLM is forced to make assumptions about the target audience, formatting, or scope. High risk of hallucination or padded answers.
5. **Poor (Critical):** Massive input fluff, no clear instructions, or a pure "wall of text." Extremely high Time-to-First-Token (TTFT) latency.

---

## 3. Core Evaluation Metrics & Penalties

The Evaluator LLM assesses the **Input (The Prompt)** to determine the user's tier. Output tokens are tracked purely for financial estimation.

### Input Metrics (Prompt Quality)
*   **Assumption Penalty:** Penalize the prompt if the LLM is forced to guess the context, tone, or formatting. (e.g., User asks "Write a pitch" without specifying the product or target audience).
*   **Input Fluff / Latency Impact:** Penalize users for dumping unformatted, irrelevant text. High input tokens directly degrade the Time-to-First-Token (TTFT) experience. 
*   **Context Relevance Ratio:** The ratio of uploaded/pasted context that actually contributes to the question.
*   **Redundancy Score:** Measures how often instructions are repeated or if they contradict each other.

### Output Tracking (Financial Estimation)
*   **Total Output Tokens:** We do not evaluate individual output tokens for necessity. Instead, we track the total volume of output tokens generated.
*   **Ambiguity Financial Hit:** For prompts that score poorly (Tiers 4 & 5), we estimate that a percentage of the total output tokens are wasted due to the model guessing or padding its response (see Section 5).

---

## 4. Dashboard Architectures

### A. The User Dashboard (Focus: Skill Development)
*   **Visibility:** Individual data only. **No financial metrics.**
*   **Current Tier:** Visual scale showing where their recent prompts land on the 5-Tier Rubric.
*   **Actionable Advice:** Specific recommendations based on recent penalties. 
    *   *Example:* "You frequently force the LLM to make assumptions. Try assigning a persona next time."
    *   *Example:* "Your input context is long. Try using delimiters (like ` ``` `) to separate your data from your question to improve response time."

### B. The Manager Dashboard (Focus: ROI & Analytics)
*   **Visibility:** Aggregate team data and individual user summaries.
*   **Estimated Financial Hit:** Calculates the rough cost of ambiguity. It looks at the total output tokens generated from low-tier prompts and applies an estimated waste percentage to show the financial impact.
*   **Team Leaderboard:** Ranks users by prompt efficiency (average Tier score), highlighting who needs training.
*   **Latency vs. Fluff Matrix:** Tracks how much API processing time is being degraded by poorly formatted inputs.

---

## 5. The Financial Impact of Ambiguity

Ambiguity is not just a usability issue; it is a direct financial drain. 

**The Metric:** According to prompt engineering benchmarks from enterprise deployments, **prompts lacking explicit formatting constraints and output length limits produce, on average, 25% to 40% more output tokens** due to conversational padding, unprompted explanations, and generalized guessing.

**Financial Estimation Example:**
Instead of evaluating every output token, we apply a flat benchmark to poorly constructed prompts. If your baseline cost is $15 per 1M output tokens (e.g., a flagship GPT-4 class model):
*   A user submits a "Poor" prompt (Tier 5) that results in 1,000 output tokens.
*   Using a conservative 35% ambiguity penalty, we estimate 350 of those tokens were unnecessary fluff caused by the bad prompt.
*   Across an enterprise generating 10 million output tokens a month, if 40% of queries are "Needs Improvement" or "Poor", the business is generating roughly 1.4 million waste tokens.
*   **Financial Impact:** ~$21.00 wasted per month per 10M tokens (scaling to thousands for large enterprise deployments).

By training users to hit the "Optimal" tier, businesses directly eliminate this 35% premium on output tokens while simultaneously reducing TTFT latency for the end user. 
