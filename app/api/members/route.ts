import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { parseCapacity } from '@/lib/planning-input'

// POST /api/members { name, capacity }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const capacity = parseCapacity(body?.capacity ?? 10)
  if (!name) return NextResponse.json({ error: 'A teammate needs a name.' }, { status: 400 })
  if (capacity === null) return NextResponse.json({ error: 'Capacity is a whole number of points from 0 to 100.' }, { status: 400 })

  const workspace = await getDefaultWorkspace(prisma)
  const member = await prisma.member.create({ data: { workspaceId: workspace.id, name, capacity } })
  return NextResponse.json(member, { status: 201 })
}
