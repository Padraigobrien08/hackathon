import { useState } from 'react'
import { ask, type AskResponse } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

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
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Project Name</h1>
        <p className="text-muted-foreground">One sentence on the problem you solve.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <Textarea
          placeholder="Optional: paste a document / context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Ask something…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Thinking…' : 'Ask'}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Answer {result.mock && <Badge variant="secondary">mock mode</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap">{result.answer}</p>
            {result.sources.map((s, i) => (
              <blockquote key={i} className="border-l-2 pl-3 text-sm text-muted-foreground">
                <CardDescription className="font-medium">{s.title}</CardDescription>
                {s.snippet}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
