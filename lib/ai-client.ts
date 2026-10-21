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
