import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { isIsoDate } from '@/lib/planning-input'

// POST /api/sprints { name, startDate, endDate } — starts a new active sprint.
// The current one (if any) is completed and its unfinished tasks carry over.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'A sprint needs a name.' }, { status: 400 })
  if (!isIsoDate(body?.startDate) || !isIsoDate(body?.endDate) || body.endDate < body.startDate) {
    return NextResponse.json({ error: 'Give a start and end date (YYYY-MM-DD), end on or after start.' }, { status: 400 })
  }

  const workspace = await getDefaultWorkspace(prisma)
  const sprint = await prisma.$transaction(async (tx) => {
    const current = await tx.sprint.findFirst({ where: { workspaceId: workspace.id, status: 'active' } })
    const next = await tx.sprint.create({
      data: { workspaceId: workspace.id, name, startDate: body.startDate, endDate: body.endDate },
    })
    if (current) {
      await tx.task.updateMany({
        where: { workspaceId: workspace.id, sprintId: current.id, NOT: { status: 'done' } },
        data: { sprintId: next.id },
      })
      await tx.sprint.update({ where: { id: current.id }, data: { status: 'completed' } })
    }
    return next
  })
  return NextResponse.json(sprint, { status: 201 })
}
