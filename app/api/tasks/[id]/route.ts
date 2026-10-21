import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace, isTaskStatus } from '@/lib/tasks'
import { TASK_INCLUDE, toTaskDto } from '@/lib/task-dto'

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
    include: { ...TASK_INCLUDE, activity: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
  return NextResponse.json({
    task:     toTaskDto(task, workspace.taskKeyPrefix),
    activity: task.activity.map((a) => ({ id: a.id, message: a.message, createdAt: a.createdAt.toISOString() })),
  })
}

// PATCH /api/tasks/:id { title?, status?, description?, docId?, estimate?, assigneeId?, sprintId? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { workspace, task } = await findTask(params.id)
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: {
    title?: string; status?: string; description?: string; docId?: string | null
    estimate?: number; assigneeId?: string | null; sprintId?: string | null
  } = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === 'string') data.description = body.description
  if (body.docId === null || typeof body.docId === 'string') data.docId = body.docId
  if (body.status !== undefined) {
    if (!isTaskStatus(body.status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 })
    data.status = body.status
  }
  if (body.estimate !== undefined) {
    const n = Number(body.estimate)
    if (!Number.isInteger(n) || n < 0 || n > 100) return NextResponse.json({ error: 'Estimate is 0–100 points.' }, { status: 400 })
    data.estimate = n
  }
  // Assignee and sprint must belong to this workspace (null clears them)
  if (body.assigneeId !== undefined) {
    if (body.assigneeId !== null && !(await prisma.member.findFirst({ where: { id: body.assigneeId, workspaceId: workspace.id } }))) {
      return NextResponse.json({ error: 'Unknown teammate.' }, { status: 400 })
    }
    data.assigneeId = body.assigneeId
  }
  if (body.sprintId !== undefined) {
    if (body.sprintId !== null && !(await prisma.sprint.findFirst({ where: { id: body.sprintId, workspaceId: workspace.id } }))) {
      return NextResponse.json({ error: 'Unknown sprint.' }, { status: 400 })
    }
    data.sprintId = body.sprintId
  }

  const updated = await prisma.task.update({
    where: { id: task.id }, data, include: TASK_INCLUDE,
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
