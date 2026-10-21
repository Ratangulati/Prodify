import type { Prisma, PrismaClient } from '@prisma/client'
import { formatTaskKey } from '@/lib/tasks'
import { findTaskKeys } from '@/lib/github/keys'
import { linkFields, type GitHubPullRequest } from '@/lib/github/pull-requests'

type Tx = Prisma.TransactionClient

export interface WebhookResult {
  status: 'processed' | 'ignored' | 'duplicate'
  detail?: string
}

/** pull_request actions that can change a link's title, state or keys */
const PULL_REQUEST_ACTIONS = new Set([
  'opened', 'edited', 'closed', 'reopened', 'ready_for_review', 'converted_to_draft',
])

interface PullRequestEvent {
  action: string
  repository: { id: number; full_name: string }
  pull_request: GitHubPullRequest
}

/**
 * Handles one verified webhook delivery. The delivery id is recorded in the
 * same transaction as the changes it causes:
 *  - the same delivery arriving twice fails on the unique id → "duplicate"
 *  - if handling throws, everything rolls back (including the id), so
 *    GitHub's retry is processed normally
 */
export async function processWebhook(
  db: PrismaClient,
  delivery: { event: string; deliveryId: string; payload: unknown },
): Promise<WebhookResult> {
  try {
    return await db.$transaction(async (tx) => {
      await tx.webhookDelivery.create({ data: { id: delivery.deliveryId, event: delivery.event } })
      return handleEvent(tx, delivery.event, delivery.payload)
    })
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'duplicate', detail: 'Already processed this delivery.' }
    throw err
  }
}

function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

async function handleEvent(tx: Tx, event: string, payload: unknown): Promise<WebhookResult> {
  const body = payload as Record<string, unknown>

  if (event === 'pull_request') return handlePullRequest(tx, payload as PullRequestEvent)

  // The app was uninstalled on GitHub: forget the connection and its repos
  if (event === 'installation' && body.action === 'deleted') {
    const installationId = (body.installation as { id: number }).id
    const connection = await tx.gitHubConnection.findUnique({ where: { installationId } })
    if (!connection) return { status: 'ignored', detail: 'Unknown installation.' }
    await tx.gitHubRepo.deleteMany({ where: { workspaceId: connection.workspaceId } })
    await tx.gitHubConnection.delete({ where: { id: connection.id } })
    return { status: 'processed', detail: 'Installation removed.' }
  }

  // Repos were removed from the app's access: stop tracking them
  if (event === 'installation_repositories' && body.action === 'removed') {
    const removed = (body.repositories_removed as { id: number }[]) ?? []
    await tx.gitHubRepo.deleteMany({ where: { githubId: { in: removed.map((r) => r.id) } } })
    return { status: 'processed', detail: `Stopped tracking ${removed.length} repositories.` }
  }

  return { status: 'ignored', detail: `Event "${event}" isn't used.` }
}

async function handlePullRequest(tx: Tx, event: PullRequestEvent): Promise<WebhookResult> {
  if (!PULL_REQUEST_ACTIONS.has(event.action)) {
    return { status: 'ignored', detail: `Action "${event.action}" isn't used.` }
  }

  // Only repos a workspace chose to track count. The repo decides the
  // workspace, so tasks in other workspaces are never looked at.
  const repo = await tx.gitHubRepo.findUnique({
    where: { githubId: event.repository.id },
    include: { workspace: true },
  })
  if (!repo) return { status: 'ignored', detail: 'Repository is not tracked by any workspace.' }

  const pr     = event.pull_request
  const fields = linkFields(pr)
  const keys   = findTaskKeys(repo.workspace.taskKeyPrefix, {
    branch: pr.head.ref, title: pr.title, body: pr.body ?? '',
  })

  // Links this PR already has (including manual ones whose task key isn't in the PR)
  const existingLinks = await tx.pullRequestLink.findMany({
    where: { workspaceId: repo.workspaceId, repoFullName: repo.fullName, number: pr.number },
  })

  const tasks = await tx.task.findMany({
    where: {
      workspaceId: repo.workspaceId,
      OR: [
        { number: { in: Array.from(keys.keys()) } },
        { id: { in: existingLinks.map((l) => l.taskId) } },
      ],
    },
  })

  const linked: string[] = []
  for (const task of tasks) {
    const existing = existingLinks.find((l) => l.taskId === task.id)
    const key = formatTaskKey(repo.workspace.taskKeyPrefix, task.number)

    if (existing) {
      // Events can arrive out of order; never let an older one overwrite newer data
      if (existing.prUpdatedAt > fields.prUpdatedAt) continue
      await tx.pullRequestLink.update({ where: { id: existing.id }, data: fields })
    } else {
      await tx.pullRequestLink.create({
        data: {
          ...fields,
          workspaceId:  repo.workspaceId,
          taskId:       task.id,
          repoFullName: repo.fullName,
          number:       pr.number,
          source:       'auto',
        },
      })
      await tx.taskActivity.create({
        data: {
          taskId:  task.id,
          message: `Linked PR #${pr.number} in ${repo.fullName}: found ${key} in the ${keys.get(task.number) ?? 'PR'}.`,
        },
      })
    }
    linked.push(key)
  }

  return linked.length
    ? { status: 'processed', detail: `Updated ${linked.join(', ')}.` }
    : { status: 'ignored', detail: 'No task keys in this pull request.' }
}
