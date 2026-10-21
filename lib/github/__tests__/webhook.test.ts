import { beforeEach, describe, expect, it } from 'vitest'
import { processWebhook } from '@/lib/github/webhook'
import { FakeDb } from './fake-db'

let db: FakeDb
let deliveries = 0

/** A pull_request delivery as GitHub sends it (only the fields we read) */
function prEvent(over: { action?: string; repoId?: number; branch?: string; title?: string; body?: string;
  number?: number; state?: 'open' | 'closed'; draft?: boolean; merged?: boolean; updatedAt?: string } = {}) {
  return {
    event: 'pull_request',
    deliveryId: `delivery-${++deliveries}`,
    payload: {
      action: over.action ?? 'opened',
      repository: { id: over.repoId ?? 100, full_name: 'acme/web' },
      pull_request: {
        number: over.number ?? 12,
        title: over.title ?? 'Add CSV import',
        body: over.body ?? '',
        html_url: `https://github.com/acme/web/pull/${over.number ?? 12}`,
        state: over.state ?? 'open',
        draft: over.draft ?? false,
        merged: over.merged ?? false,
        updated_at: over.updatedAt ?? '2026-10-21T10:00:00Z',
        user: { login: 'dana' },
        head: { ref: over.branch ?? 'prod-1-add-csv-import' },
      },
    },
  }
}

beforeEach(async () => {
  db = new FakeDb()
  // Two workspaces that both use the PROD prefix and both have a PROD-1
  await db.workspace.create({ data: { id: 'ws-a', name: 'A' } })
  await db.workspace.create({ data: { id: 'ws-b', name: 'B' } })
  await db.task.create({ data: { id: 'task-a1', workspaceId: 'ws-a', number: 1, title: 'CSV import' } })
  await db.task.create({ data: { id: 'task-b1', workspaceId: 'ws-b', number: 1, title: 'Other team task' } })
  await db.gitHubRepo.create({ data: { workspaceId: 'ws-a', githubId: 100, fullName: 'acme/web' } })
  await db.gitHubRepo.create({ data: { workspaceId: 'ws-b', githubId: 200, fullName: 'other/app' } })
})

describe('pull_request webhooks', () => {
  it('links a PR to the task named in its branch and notes it on the task', async () => {
    const result = await processWebhook(db.asPrisma(), prEvent())
    expect(result.status).toBe('processed')

    const [link] = await db.pullRequestLink.findMany({ where: { taskId: 'task-a1' } })
    expect(link).toMatchObject({ number: 12, state: 'open', author: 'dana', source: 'auto', repoFullName: 'acme/web' })
    const [note] = await db.taskActivity.findMany({ where: { taskId: 'task-a1' } })
    expect(note.message).toMatch(/found PROD-1 in the branch name/)
  })

  it('processes the same delivery only once', async () => {
    const event = prEvent()
    await processWebhook(db.asPrisma(), event)
    const again = await processWebhook(db.asPrisma(), event)

    expect(again.status).toBe('duplicate')
    expect(await db.pullRequestLink.count()).toBe(1)
    expect(await db.taskActivity.count()).toBe(1)
  })

  it('updates the existing link on later events instead of adding another', async () => {
    await processWebhook(db.asPrisma(), prEvent())
    await processWebhook(db.asPrisma(), prEvent({ action: 'closed', state: 'closed', merged: true, updatedAt: '2026-10-21T11:00:00Z' }))

    const links = await db.pullRequestLink.findMany()
    expect(links).toHaveLength(1)
    expect(links[0].state).toBe('merged')
  })

  it('ignores an event older than what is stored', async () => {
    await processWebhook(db.asPrisma(), prEvent({ action: 'closed', state: 'closed', merged: true, updatedAt: '2026-10-21T11:00:00Z' }))
    await processWebhook(db.asPrisma(), prEvent({ action: 'edited', updatedAt: '2026-10-21T09:00:00Z' }))

    const [link] = await db.pullRequestLink.findMany()
    expect(link.state).toBe('merged')
  })

  it('reports draft PRs as draft', async () => {
    await processWebhook(db.asPrisma(), prEvent({ draft: true }))
    const [link] = await db.pullRequestLink.findMany()
    expect(link.state).toBe('draft')
  })

  it('never touches another workspace, even when task keys collide', async () => {
    // Workspace A's repo mentions PROD-1: only A's PROD-1 may be linked
    await processWebhook(db.asPrisma(), prEvent({ repoId: 100 }))
    expect(await db.pullRequestLink.count({ where: { taskId: 'task-b1' } })).toBe(0)

    // And B's repo links only B's PROD-1
    await processWebhook(db.asPrisma(), prEvent({ repoId: 200, number: 5 }))
    const bLinks = await db.pullRequestLink.findMany({ where: { taskId: 'task-b1' } })
    expect(bLinks).toHaveLength(1)
    expect(bLinks[0]).toMatchObject({ workspaceId: 'ws-b', repoFullName: 'other/app', number: 5 })
  })

  it('ignores repositories no workspace tracks', async () => {
    const result = await processWebhook(db.asPrisma(), prEvent({ repoId: 999 }))
    expect(result.status).toBe('ignored')
    expect(await db.pullRequestLink.count()).toBe(0)
  })

  it('ignores PRs without a task key and actions it does not use', async () => {
    expect((await processWebhook(db.asPrisma(), prEvent({ branch: 'fix-typo' }))).status).toBe('ignored')
    expect((await processWebhook(db.asPrisma(), prEvent({ action: 'labeled' }))).status).toBe('ignored')
  })

  it('keeps updating a manually linked PR even though its key is missing', async () => {
    await db.pullRequestLink.create({ data: {
      workspaceId: 'ws-a', taskId: 'task-a1', repoFullName: 'acme/web', number: 30, title: 'Old title',
      url: 'https://github.com/acme/web/pull/30', state: 'open', author: 'dana',
      prUpdatedAt: new Date('2026-10-20T00:00:00Z'), source: 'manual',
    } })
    await processWebhook(db.asPrisma(), prEvent({ number: 30, branch: 'feature/no-key', title: 'New title', action: 'edited' }))

    const [link] = await db.pullRequestLink.findMany({ where: { number: 30 } })
    expect(link).toMatchObject({ title: 'New title', source: 'manual' })
  })

  it('rolls back and lets the retry through when processing fails', async () => {
    const original = db.taskActivity.create.bind(db.taskActivity)
    db.taskActivity.create = async () => { throw new Error('database hiccup') }
    const event = prEvent()
    await expect(processWebhook(db.asPrisma(), event)).rejects.toThrow('database hiccup')
    expect(await db.webhookDelivery.count()).toBe(0)

    db.taskActivity.create = original
    expect((await processWebhook(db.asPrisma(), event)).status).toBe('processed')
  })
})

