import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '../route'

// The route's job is checking the request; what happens next is tested in lib/github.
// vi.mock calls are hoisted above the imports, so the route sees these fakes.
const { processWebhook } = vi.hoisted(() => ({
  processWebhook: vi.fn(async () => ({ status: 'processed' as const })),
}))
vi.mock('@/lib/github/webhook', () => ({ processWebhook }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const secret = 'route-secret'
const body = JSON.stringify({ action: 'opened' })
const sign = (b: string) => `sha256=${createHmac('sha256', secret).update(b).digest('hex')}`

function request(headers: Record<string, string>, payload = body) {
  return new NextRequest('http://localhost/api/github/webhook', { method: 'POST', body: payload, headers })
}

beforeEach(() => {
  processWebhook.mockClear()
  process.env.GITHUB_WEBHOOK_SECRET = secret
})

describe('POST /api/github/webhook', () => {
  it('processes a correctly signed delivery', async () => {
    const res = await POST(request({
      'x-hub-signature-256': sign(body), 'x-github-event': 'pull_request', 'x-github-delivery': 'abc',
    }))
    expect(res.status).toBe(200)
    expect(processWebhook).toHaveBeenCalledWith({}, { event: 'pull_request', deliveryId: 'abc', payload: { action: 'opened' } })
  })

  it('rejects a bad signature before touching the database', async () => {
    const res = await POST(request({
      'x-hub-signature-256': sign('something else'), 'x-github-event': 'pull_request', 'x-github-delivery': 'abc',
    }))
    expect(res.status).toBe(401)
    expect(processWebhook).not.toHaveBeenCalled()
  })

  it('requires the event and delivery headers', async () => {
    const res = await POST(request({ 'x-hub-signature-256': sign(body) }))
    expect(res.status).toBe(400)
  })

  it('refuses everything when no secret is configured', async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET
    const res = await POST(request({ 'x-hub-signature-256': sign(body), 'x-github-event': 'ping', 'x-github-delivery': 'x' }))
    expect(res.status).toBe(503)
  })
})
