import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { githubAppConfig, GitHubError } from '@/lib/github/client'
import { linkPullRequestByUrl } from '@/lib/github/manual-link'

type Params = { params: { id: string } }

// POST /api/tasks/:id/pull-requests { url } — link a PR by pasting its URL
export async function POST(req: NextRequest, { params }: Params) {
  const config = githubAppConfig()
  if (!config) return NextResponse.json({ error: 'The GitHub App is not configured on the server.' }, { status: 503 })

  const workspace = await getDefaultWorkspace(prisma)
  const task = await prisma.task.findFirst({ where: { id: params.id, workspaceId: workspace.id } })
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (typeof body?.url !== 'string') return NextResponse.json({ error: 'Paste a pull request URL.' }, { status: 400 })

  try {
    const link = await linkPullRequestByUrl(prisma, fetch, config, {
      workspaceId: workspace.id, taskId: task.id, url: body.url,
    })
    return NextResponse.json(link, { status: 201 })
  } catch (err) {
    if (err instanceof GitHubError) return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 400 })
    console.error('Linking a PR failed:', err)
    return NextResponse.json({ error: 'Could not link the pull request.' }, { status: 500 })
  }
}
