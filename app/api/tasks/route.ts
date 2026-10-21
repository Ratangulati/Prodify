import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTask, getDefaultWorkspace } from '@/lib/tasks'
import { toTaskDto } from '@/lib/task-dto'

export const dynamic = 'force-dynamic'

// GET /api/tasks — every task in the workspace, newest number first
export async function GET() {
  const workspace = await getDefaultWorkspace(prisma)
  const tasks = await prisma.task.findMany({
    where:   { workspaceId: workspace.id },
    orderBy: { number: 'desc' },
    include: { pullRequests: { orderBy: { prUpdatedAt: 'desc' } } },
  })
  return NextResponse.json(tasks.map((t) => toTaskDto(t, workspace.taskKeyPrefix)))
}

// POST /api/tasks { title, docId? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'A task needs a title.' }, { status: 400 })

  const workspace = await getDefaultWorkspace(prisma)
  const task = await createTask(prisma, workspace.id, {
    title,
    docId: typeof body?.docId === 'string' ? body.docId : null,
  })
  return NextResponse.json(toTaskDto(task, workspace.taskKeyPrefix), { status: 201 })
}
