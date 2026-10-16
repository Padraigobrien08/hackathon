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
