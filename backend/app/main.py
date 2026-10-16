"""API server. The request/response models below ARE the contract with the frontend.
If you change them, update frontend/src/api.ts in the same commit and tell the team."""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from app import llm  # noqa: E402

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


# ---- Routes ---------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True, "mock": llm.USE_MOCK}


@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    answer = llm.complete(req.question, req.context)
    sources = [Source(title="Provided context", snippet=req.context[:200] + ("…" if len(req.context) > 200 else ""))] if req.context else []
    return AskResponse(answer=answer, sources=sources, mock=llm.USE_MOCK)
