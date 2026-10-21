import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'

// PATCH /api/github/settings { automation: boolean }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (typeof body?.automation !== 'boolean') {
    return NextResponse.json({ error: 'Send { automation: true | false }.' }, { status: 400 })
  }
  const workspace = await getDefaultWorkspace(prisma)
  await prisma.workspace.update({ where: { id: workspace.id }, data: { githubAutomation: body.automation } })
  return NextResponse.json({ automation: body.automation })
}
