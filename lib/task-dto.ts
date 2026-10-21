import type { Task } from '@prisma/client'
import { branchName, formatTaskKey, type TaskStatus } from '@/lib/tasks'

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
}

export function toTaskDto(task: Task, prefix: string): TaskDto {
  return {
    id:          task.id,
    key:         formatTaskKey(prefix, task.number),
    number:      task.number,
    title:       task.title,
    description: task.description,
    status:      task.status as TaskStatus,
    docId:       task.docId,
    branch:      branchName(prefix, task.number, task.title),
    updatedAt:   task.updatedAt.toISOString(),
  }
}
