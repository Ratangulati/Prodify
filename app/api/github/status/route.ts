import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { githubAppConfig } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

// GET /api/github/status — what the settings screen needs to render
export async function GET() {
  const workspace = await getDefaultWorkspace(prisma)
  const [connection, repos] = await Promise.all([
    prisma.gitHubConnection.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.gitHubRepo.findMany({ where: { workspaceId: workspace.id }, orderBy: { fullName: 'asc' } }),
  ])
  const config = githubAppConfig()
  return NextResponse.json({
    configured: config !== null,
    // GitHub's page for choosing which repositories the app can see
    manageUrl:  config ? `https://github.com/apps/${config.slug}/installations/new` : null,
    connection: connection ? { accountLogin: connection.accountLogin } : null,
    repos:      repos.map((r) => ({ githubId: r.githubId, fullName: r.fullName })),
    automation: workspace.githubAutomation,
  })
}
