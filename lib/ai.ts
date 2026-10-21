import { ApiError, GoogleGenAI } from '@google/genai'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

// Tried in order. If one model is overloaded or unavailable, the next one is used.
// GEMINI_MODELS (comma-separated) overrides the list.
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']

export function geminiModels(): string[] {
  const configured = process.env.GEMINI_MODELS?.split(',').map((m) => m.trim()).filter(Boolean)
  return configured?.length ? configured : DEFAULT_MODELS
}

let client: GoogleGenAI | undefined

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set on the server')
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return client
}

// 429 (rate limit), 500 and 503 (overloaded) usually clear within seconds
const RETRYABLE_STATUS = new Set([429, 500, 503])
const RETRY_DELAY_MS = 1000

const statusOf = (err: unknown) => (err instanceof ApiError ? err.status : undefined)

/**
 * Runs `fn` with each model in turn. A temporary error gets one quick retry on the
 * same model, then we move to the next model. A 404 (model not available to this key)
 * also moves on. Anything else (bad key, bad request) is thrown immediately.
 */
export async function runWithFallback<T>(models: string[], fn: (model: string) => Promise<T>): Promise<T> {
  let lastError: unknown
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn(model)
      } catch (err) {
        lastError = err
        const status = statusOf(err)
        const temporary = status !== undefined && RETRYABLE_STATUS.has(status)
        if (!temporary && status !== 404) throw err
        if (temporary && attempt === 0) {
          console.warn(`${model} returned ${status}, retrying in ${RETRY_DELAY_MS}ms`)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          continue
        }
        console.warn(`${model} unavailable (${status}), trying next model`)
        break
      }
    }
  }
  throw lastError
}

/** Starts a streamed Gemini reply and yields the text chunks. */
export async function streamChat(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Promise<AsyncIterable<string>> {
  const ai = getClient()

  // Gemini calls the assistant role 'model'
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  // Fallback only covers starting the stream. Once text has been sent to the
  // browser we can't switch models, so a mid-stream failure is reported instead.
  const stream = await runWithFallback(geminiModels(), (model) =>
    ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction: systemPrompt, maxOutputTokens: 8192 },
    }),
  )

  return (async function* () {
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text
    }
  })()
}

/** Turns a Gemini or config error into a message we can show to the user. */
export function aiErrorMessage(err: unknown): string {
  const status = statusOf(err)
  if (status === 429) return 'The AI has hit its usage quota. Wait a minute and try again.'
  if (status === 500 || status === 503) return 'The AI models are overloaded right now. Please try again in a minute.'
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return 'AI is not set up correctly on the server (the Gemini API key or model was rejected). Check GEMINI_API_KEY.'
  }
  if (err instanceof Error && err.message.includes('GEMINI_API_KEY')) return err.message
  return 'The AI request failed. Please try again.'
}
