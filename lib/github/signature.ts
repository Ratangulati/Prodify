import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * GitHub signs every webhook body with our secret and sends the result as
 * X-Hub-Signature-256: sha256=<hex>. We compute the same HMAC over the raw
 * bytes and compare in constant time, so the check leaks nothing about the
 * expected value through timing.
 */
export function verifySignature(rawBody: Buffer, header: string | null, secret: string) {
  if (!header?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`)
  const received = Buffer.from(header)
  // timingSafeEqual throws on different lengths, so check that first
  return expected.length === received.length && timingSafeEqual(expected, received)
}
