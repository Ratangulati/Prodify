import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDefaultWorkspace } from '@/lib/tasks'
import { getInstallation, githubAppConfig, GitHubError } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

// GET /api/github/setup?installation_id=…&setup_action=…&state=…
// GitHub sends the browser here after the app is installed (set this as the
// GitHub App's "Setup URL").
export async function GET(req: NextRequest) {
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/?github=${result}`, req.url))
    res.cookies.delete('github_install_state')
    return res
  }

  const config = githubAppConfig()
  if (!config) return back('not-configured')

  const installationId = Number(req.nextUrl.searchParams.get('installation_id'))
  if (!Number.isInteger(installationId) || installationId <= 0) return back('error')

  const workspace = await getDefaultWorkspace(prisma)
  const existing  = await prisma.gitHubConnection.findUnique({ where: { installationId } })

  // Changing repo access on GitHub later sends people here without our state;
  // that's fine for an installation this workspace already owns.
  const stateOk = req.nextUrl.searchParams.get('state') === req.cookies.get('github_install_state')?.value
  if (!stateOk && existing?.workspaceId !== workspace.id) return back('error')
  if (existing && existing.workspaceId !== workspace.id) return back('taken')

  try {
    // Only our app's JWT can read its own installations, so this proves the id is genuine
    const installation = await getInstallation(fetch, config, installationId)
    await prisma.gitHubConnection.upsert({
      where:  { workspaceId: workspace.id },
      create: { workspaceId: workspace.id, installationId, accountLogin: installation.account?.login ?? 'unknown' },
      update: { installationId, accountLogin: installation.account?.login ?? 'unknown' },
    })
    return back('connected')
  } catch (err) {
    console.error('GitHub setup failed:', err)
    return back(err instanceof GitHubError && err.status === 429 ? 'rate-limited' : 'error')
  }
}
