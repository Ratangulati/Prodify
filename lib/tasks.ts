import type { Prisma, PrismaClient } from '@prisma/client'

export const DEFAULT_WORKSPACE_ID = 'default'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export type TaskStatus = typeof TASK_STATUSES[number]

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

/** PROD + 42 → "PROD-42" */
export function formatTaskKey(prefix: string, number: number) {
  return `${prefix}-${number}`
}

/** PROD-42 "Add CSV import!" → "prod-42-add-csv-import" (key first, so GitHub can match it) */
export function branchName(prefix: string, number: number, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // anything that isn't a letter or digit becomes a dash
    .replace(/^-+|-+$/g, '')     // no dashes at either end
    .slice(0, 40)
    .replace(/-+$/, '')          // slicing can leave a trailing dash
  const key = formatTaskKey(prefix, number).toLowerCase()
  return slug ? `${key}-${slug}` : key
}

type Db = PrismaClient | Prisma.TransactionClient

/** The single workspace Prodify uses today; created on first use. */
export function getDefaultWorkspace(db: Db) {
  return db.workspace.upsert({
    where:  { id: DEFAULT_WORKSPACE_ID },
    create: { id: DEFAULT_WORKSPACE_ID, name: 'My workspace' },
    update: {},
  })
}

/** Fields a new task can start with besides its title */
export type NewTask = {
  title: string
  docId?: string | null
  estimate?: number
  assigneeId?: string | null
  sprintId?: string | null
  autoPlanRunId?: string | null
}

/**
 * Takes the workspace's next number and creates the task with it. Call
 * inside a transaction: bumping the counter and creating the task then
 * commit together, so two tasks can never get the same key.
 */
export async function createTaskInTx(tx: Prisma.TransactionClient, workspaceId: string, input: NewTask) {
  const workspace = await tx.workspace.update({
    where: { id: workspaceId },
    data:  { nextTaskNumber: { increment: 1 } },
  })
  return tx.task.create({
    data: {
      workspaceId,
      number:        workspace.nextTaskNumber - 1, // the number before we bumped it
      title:         input.title,
      docId:         input.docId ?? null,
      estimate:      input.estimate ?? 2,
      assigneeId:    input.assigneeId ?? null,
      sprintId:      input.sprintId ?? null,
      autoPlanRunId: input.autoPlanRunId ?? null,
    },
  })
}

/** Creates one task with the workspace's next number */
export function createTask(db: PrismaClient, workspaceId: string, input: NewTask) {
  return db.$transaction((tx) => createTaskInTx(tx, workspaceId, input))
}
