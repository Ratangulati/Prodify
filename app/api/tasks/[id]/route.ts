import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace, isTaskStatus } from '@/lib/tasks'
import { toTaskDto } from '@/lib/task-dto'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

/** Loads a task only if it belongs to the current workspace */
async function findTask(id: string) {
  const workspace = await getDefaultWorkspace(prisma)
  const task = await prisma.task.findFirst({ where: { id, workspaceId: workspace.id } })
  return { workspace, task }
}

// GET /api/tasks/:id — one task with its PRs and recent activity
export async function GET(_: NextRequest, { params }: Params) {
  const workspace = await getDefaultWorkspace(prisma)
  const task = await prisma.task.findFirst({
    where:   { id: params.id, workspaceId: workspace.id },
    include: {
      pullRequests: { orderBy: { prUpdatedAt: 'desc' } },
      activity:     { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
  return NextResponse.json({
    task:     toTaskDto(task, workspace.taskKeyPrefix),
    activity: task.activity.map((a) => ({ id: a.id, message: a.message, createdAt: a.createdAt.toISOString() })),
  })
}

// PATCH /api/tasks/:id { title?, status?, description?, docId? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { workspace, task } = await findTask(params.id)
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: { title?: string; status?: string; description?: string; docId?: string | null } = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === 'string') data.description = body.description
  if (body.docId === null || typeof body.docId === 'string') data.docId = body.docId
  if (body.status !== undefined) {
    if (!isTaskStatus(body.status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 })
    data.status = body.status
  }

  const updated = await prisma.task.update({
    where: { id: task.id }, data, include: { pullRequests: { orderBy: { prUpdatedAt: 'desc' } } },
  })
  return NextResponse.json(toTaskDto(updated, workspace.taskKeyPrefix))
}

// DELETE /api/tasks/:id
export async function DELETE(_: NextRequest, { params }: Params) {
  const { task } = await findTask(params.id)
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
  await prisma.task.delete({ where: { id: task.id } })
  return NextResponse.json({ ok: true })
}
