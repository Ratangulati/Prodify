import type { Member, PullRequestLink, Sprint, Task } from '@prisma/client'
import { branchName, formatTaskKey, type TaskStatus } from '@/lib/tasks'
import type { PullRequestState } from '@/lib/github/pull-requests'

/** One linked pull request, as the browser sees it */
export interface PullRequestDto {
  id: string
  repoFullName: string
  number: number
  title: string
  url: string
  state: PullRequestState
  author: string
  updatedAt: string
  source: 'auto' | 'manual'
}

/** Relations every task response includes */
export const TASK_INCLUDE = {
  pullRequests: { orderBy: { prUpdatedAt: 'desc' as const } },
  assignee: true,
  sprint: true,
}

/** What the API sends to the browser for one task */
export interface TaskDto {
  id: string
  key: string
  number: number
  title: string
  description: string
  status: TaskStatus
  docId: string | null
  branch: string
  updatedAt: string
  /** Story points */
  estimate: number
  assigneeId: string | null
  assigneeName: string | null
  /** null = backlog */
  sprintId: string | null
  sprintName: string | null
  pullRequests: PullRequestDto[]
}

export function toPullRequestDto(link: PullRequestLink): PullRequestDto {
  return {
    id:           link.id,
    repoFullName: link.repoFullName,
    number:       link.number,
    title:        link.title,
    url:          link.url,
    state:        link.state as PullRequestState,
    author:       link.author,
    updatedAt:    link.prUpdatedAt.toISOString(),
    source:       link.source as 'auto' | 'manual',
  }
}

type TaskWithRelations = Task & {
  pullRequests?: PullRequestLink[]
  assignee?: Member | null
  sprint?: Sprint | null
}

export function toTaskDto(task: TaskWithRelations, prefix: string): TaskDto {
  return {
    id:           task.id,
    key:          formatTaskKey(prefix, task.number),
    number:       task.number,
    title:        task.title,
    description:  task.description,
    status:       task.status as TaskStatus,
    docId:        task.docId,
    branch:       branchName(prefix, task.number, task.title),
    updatedAt:    task.updatedAt.toISOString(),
    estimate:     task.estimate,
    assigneeId:   task.assigneeId,
    assigneeName: task.assignee?.name ?? null,
    sprintId:     task.sprintId,
    sprintName:   task.sprint?.name ?? null,
    pullRequests: (task.pullRequests ?? []).map(toPullRequestDto),
  }
}

/** A task counts as shipped once it's Done or one of its PRs is merged */
export function isShipped(task: TaskDto) {
  return task.status === 'done' || task.pullRequests.some((pr) => pr.state === 'merged')
}

/** Open or draft: work that's still in review */
export function hasOpenPullRequest(task: TaskDto) {
  return task.pullRequests.some((pr) => pr.state === 'open' || pr.state === 'draft')
}
