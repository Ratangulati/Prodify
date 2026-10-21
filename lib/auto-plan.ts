import type { PrismaClient } from '@prisma/client'
import { createTaskInTx, formatTaskKey } from '@/lib/tasks'

/*
 * Auto-plan: when a PRD is marked final, turn its user stories and
 * requirements into tasks, put them in the active sprint (or the backlog),
 * and give each one to the teammate with the most capacity left.
 *
 * Tasks are read straight from the PRD's lists rather than asked of the AI,
 * so the result is predictable, testable and works when the AI is down.
 */

/** Story points a generated task starts with; teammates can change it */
export const DEFAULT_ESTIMATE = 2

/** Lists under these headings become tasks... */
const TASK_HEADINGS = /requirement|user stor|deliverable|tasks?\b|implementation|work items/i
/** ...unless the heading is about something that isn't work to do */
const SKIP_HEADINGS = /out of scope|non-goal|open question|risk|metric|goal|success|assumption|dependenc/i

export interface DraftTask {
  title: string
  /** The PRD heading the item came from, shown in the review summary */
  section: string
}

const decode = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')           // drop inline tags like <strong>
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')             // last, so "&amp;lt;" stays "&lt;"
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Walks the PRD's headings and list items in order and keeps the list items
 * that sit under a task-like heading (User Stories, Requirements, …).
 */
