import { describe, expect, it } from 'vitest'
import { AITimeoutError, aiErrorMessage, openWithTimeouts, runWithFallback } from '@/lib/ai'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A fake model stream: waits `delays[i]` ms before yielding chunk i; stops early if aborted */
function fakeOpen(chunks: string[], delays: number[], opened: { signal?: AbortSignal } = {}) {
  return async (signal: AbortSignal) => {
    opened.signal = signal
    return (async function* () {
      for (let i = 0; i < chunks.length; i++) {
        await wait(delays[i] ?? 0)
        if (signal.aborted) return
        yield { text: chunks[i] }
      }
    })()
  }
}

async function collect(stream: AsyncIterable<string>) {
  let text = ''
  for await (const chunk of stream) text += chunk
  return text
}

describe('openWithTimeouts', () => {
  it('passes a normal answer through', async () => {
    const stream = await openWithTimeouts(fakeOpen(['Hello', ' world'], [5, 5]), { startMs: 200, idleMs: 200 })
    expect(await collect(stream)).toBe('Hello world')
  })

  it('gives up (and cancels the request) when the first text never comes', async () => {
    const opened: { signal?: AbortSignal } = {}
    await expect(openWithTimeouts(fakeOpen(['late'], [300], opened), { startMs: 30, idleMs: 200 }))
      .rejects.toBeInstanceOf(AITimeoutError)
    expect(opened.signal?.aborted).toBe(true)
  })

  it('ends with a timeout when the stream goes quiet partway through', async () => {
    const stream = await openWithTimeouts(fakeOpen(['Part one', ' never'], [5, 300]), { startMs: 200, idleMs: 30 })
    await expect(collect(stream)).rejects.toThrow(/stopped responding/)
  })
})

describe('runWithFallback with timeouts', () => {
  it('moves to the next model when one never starts answering', async () => {
    const tried: string[] = []
    const stream = await runWithFallback(['slow', 'fast'], (model) => {
      tried.push(model)
      return model === 'slow'
        ? openWithTimeouts(fakeOpen(['too late'], [300]), { startMs: 30 })
        : openWithTimeouts(fakeOpen(['from fast'], [5]), { startMs: 200 })
    })
    expect(await collect(stream)).toBe('from fast')
    expect(tried).toEqual(['slow', 'fast']) // no wasted retry on the slow model
  })

  it('explains a timeout in plain words when every model is too slow', async () => {
    const err = await runWithFallback(['a', 'b'], () => openWithTimeouts(fakeOpen(['x'], [300]), { startMs: 20 }))
      .catch((e) => e)
    expect(aiErrorMessage(err)).toMatch(/didn't start answering in time/)
  })
})
