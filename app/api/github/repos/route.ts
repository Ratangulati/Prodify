import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { githubAppConfig, GitHubError, listInstallationRepos } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

async function loadConnection() {
  const workspace  = await getDefaultWorkspace(prisma)
  const connection = await prisma.gitHubConnection.findUnique({ where: { workspaceId: workspace.id } })
  return { workspace, connection, config: githubAppConfig() }
}

function errorResponse(err: unknown) {
  if (err instanceof GitHubError) return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 502 })
  console.error(err)
  return NextResponse.json({ error: 'Something went wrong talking to GitHub.' }, { status: 500 })
}

// GET /api/github/repos — repos the installation can see, marking the selected ones
export async function GET() {
  const { workspace, connection, config } = await loadConnection()
  if (!config || !connection) return NextResponse.json({ error: 'GitHub is not connected.' }, { status: 400 })
  try {
    const [available, selected] = await Promise.all([
      listInstallationRepos(fetch, config, connection.installationId),
      prisma.gitHubRepo.findMany({ where: { workspaceId: workspace.id } }),
    ])
    const selectedIds = new Set(selected.map((r) => r.githubId))
    return NextResponse.json(available.map((r) => ({
      githubId: r.id, fullName: r.full_name, private: r.private, selected: selectedIds.has(r.id),
    })))
  } catch (err) {
    return errorResponse(err)
  }
}

// PUT /api/github/repos { repoIds: number[] } — replaces the tracked repo list
export async function PUT(req: NextRequest) {
  const { workspace, connection, config } = await loadConnection()
  if (!config || !connection) return NextResponse.json({ error: 'GitHub is not connected.' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const ids: unknown[] = Array.isArray(body?.repoIds) ? body.repoIds : []
  const repoIds = ids.filter((id): id is number => Number.isInteger(id))

  try {
    // Only accept repos the installation can actually see
    const available = await listInstallationRepos(fetch, config, connection.installationId)
    const chosen = available.filter((r) => repoIds.includes(r.id))

    const takenElsewhere = await prisma.gitHubRepo.findFirst({
      where: { githubId: { in: chosen.map((r) => r.id) }, NOT: { workspaceId: workspace.id } },
    })
    if (takenElsewhere) {
      return NextResponse.json({ error: `${takenElsewhere.fullName} is already linked to another workspace.` }, { status: 409 })
    }

    await prisma.$transaction([
      prisma.gitHubRepo.deleteMany({ where: { workspaceId: workspace.id } }),
      prisma.gitHubRepo.createMany({
        data: chosen.map((r) => ({ workspaceId: workspace.id, githubId: r.id, fullName: r.full_name })),
      }),
    ])
    return NextResponse.json({ ok: true, count: chosen.length })
  } catch (err) {
    return errorResponse(err)
  }
}
