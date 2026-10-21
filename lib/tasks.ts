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

/**
 * Creates a task with the workspace's next number. Bumping the counter and
 * creating the task happen in one transaction, so two tasks created at the
 * same moment can never get the same key.
 */
export function createTask(
  db: PrismaClient,
  workspaceId: string,
  input: { title: string; docId?: string | null },
) {
  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.update({
      where: { id: workspaceId },
      data:  { nextTaskNumber: { increment: 1 } },
    })
    return tx.task.create({
      data: {
        workspaceId,
        number: workspace.nextTaskNumber - 1, // the number before we bumped it
        title:  input.title,
        docId:  input.docId ?? null,
      },
    })
  })
}
