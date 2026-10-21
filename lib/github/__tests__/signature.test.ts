import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySignature } from '@/lib/github/signature'

const secret = 'test-secret'
const body   = Buffer.from(JSON.stringify({ action: 'opened' }))
const sign   = (b: Buffer, s = secret) => `sha256=${createHmac('sha256', s).update(b).digest('hex')}`

describe('verifySignature', () => {
  it('accepts a body signed with our secret', () => {
    expect(verifySignature(body, sign(body), secret)).toBe(true)
  })

  it('rejects a body signed with a different secret', () => {
    expect(verifySignature(body, sign(body, 'other-secret'), secret)).toBe(false)
  })

  it('rejects a body changed after signing', () => {
    const tampered = Buffer.from(JSON.stringify({ action: 'closed' }))
    expect(verifySignature(tampered, sign(body), secret)).toBe(false)
  })

  it('rejects missing, malformed and wrong-length headers without throwing', () => {
    expect(verifySignature(body, null, secret)).toBe(false)
    expect(verifySignature(body, 'sha1=abc', secret)).toBe(false)
    expect(verifySignature(body, 'sha256=abc', secret)).toBe(false)
  })
})
