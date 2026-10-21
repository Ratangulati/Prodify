import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'

export const dynamic = 'force-dynamic'

// GET /api/planning — auto-plan setting, the team with current load, the active sprint
export async function GET() {
  const workspace = await getDefaultWorkspace(prisma)
  const [members, activeSprint] = await Promise.all([
    prisma.member.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: 'asc' } }),
    prisma.sprint.findFirst({ where: { workspaceId: workspace.id, status: 'active' } }),
  ])
  // Open points per person where new work would go (active sprint, else backlog)
  const open = await prisma.task.findMany({
    where: { workspaceId: workspace.id, sprintId: activeSprint?.id ?? null, NOT: { status: 'done' }, assigneeId: { not: null } },
    select: { assigneeId: true, estimate: true },
  })
  const load = new Map<string, number>()
  for (const t of open) load.set(t.assigneeId!, (load.get(t.assigneeId!) ?? 0) + t.estimate)

  return NextResponse.json({
    autoPlan: workspace.autoPlan,
    members: members.map((m) => ({ id: m.id, name: m.name, capacity: m.capacity, load: load.get(m.id) ?? 0 })),
    activeSprint: activeSprint && {
      id: activeSprint.id, name: activeSprint.name, startDate: activeSprint.startDate, endDate: activeSprint.endDate,
    },
  })
}

// PATCH /api/planning { autoPlan: boolean }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (typeof body?.autoPlan !== 'boolean') return NextResponse.json({ error: 'Send { autoPlan: true | false }.' }, { status: 400 })
  const workspace = await getDefaultWorkspace(prisma)
  await prisma.workspace.update({ where: { id: workspace.id }, data: { autoPlan: body.autoPlan } })
  return NextResponse.json({ autoPlan: body.autoPlan })
}