export function extractTasksFromPrd(html: string): DraftTask[] {
  const tasks: DraftTask[] = []
  let section = ''
  let collecting = false

  for (const match of Array.from(html.matchAll(/<(h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi))) {
    const [, tag, inner] = match
    const text = decode(inner)
    if (tag.toLowerCase().startsWith('h')) {
      section = text
      collecting = TASK_HEADINGS.test(text) && !SKIP_HEADINGS.test(text)
    } else if (collecting && text) {
      tasks.push({ title: text.length > 140 ? `${text.slice(0, 137)}…` : text, section })
    }
  }
  return tasks
}

/** Lowercase, no punctuation, single spaces: "Add CSV import!" ≈ "add csv import" */
export function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface Teammate {
  id: string
  name: string
  /** Story points per sprint */
  capacity: number
}

/**
 * Gives each task to whoever has the most capacity left, as long as the
 * task fits. `load` is the points each person already has in this sprint
 * (or backlog). Tasks nobody can fit stay unassigned.
 */
export function assignOwners(tasks: DraftTask[], team: Teammate[], load: Map<string, number>, estimate = DEFAULT_ESTIMATE) {
  const used = new Map(team.map((m) => [m.id, load.get(m.id) ?? 0]))
  return tasks.map((task) => {
    const candidates = team
      .map((m) => ({ member: m, left: m.capacity - (used.get(m.id) ?? 0) }))
      .filter((c) => c.left >= estimate)
      .sort((a, b) => b.left - a.left || a.member.name.localeCompare(b.member.name))
    const owner = candidates[0]?.member ?? null
    if (owner) used.set(owner.id, (used.get(owner.id) ?? 0) + estimate)
    return { ...task, assigneeId: owner?.id ?? null, assigneeName: owner?.name ?? null }
  })
}

/** What the review dialog shows after a run */
export interface AutoPlanSummary {
  docTitle: string
  sprint: { id: string; name: string } | null
  created: { taskId: string; key: string; title: string; section: string; assignee: string | null; estimate: number }[]
  /** PRD items that already had a task, so nothing was changed for them */
  skipped: string[]
}

/**
 * Creates the tasks for a PRD in one transaction and records the run so it
 * can be reviewed and undone. Existing tasks for the PRD are never touched:
 * items whose title already has a task are skipped.
 */
export async function runAutoPlan(db: PrismaClient, input: { workspaceId: string; docId: string }) {
  return db.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: input.docId } })
    if (!doc) throw new Error('PRD not found.')

    const workspace = await tx.workspace.findUnique({ where: { id: input.workspaceId } })
    if (!workspace) throw new Error('Workspace not found.')

    // Skip anything this PRD already has a task for (and repeats within the PRD)
    const existing = await tx.task.findMany({ where: { workspaceId: input.workspaceId, docId: input.docId } })
    const seen = new Set(existing.map((t) => normalizeTitle(t.title)))
    const skipped: string[] = []
    const fresh: DraftTask[] = []
    for (const draft of extractTasksFromPrd(doc.content)) {
      const key = normalizeTitle(draft.title)
      if (seen.has(key)) skipped.push(draft.title)
      else { seen.add(key); fresh.push(draft) }
    }

    // Active sprint if there is one, otherwise the backlog
    const sprint = await tx.sprint.findFirst({ where: { workspaceId: input.workspaceId, status: 'active' } })
    const team = await tx.member.findMany({ where: { workspaceId: input.workspaceId } })

    // Points each teammate already has open in that sprint (or the backlog)
    const open = await tx.task.findMany({
      where: { workspaceId: input.workspaceId, sprintId: sprint?.id ?? null, NOT: { status: 'done' } },
    })
    const load = new Map<string, number>()
    for (const t of open) if (t.assigneeId) load.set(t.assigneeId, (load.get(t.assigneeId) ?? 0) + t.estimate)

    const planned = assignOwners(fresh, team, load)
    const run = await tx.autoPlanRun.create({ data: { workspaceId: input.workspaceId, docId: input.docId, summary: '{}' } })

    const created: AutoPlanSummary['created'] = []
    for (const item of planned) {
      const task = await createTaskInTx(tx, input.workspaceId, {
        title:         item.title,
        docId:         input.docId,
        estimate:      DEFAULT_ESTIMATE,
        assigneeId:    item.assigneeId,
        sprintId:      sprint?.id ?? null,
        autoPlanRunId: run.id,
      })
      created.push({
        taskId:   task.id,
        key:      formatTaskKey(workspace.taskKeyPrefix, task.number),
        title:    task.title,
        section:  item.section,
        assignee: item.assigneeName,
        estimate: task.estimate,
      })
    }

    const summary: AutoPlanSummary = {
      docTitle: doc.title,
      sprint: sprint ? { id: sprint.id, name: sprint.name } : null,
      created,
      skipped,
    }
    await tx.autoPlanRun.update({ where: { id: run.id }, data: { summary: JSON.stringify(summary) } })
    return { runId: run.id, summary }
  }, { maxWait: 10_000, timeout: 30_000 }) // many sequential writes; a distant database needs room
}

/**
 * Removes the tasks a run created. A task that has since gained a linked
 * pull request is kept (real work is attached to it) and reported instead.
 */
export async function undoAutoPlan(db: PrismaClient, input: { workspaceId: string; runId: string }) {
  return db.$transaction(async (tx) => {
    const run = await tx.autoPlanRun.findFirst({ where: { id: input.runId, workspaceId: input.workspaceId } })
    if (!run) throw new Error('That auto-plan run was not found.')
    if (run.undoneAt) return { removed: 0, kept: [] as string[], alreadyUndone: true }

    const tasks = await tx.task.findMany({ where: { workspaceId: input.workspaceId, autoPlanRunId: run.id } })
    const links = await tx.pullRequestLink.findMany({ where: { taskId: { in: tasks.map((t) => t.id) } } })
    const withPrs = new Set(links.map((l) => l.taskId))

    const removable = tasks.filter((t) => !withPrs.has(t.id))
    await tx.task.deleteMany({ where: { id: { in: removable.map((t) => t.id) } } })
    await tx.autoPlanRun.update({ where: { id: run.id }, data: { undoneAt: new Date() } })

    return { removed: removable.length, kept: tasks.filter((t) => withPrs.has(t.id)).map((t) => t.title), alreadyUndone: false }
  })
}
