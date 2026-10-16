"""All LLM calls go through here. Set USE_MOCK=1 in .env to work without an API key."""

import os

import anthropic

USE_MOCK = os.getenv("USE_MOCK", "1") == "1"
MODEL = os.getenv("MODEL", "claude-opus-5-5")

SYSTEM_PROMPT = (
    "You are a helpful assistant inside a hackathon demo app. "
    "Answer clearly and concisely. If context is provided, ground your answer in it."
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
