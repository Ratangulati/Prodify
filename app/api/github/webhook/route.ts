import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignature } from '@/lib/github/signature'
import { processWebhook } from '@/lib/github/webhook'

export const dynamic = 'force-dynamic'

// POST /api/github/webhook — set this as the GitHub App's webhook URL
export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'GITHUB_WEBHOOK_SECRET is not set.' }, { status: 503 })

  // The signature covers the exact bytes GitHub sent, so read them raw
  const rawBody = Buffer.from(await req.arrayBuffer())
  if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const event      = req.headers.get('x-github-event')
  const deliveryId = req.headers.get('x-github-delivery')
  if (!event || !deliveryId) return NextResponse.json({ error: 'Missing GitHub headers.' }, { status: 400 })

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Body is not JSON.' }, { status: 400 })
  }

  try {
    return NextResponse.json(await processWebhook(prisma, { event, deliveryId, payload }))
  } catch (err) {
    // A 500 makes GitHub mark the delivery failed; it can be redelivered from the app settings
    console.error('GitHub webhook failed:', err)
    return NextResponse.json({ error: 'Could not process this delivery.' }, { status: 500 })
  }
}
