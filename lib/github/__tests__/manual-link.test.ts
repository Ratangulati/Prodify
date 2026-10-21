import { beforeEach, describe, expect, it } from 'vitest'
import { GitHubError } from '@/lib/github/client'
import { linkPullRequestByUrl, parsePullRequestUrl } from '@/lib/github/manual-link'
import { FakeDb } from './fake-db'
import { fakeFetch, json, testConfig } from './helpers'

describe('parsePullRequestUrl', () => {
  it('reads owner, repo and number from PR links', () => {
    expect(parsePullRequestUrl('https://github.com/acme/web/pull/12')).toEqual({ owner: 'acme', repo: 'web', number: 12 })
    expect(parsePullRequestUrl('  https://github.com/acme/web/pull/12/files?w=1#diff ')).toEqual({ owner: 'acme', repo: 'web', number: 12 })
  })

  it('rejects anything that is not a GitHub PR link', () => {
    for (const bad of [
      'not a url',
      'http://github.com/acme/web/pull/12',      // not https
      'https://gitlab.com/acme/web/pull/12',     // not GitHub
      'https://github.com/acme/web/issues/12',   // an issue, not a PR
      'https://github.com/acme/web/pull/abc',    // no number
      'https://github.com/acme/web',
    ]) expect(parsePullRequestUrl(bad)).toBeNull()
  })
})

describe('linkPullRequestByUrl', () => {
  let db: FakeDb
  const prJson = {
    number: 12, title: 'Add CSV import', body: null, html_url: 'https://github.com/Acme/Web/pull/12',
    state: 'open', draft: false, merged: false, updated_at: '2026-10-21T10:00:00Z',
    user: { login: 'dana' }, head: { ref: 'feature/csv' },
  }
  const tokenRoute = { '/app/installations/77/access_tokens': () => json({ token: 't', expires_at: new Date(Date.now() + 3600_000).toISOString() }) }
  const input = { workspaceId: 'ws-a', taskId: 'task-1', url: 'https://github.com/acme/web/pull/12' }

  beforeEach(async () => {
    db = new FakeDb()
    await db.workspace.create({ data: { id: 'ws-a', name: 'A' } })
    await db.task.create({ data: { id: 'task-1', workspaceId: 'ws-a', number: 1, title: 'CSV' } })
    await db.gitHubConnection.create({ data: { workspaceId: 'ws-a', installationId: 77, accountLogin: 'acme' } })
    await db.gitHubRepo.create({ data: { workspaceId: 'ws-a', githubId: 100, fullName: 'Acme/Web' } })
  })

  it('checks the PR with GitHub and links it (repo names compared case-insensitively)', async () => {
    const { httpFetch, calls } = fakeFetch({ ...tokenRoute, '/repos/Acme/Web/pulls/12': () => json(prJson) })
    const link = await linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, input)

    expect(link).toMatchObject({ number: 12, state: 'open', source: 'manual', repoFullName: 'Acme/Web' })
    expect(calls.some((c) => c.path === '/repos/Acme/Web/pulls/12')).toBe(true)
    expect(await db.taskActivity.count()).toBe(1)
  })

  it('refreshes instead of duplicating when the same PR is pasted again', async () => {
    const { httpFetch } = fakeFetch({ ...tokenRoute, '/repos/Acme/Web/pulls/12': () => json(prJson) })
    await linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, input)
    await linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, input)
    expect(await db.pullRequestLink.count()).toBe(1)
  })

  it('refuses repositories the workspace does not track, without calling GitHub', async () => {
    const { httpFetch, calls } = fakeFetch({})
    await expect(linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, { ...input, url: 'https://github.com/other/repo/pull/1' }))
      .rejects.toThrow(/isn't a tracked repository/)
    expect(calls).toHaveLength(0)
  })

  it('explains a PR that does not exist', async () => {
    const { httpFetch } = fakeFetch(tokenRoute)
    await expect(linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, { ...input, url: 'https://github.com/acme/web/pull/999' }))
      .rejects.toThrow(/#999 wasn't found/)
  })

  it('passes GitHub rate limits through as a clear error', async () => {
    const { httpFetch } = fakeFetch({
      ...tokenRoute,
      '/repos/Acme/Web/pulls/12': () => json({}, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1767225600' } }),
    })
    const err = await linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, input).catch((e) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err.status).toBe(429)
  })

  it('rejects text that is not a PR link', async () => {
    const { httpFetch } = fakeFetch({})
    await expect(linkPullRequestByUrl(db.asPrisma(), httpFetch, testConfig, { ...input, url: 'PROD-1' }))
      .rejects.toThrow(/isn't a GitHub pull request link/)
  })
})
