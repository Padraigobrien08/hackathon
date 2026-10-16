import { useState } from 'react'
import { ask, type AskResponse } from './api'

export default function App() {
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResult(await ask({ question, context: context || undefined }))
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <h1>Project Name</h1>
      <p className="tagline">One sentence on the problem you solve.</p>

      <form onSubmit={onSubmit}>
        <textarea
          placeholder="Optional: paste a document / context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
        />
        <input
          placeholder="Ask something…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="result">
          {result.mock && <span className="badge">mock mode</span>}
          <p>{result.answer}</p>
          {result.sources.map((s, i) => (
            <blockquote key={i}>
              <strong>{s.title}</strong>: {s.snippet}
            </blockquote>
          ))}
        </section>
      )}
    </main>
  )
}
