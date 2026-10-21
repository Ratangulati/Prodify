import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'

// DELETE /api/github/connection — forgets the installation and tracked repos.
// Linked PRs on tasks stay; the app itself stays installed on GitHub until
// it's removed there (Settings → Applications).
export async function DELETE() {
  const workspace = await getDefaultWorkspace(prisma)
  await prisma.$transaction([
    prisma.gitHubRepo.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.gitHubConnection.deleteMany({ where: { workspaceId: workspace.id } }),
  ])
  return NextResponse.json({ ok: true })
}
