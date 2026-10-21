import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'

// DELETE /api/tasks/:id/pull-requests/:linkId — unlink a PR from a task
export async function DELETE(_: NextRequest, { params }: { params: { id: string; linkId: string } }) {
  const workspace = await getDefaultWorkspace(prisma)
  const { count } = await prisma.pullRequestLink.deleteMany({
    where: { id: params.linkId, taskId: params.id, workspaceId: workspace.id },
  })
  if (!count) return NextResponse.json({ error: 'Link not found.' }, { status: 404 })
  await prisma.taskActivity.create({ data: { taskId: params.id, message: 'Unlinked a pull request.' } })
  return NextResponse.json({ ok: true })
}