describe('installation webhooks', () => {
  it('forgets the connection and repos when the app is uninstalled', async () => {
    await db.gitHubConnection.create({ data: { workspaceId: 'ws-a', installationId: 55, accountLogin: 'acme' } })
    await processWebhook(db.asPrisma(), { event: 'installation', deliveryId: 'd-uninstall', payload: { action: 'deleted', installation: { id: 55 } } })

    expect(await db.gitHubConnection.count()).toBe(0)
    expect(await db.gitHubRepo.count({ where: { workspaceId: 'ws-a' } })).toBe(0)
    expect(await db.gitHubRepo.count({ where: { workspaceId: 'ws-b' } })).toBe(1)
  })
})

describe('automation', () => {
  const statusOf = async (id: string) => (await db.task.findUnique({ where: { id } }))?.status

  it('changes nothing when automation is off (the default)', async () => {
    await processWebhook(db.asPrisma(), prEvent())
    await processWebhook(db.asPrisma(), prEvent({ action: 'closed', state: 'closed', merged: true, updatedAt: '2026-10-21T11:00:00Z' }))
    expect(await statusOf('task-a1')).toBe('todo')
  })

  it('moves a task to Review when its PR opens and to Done when it merges, with notes', async () => {
    await db.workspace.update({ where: { id: 'ws-a' }, data: { githubAutomation: true } })

    await processWebhook(db.asPrisma(), prEvent())
    expect(await statusOf('task-a1')).toBe('review')

    await processWebhook(db.asPrisma(), prEvent({ action: 'closed', state: 'closed', merged: true, updatedAt: '2026-10-21T11:00:00Z' }))
    expect(await statusOf('task-a1')).toBe('done')

    const notes = (await db.taskActivity.findMany({ where: { taskId: 'task-a1' } })).map((n) => n.message)
    expect(notes).toEqual(expect.arrayContaining([
      expect.stringMatching(/Moved to Review automatically: PR #12/),
      expect.stringMatching(/Moved to Done automatically: PR #12 was merged/),
    ]))
  })

  it('leaves draft PRs and finished tasks alone', async () => {
    await db.workspace.update({ where: { id: 'ws-a' }, data: { githubAutomation: true } })
    await processWebhook(db.asPrisma(), prEvent({ draft: true }))
    expect(await statusOf('task-a1')).toBe('todo')

    await db.task.update({ where: { id: 'task-a1' }, data: { status: 'done' } })
    await processWebhook(db.asPrisma(), prEvent({ action: 'reopened', updatedAt: '2026-10-21T12:00:00Z' }))
    expect(await statusOf('task-a1')).toBe('done')
  })
})
