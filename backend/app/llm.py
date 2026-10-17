"""All LLM calls go through here. Set USE_MOCK=1 in .env to work without an API key."""

import os

import anthropic

USE_MOCK = os.getenv("USE_MOCK", "1") == "1"
MODEL = os.getenv("MODEL", "claude-opus-5-5")

SYSTEM_PROMPT = (
    "You are a helpful assistant inside a hackathon demo app. "
    "Answer clearly and concisely. If context is provided, ground your answer in it. "
    "Reply in plain text with no markdown: the UI does not render it. Use short paragraphs; for lists, write numbered lines like '1. ...'."
)

_client = None if USE_MOCK else anthropic.Anthropic()


def complete(question: str, context: str | None = None) -> str:
    if USE_MOCK:
        return f"[mock] You asked: {question!r}. Set USE_MOCK=0 in backend/.env to use Claude."

    content = f"<context>\n{context}\n</context>\n\n{question}" if context else question
    response = _client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        # "low" keeps demo latency down; raise to "medium"/"high" for harder reasoning.
        output_config={"effort": os.getenv("EFFORT", "low")},
        # Server-side fallback: if the model declines, the API retries on a fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": content}],
    )
    if response.stop_reason == "refusal":
        return "Sorry, the model declined to answer that."
    return "".join(b.text for b in response.content if b.type == "text")


CHAT_SYSTEM_PROMPT = (
    "You are a helpful, capable assistant. Answer the user's request fully and directly; never withhold or delay "
    "an answer to teach. If the user corrects you or changes a constraint, start your revision with one short line "
    "saying what you changed (e.g. 'Shorter and less formal:'). "
    "Reply in plain text with no markdown: the UI does not render it. Use short paragraphs; for lists, write numbered lines like '1. ...'."
)

_PREFERENCE_LINES = {
    "concise": "The user has asked for concise responses by default: keep answers short and to the point.",
    "technicalDetail": {
        "low": "The user prefers plain language with minimal jargon.",
        "high": "The user prefers detailed, technical explanations.",
    },
}


def _preference_prompt(preferences: dict) -> str:
    lines = []
    if preferences.get("concise"):
        lines.append(_PREFERENCE_LINES["concise"])
    if detail := _PREFERENCE_LINES["technicalDetail"].get(preferences.get("technicalDetail")):
        lines.append(detail)
    return ("\n\nUser-approved preferences:\n" + "\n".join(lines)) if lines else ""


def chat(messages: list[dict], preferences: dict) -> str:
    """messages: [{role: 'user'|'assistant', content}], alternating, ending with a user message."""
    if USE_MOCK:
        last = messages[-1]["content"] if messages else ""
        if preferences.get("concise"):
            return f"[mock] Short answer to {last!r}."
        return (
            f"[mock] Here is a full answer to {last!r}.\n\n"
            "1. A first point with some detail.\n2. A second point with more detail.\n3. A third point.\n\n"
            f"(turn {len(messages)}; active preferences: {preferences or 'none'}. Set USE_MOCK=0 to use Claude.)"
        )

    response = _client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=CHAT_SYSTEM_PROMPT + _preference_prompt(preferences),
        output_config={"effort": os.getenv("EFFORT", "low")},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=messages,
    )
    if response.stop_reason == "refusal":
        return "Sorry, the model declined to answer that."
    return "".join(b.text for b in response.content if b.type == "text")
