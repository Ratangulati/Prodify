import type { PrismaClient } from '@prisma/client'
import {
  GitHubError, githubRequest, installationToken, type GitHubAppConfig, type HttpFetch,
} from '@/lib/github/client'
import { linkFields, type GitHubPullRequest } from '@/lib/github/pull-requests'

/** https://github.com/acme/web/pull/12 (optionally /files, ?query, #hash) → parts */
export function parsePullRequestUrl(input: string) {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname)) return null

  const [owner, repo, kind, number] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo || kind !== 'pull' || !/^\d+$/.test(number ?? '')) return null
  return { owner, repo, number: Number(number) }
}

/**
 * Links a pasted PR URL to a task after checking with GitHub that the PR
 * exists in a repository this workspace tracks. Linking the same PR again
 * just refreshes it. Throws GitHubError with a message fit for the UI.
 */
export async function linkPullRequestByUrl(
  db: PrismaClient,
  httpFetch: HttpFetch,
  config: GitHubAppConfig,
  input: { workspaceId: string; taskId: string; url: string },
) {
  const parsed = parsePullRequestUrl(input.url)
  if (!parsed) {
    throw new GitHubError('That isn\'t a GitHub pull request link. It should look like https://github.com/owner/repo/pull/12.', 400)
  }

  // GitHub names are case-insensitive, so compare lowercased
  const fullName = `${parsed.owner}/${parsed.repo}`.toLowerCase()
  const repos = await db.gitHubRepo.findMany({ where: { workspaceId: input.workspaceId } })
  const repo  = repos.find((r) => r.fullName.toLowerCase() === fullName)
  if (!repo) {
    throw new GitHubError(`${parsed.owner}/${parsed.repo} isn't a tracked repository. Add it in GitHub settings first.`, 400)
  }

  const connection = await db.gitHubConnection.findUnique({ where: { workspaceId: input.workspaceId } })
  if (!connection) throw new GitHubError('GitHub is not connected.', 400)

  let pr: GitHubPullRequest
  try {
    const token = await installationToken(httpFetch, config, connection.installationId)
    pr = await githubRequest<GitHubPullRequest>(httpFetch, `/repos/${repo.fullName}/pulls/${parsed.number}`, token)
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) {
      throw new GitHubError(`Pull request #${parsed.number} wasn't found in ${repo.fullName}.`, 404)
    }
    throw err
  }

  const key = { taskId: input.taskId, repoFullName: repo.fullName, number: pr.number }
  const existing = await db.pullRequestLink.findUnique({ where: { taskId_repoFullName_number: key } })
  if (existing) {
    return db.pullRequestLink.update({ where: { id: existing.id }, data: linkFields(pr) })
  }

  const link = await db.pullRequestLink.create({
    data: { ...key, ...linkFields(pr), workspaceId: input.workspaceId, source: 'manual' },
  })
  await db.taskActivity.create({
    data: { taskId: input.taskId, message: `Linked PR #${pr.number} in ${repo.fullName} by URL.` },
  })
  return link
}
