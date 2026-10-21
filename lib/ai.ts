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

// An overloaded model can accept a request and then say nothing for minutes.
// Each model gets START_TIMEOUT_MS to produce its first text before we move
// on; once text is flowing, a silence longer than IDLE_TIMEOUT_MS ends it.
export const START_TIMEOUT_MS = 30_000
export const IDLE_TIMEOUT_MS = 45_000

/** A model that didn't answer in time (message is safe to show the user) */
export class AITimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AITimeoutError'
  }
}

/** Settles like `promise`, unless `ms` passes first: then aborts and rejects with AITimeoutError */
function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new AITimeoutError(message)) }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

type OpenStream = (signal: AbortSignal) => Promise<AsyncIterable<{ text?: string }>>

/**
 * Opens a stream and waits for its first piece of text within `startMs`, so a
 * model that never starts answering counts as unavailable and the next model
 * can be tried. After that, a gap longer than `idleMs` between chunks ends
 * the answer with an error instead of hanging.
 */
export async function openWithTimeouts(
  open: OpenStream,
  { startMs = START_TIMEOUT_MS, idleMs = IDLE_TIMEOUT_MS } = {},
): Promise<AsyncIterable<string>> {
  const controller = new AbortController()

  const firstText = (async () => {
    const iterator = (await open(controller.signal))[Symbol.asyncIterator]()
    for (;;) {
      const next = await iterator.next()
      if (next.done) return { iterator, first: null }
      if (next.value.text) return { iterator, first: next.value.text }
    }
  })()

  const { iterator, first } = await withTimeout(
    firstText, startMs, controller, 'The AI didn\'t start answering in time (it may be overloaded). Please try again in a minute.',
  )

  return (async function* () {
    if (first) yield first
    for (;;) {
      const next = await withTimeout(
        iterator.next(), idleMs, controller, 'The AI stopped responding partway through. Please try again.',
      )
      if (next.done) return
      if (next.value.text) yield next.value.text
    }
  })()
}

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
        // Too slow: retrying the same busy model would just wait again
        if (err instanceof AITimeoutError) {
          console.warn(`${model} didn't answer in time, trying next model`)
          break
        }
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

  // Fallback covers everything up to the first piece of text. Once text has
  // been sent to the browser we can't switch models, so a later failure (or
  // a long silence) is reported instead.
  return runWithFallback(geminiModels(), (model) =>
    openWithTimeouts((abortSignal) =>
      ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction: systemPrompt, maxOutputTokens: 8192, abortSignal },
      }),
    ),
  )
}

/** Turns a Gemini or config error into a message we can show to the user. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof AITimeoutError) return err.message
  const status = statusOf(err)
  if (status === 429) return 'The AI has hit its usage quota. Wait a minute and try again.'
  if (status === 500 || status === 503) return 'The AI models are overloaded right now. Please try again in a minute.'
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return 'AI is not set up correctly on the server (the Gemini API key or model was rejected). Check GEMINI_API_KEY.'
  }
  if (err instanceof Error && err.message.includes('GEMINI_API_KEY')) return err.message
  return 'The AI request failed. Please try again.'
}
