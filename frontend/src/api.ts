// Mirrors the Pydantic models in backend/app/main.py — keep them in sync.

export type Source = { title: string; snippet: string }

export type AskRequest = { question: string; context?: string }
export type AskResponse = { answer: string; sources: Source[]; mock: boolean }

export async function ask(req: AskRequest): Promise<AskResponse> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (res.status === 502 || res.status === 504)
    throw new Error("Can't reach the server. Is the backend running? (./dev.sh)")
  if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`)
  return res.json()
}

// ---- Reverse Alignment contract ------------------------------------------

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
/** Only user-APPROVED preferences. */
export type Preferences = { concise?: boolean; technicalDetail?: 'low' | 'normal' | 'high' }
export type ChatRequest = { messages: ChatMessage[]; preferences: Preferences }
export type ChatResponse = { reply: string; mock: boolean }

export type CoachingCategory = 'missing_context' | 'assumption' | 'verification' | 'delegation' | 'none'
export type CoachingDecision = {
  category: CoachingCategory
  insight?: string | null // <= 180 chars preferred
  whyRelevant?: string | null // internal rationale; not shown
  confidence: number // model uncertainty, NOT human skill
  assumedDetail?: string | null
}
export type CoachRequest = { userMessage: string; assistantReply: string }
export type CoachResponse = {
  decision: CoachingDecision
  isSimple: boolean
  isSensitive: boolean
  source: 'llm' | 'fixture'
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (res.status === 502 || res.status === 504)
    throw new Error("Can't reach the server. Is the backend running? (./dev.sh)")
  if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`)
  return res.json()
}

export function chat(req: ChatRequest): Promise<ChatResponse> {
  return postJson('/api/chat', req)
}

/** Best-effort: call AFTER the answer renders, pass an AbortSignal (~8s), treat any throw as "no tip". */
export function coach(req: CoachRequest, signal?: AbortSignal): Promise<CoachResponse> {
  return postJson('/api/coach', req, signal)
}
