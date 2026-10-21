import { NextRequest } from 'next/server'
import { aiErrorMessage, streamChat, type ChatTurn } from '@/lib/ai'
import { getSystemPrompt } from '@/lib/prompts'
import type { AIWorkflow } from '@/lib/types'

// The Gemini SDK's server build relies on Node APIs, so this route can't run on the Edge runtime
export const runtime = 'nodejs'

// Sent in place of more text when the stream fails part-way through.
// AIChatPanel looks for the same marker.
const STREAM_ERROR_MARKER = '\u0000AI_ERROR:'

interface RequestBody {
  workflow: AIWorkflow
  userMessage: string
  documentContext?: string
  conversationHistory: ChatTurn[]
}

export async function POST(req: NextRequest) {
  let body: RequestBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { workflow = 'general', userMessage, documentContext, conversationHistory = [] } = body

  if (!userMessage?.trim()) {
    return Response.json({ error: 'userMessage is required' }, { status: 400 })
  }

  const systemPrompt = getSystemPrompt(workflow, documentContext)

  // Start the stream before responding, so a bad key or overloaded model
  // becomes a normal JSON error instead of a broken stream
  let chunks: AsyncIterable<string>
  try {
    chunks = await streamChat(systemPrompt, conversationHistory, userMessage)
  } catch (err) {
    console.error('AI request failed:', err)
    return Response.json({ error: aiErrorMessage(err) }, { status: 502 })
  }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of chunks) {
          controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        console.error('AI stream failed:', err)
        controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}${aiErrorMessage(err)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
