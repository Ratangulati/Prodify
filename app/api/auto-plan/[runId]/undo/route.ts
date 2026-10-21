import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { undoAutoPlan } from '@/lib/auto-plan'

// POST /api/auto-plan/:runId/undo — removes the tasks that run created
export async function POST(_: NextRequest, { params }: { params: { runId: string } }) {
  const workspace = await getDefaultWorkspace(prisma)
  try {
    return NextResponse.json(await undoAutoPlan(prisma, { workspaceId: workspace.id, runId: params.runId }))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Undo failed.' }, { status: 404 })
  }
}
