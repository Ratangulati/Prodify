import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { runAutoPlan } from '@/lib/auto-plan'

// POST /api/documents/:id/status { status: 'draft' | 'final' }
// Marking a PRD final runs auto-plan when it's switched on, and returns the
// run so the browser can show the review summary (with Undo).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  if (body?.status !== 'draft' && body?.status !== 'final') {
    return NextResponse.json({ error: 'Status is draft or final.' }, { status: 400 })
  }

  const doc = await prisma.document.findUnique({ where: { id: params.id } })
  if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })

  const becameFinal = doc.status !== 'final' && body.status === 'final'
  await prisma.document.update({ where: { id: doc.id }, data: { status: body.status } })

  const workspace = await getDefaultWorkspace(prisma)
  if (!becameFinal || doc.type !== 'prd' || !workspace.autoPlan) {
    return NextResponse.json({ status: body.status, autoPlan: null })
  }

  try {
    const run = await runAutoPlan(prisma, { workspaceId: workspace.id, docId: doc.id })
    return NextResponse.json({ status: body.status, autoPlan: run })
  } catch (err) {
    console.error('Auto-plan failed:', err)
    // The PRD is still final; say clearly that planning didn't happen
    return NextResponse.json({ status: body.status, autoPlan: null, error: 'Marked final, but auto-plan failed. No tasks were created.' })
  }
}
