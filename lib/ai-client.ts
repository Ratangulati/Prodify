// Browser-side helpers for reading /api/ai responses and explaining failures.
// Kept separate from lib/ai.ts so the Gemini SDK never ends up in the client bundle.

// Must match STREAM_ERROR_MARKER in app/api/ai/route.ts
export const STREAM_ERROR_MARKER = '\u0000AI_ERROR:'

/** An AI failure with a plain-language message that can be shown to the user. */
export class AIError extends Error {
  constructor(message: string) {
    super(message || 'The AI request failed. Please try again.')
    this.name = 'AIError'
  }
}

/** Turns anything thrown during an AI call into an AIError. */
export function toAIError(err: unknown): AIError {
  if (err instanceof AIError) return err
  // fetch throws a TypeError when the server can't be reached
  if (err instanceof TypeError) return new AIError("Can't reach the server. Check your connection and try again.")
  return new AIError(err instanceof Error ? err.message : '')
}

/** Reads the { error } message from a failed /api/ai response. */
export async function errorFromResponse(res: Response): Promise<AIError> {
  try {
    const data = await res.json()
    return new AIError(data.error)
  } catch {
    return new AIError(`The AI request failed (HTTP ${res.status}). Please try again.`)
  }
}

/**
 * Sends one request to /api/ai and returns the whole answer. Any failure
 * (an error response, the server's mid-stream error marker, an empty
 * answer, no connection) becomes an AIError with a readable message, so
 * callers never mistake an error for an answer. An abort is rethrown as is.
 */
export async function askAI(
  body: { workflow: string; userMessage: string; documentContext?: string | null; conversationHistory?: unknown[] },
  options: { signal?: AbortSignal; onText?: (textSoFar: string) => void } = {},
): Promise<string> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({ conversationHistory: [], ...body }),
    })
    if (!res.ok || !res.body) throw await errorFromResponse(res)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      full += decoder.decode(value, { stream: true })
      const at = full.indexOf(STREAM_ERROR_MARKER)
      if (at !== -1) throw new AIError(full.slice(at + STREAM_ERROR_MARKER.length))
      options.onText?.(full)
    }
    if (!full.trim()) throw new AIError('The AI returned an empty answer. Please try again.')
    return full
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    throw toAIError(err)
  }
}
