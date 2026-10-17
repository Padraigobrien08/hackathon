"""Coach observer: decides whether ONE brief collaboration insight is worth showing after an answer.
Never raises: any failure means category "none" (silence). Fixtures double as the demo fallback and are
labelled source="fixture" so scripted behaviour is never passed off as inferred."""

import re
from typing import Literal

from pydantic import BaseModel

CoachingCategory = Literal["missing_context", "assumption", "verification", "delegation", "none"]


class CoachingDecision(BaseModel):
    category: CoachingCategory
    insight: str | None = None  # <= 180 chars preferred
    whyRelevant: str | None = None  # internal rationale, not shown
    confidence: float = 0.0  # model uncertainty, NOT human skill
    assumedDetail: str | None = None


NONE = CoachingDecision(category="none", confidence=1.0)

# Cheap deterministic flags, used in both mock and real mode.
_SENSITIVE = re.compile(
    r"\b(suicid\w*|self[- ]harm|kill myself|overdose|abus\w*|emergency|crisis|panic attack)", re.I
)
_ARITHMETIC = re.compile(r"^\s*(what('?s| is)\s+)?[\d\s.+\-*x×/÷()=]+\??\s*$", re.I)


def is_sensitive(text: str) -> bool:
    return bool(_SENSITIVE.search(text))


def is_simple(text: str) -> bool:
    return bool(_ARITHMETIC.match(text)) or len(text.split()) <= 3


_FIXTURES: list[tuple[re.Pattern, CoachingDecision]] = [
    (
        re.compile(r"\bemail\b", re.I),
        CoachingDecision(
            category="assumption",
            insight="I assumed this is a formal request for annual leave. Mentioning your relationship with your manager or the reason could change the tone.",
            whyRelevant="Tone and leave type were unstated and shape the draft.",
            confidence=0.9,
            assumedDetail="Formal tone; annual leave",
        ),
    ),
    (
        re.compile(r"\b(compare|claims?|which is right)\b", re.I),
        CoachingDecision(
            category="verification",
            insight="Before relying on either claim, check each source's publication date and author.",
            whyRelevant="Comparison depends on source recency and credibility.",
            confidence=0.85,
        ),
    ),
    (
        re.compile(r"\b(plan|schedule|steps)\b", re.I),
        CoachingDecision(
            category="missing_context",
            insight="Saying who the plan is for and any deadline lets me size the steps to fit.",
            whyRelevant="Audience and timeframe were unstated.",
            confidence=0.85,
        ),
    ),
]


def _fixture_decision(user_message: str) -> CoachingDecision:
    for pattern, decision in _FIXTURES:
        if pattern.search(user_message):
            return decision
    return NONE


def observe(user_message: str, assistant_reply: str) -> dict:
    """Returns the fields of CoachResponse (see main.py)."""
    simple, sensitive = is_simple(user_message), is_sensitive(user_message)
    if simple or sensitive:
        return {"decision": NONE, "isSimple": simple, "isSensitive": sensitive, "source": "fixture"}

    # TODO(M1, Dev 2): real path — llm._client.beta.messages.parse(..., output_format=CoachingDecision)
    # with the spec's observer prompt and a timeout; on refusal/None/exception return NONE.
    # Until then real mode also uses fixtures, honestly labelled.
    return {
        "decision": _fixture_decision(user_message),
        "isSimple": False,
        "isSensitive": False,
        "source": "fixture",
    }
