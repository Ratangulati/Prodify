import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { parseCapacity } from '@/lib/planning-input'

type Params = { params: { id: string } }

// PATCH /api/members/:id { name?, capacity? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const workspace = await getDefaultWorkspace(prisma)
  const body = await req.json().catch(() => ({}))
  const data: { name?: string; capacity?: number } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.capacity !== undefined) {
    const capacity = parseCapacity(body.capacity)
    if (capacity === null) return NextResponse.json({ error: 'Capacity is a whole number of points from 0 to 100.' }, { status: 400 })
    data.capacity = capacity
  }
  const { count } = await prisma.member.updateMany({ where: { id: params.id, workspaceId: workspace.id }, data })
  if (!count) return NextResponse.json({ error: 'Teammate not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/members/:id — their tasks become unassigned
export async function DELETE(_: NextRequest, { params }: Params) {
  const workspace = await getDefaultWorkspace(prisma)
  const { count } = await prisma.member.deleteMany({ where: { id: params.id, workspaceId: workspace.id } })
  if (!count) return NextResponse.json({ error: 'Teammate not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
