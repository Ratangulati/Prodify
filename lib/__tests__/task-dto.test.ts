import { describe, expect, it } from 'vitest'
import { hasOpenPullRequest, isShipped, type PullRequestDto, type TaskDto } from '@/lib/task-dto'

const pr = (state: PullRequestDto['state']): PullRequestDto => ({
  id: state, repoFullName: 'acme/web', number: 1, title: 't', url: 'u', state,
  author: 'dana', updatedAt: '2026-10-21T00:00:00Z', source: 'auto',
})
const task = (status: TaskDto['status'], prs: PullRequestDto[] = []): TaskDto => ({
  id: 'x', key: 'PROD-1', number: 1, title: 't', description: '', status, docId: null,
  branch: 'prod-1-t', updatedAt: '', pullRequests: prs,
  estimate: 2, assigneeId: null, assigneeName: null, sprintId: null, sprintName: null,
})

describe('delivery rules', () => {
  it('counts a task as shipped when it is done or a PR is merged', () => {
    expect(isShipped(task('done'))).toBe(true)
    expect(isShipped(task('review', [pr('open'), pr('merged')]))).toBe(true)
    expect(isShipped(task('review', [pr('open'), pr('closed')]))).toBe(false)
  })

  it('treats open and draft PRs as open', () => {
    expect(hasOpenPullRequest(task('todo', [pr('draft')]))).toBe(true)
    expect(hasOpenPullRequest(task('todo', [pr('merged'), pr('closed')]))).toBe(false)
  })
})
