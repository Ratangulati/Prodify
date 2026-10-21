import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'

// PATCH /api/sprints/:id { status: 'completed' } — ends the sprint; unfinished
// tasks go back to the backlog
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  if (body?.status !== 'completed') return NextResponse.json({ error: 'Only completing a sprint is supported.' }, { status: 400 })

  const workspace = await getDefaultWorkspace(prisma)
  const sprint = await prisma.sprint.findFirst({ where: { id: params.id, workspaceId: workspace.id } })
  if (!sprint) return NextResponse.json({ error: 'Sprint not found.' }, { status: 404 })

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { workspaceId: workspace.id, sprintId: sprint.id, NOT: { status: 'done' } },
      data: { sprintId: null },
    }),
    prisma.sprint.update({ where: { id: sprint.id }, data: { status: 'completed' } }),
  ])
  return NextResponse.json({ ok: true })
}
