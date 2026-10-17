"""API server. The request/response models below ARE the contract with the frontend.
If you change them, update frontend/src/api.ts in the same commit and tell the team."""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from typing import Literal  # noqa: E402

from pydantic import BaseModel  # noqa: E402

from app import coach, llm  # noqa: E402
from app.coach import CoachingDecision  # noqa: E402  (defined there: it's also the observer's structured output)

app = FastAPI(title="Hackathon API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---- Contract -------------------------------------------------------------

class AskRequest(BaseModel):
    question: str
    context: str | None = None  # optional pasted doc / extra info


class Source(BaseModel):
    title: str
    snippet: str


class AskResponse(BaseModel):
    answer: str
    sources: list[Source] = []
    mock: bool = False  # true when served by the fake LLM


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class Preferences(BaseModel):
    """Only user-APPROVED preferences; the frontend decides when to send them."""
    concise: bool | None = None
    technicalDetail: Literal["low", "normal", "high"] | None = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    preferences: Preferences = Preferences()


class ChatResponse(BaseModel):
    reply: str
    mock: bool = False


class CoachRequest(BaseModel):
    userMessage: str  # last exchange only: minimum context
    assistantReply: str


class CoachResponse(BaseModel):
    decision: CoachingDecision
    isSimple: bool
    isSensitive: bool
    source: Literal["llm", "fixture"]


# ---- Routes ---------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True, "mock": llm.USE_MOCK}


@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    answer = llm.complete(req.question, req.context)
    sources = [Source(title="Provided context", snippet=req.context[:200] + ("…" if len(req.context) > 200 else ""))] if req.context else []
    return AskResponse(answer=answer, sources=sources, mock=llm.USE_MOCK)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    reply = llm.chat([m.model_dump() for m in req.messages], req.preferences.model_dump(exclude_none=True))
    return ChatResponse(reply=reply, mock=llm.USE_MOCK)


@app.post("/api/coach", response_model=CoachResponse)
def coach_route(req: CoachRequest) -> CoachResponse:
    # Best-effort and post-answer: any failure is silence, never an error the chat has to handle.
    try:
        return CoachResponse(**coach.observe(req.userMessage, req.assistantReply))
    except Exception:
        return CoachResponse(decision=coach.NONE, isSimple=False, isSensitive=False, source="fixture")
