import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignOwners, extractTasksFromPrd, normalizeTitle, runAutoPlan, undoAutoPlan, type DraftTask,
} from '@/lib/auto-plan'
import { FakeDb } from '@/lib/github/__tests__/fake-db'

const PRD = `
<h1>Saved Filters</h1>
<h2>Goals &amp; Success Metrics</h2><ul><li><p>50% of users save a filter</p></li></ul>
<h2>User Stories</h2>
<ol><li><p>As an engineer, I want to <strong>save</strong> my filters</p></li>
    <li><p>As a PM, I want to share a filter with my team</p></li></ol>
<h2>Functional Requirements</h2>
<ul><li><p>Filters persist across devices &amp; sessions</p></li></ul>
<h2>Out of Scope</h2><ul><li><p>Filter folders</p></li></ul>
<h2>Open Questions</h2><ul><li><p>Who can edit shared filters?</p></li></ul>`

describe('extractTasksFromPrd', () => {
  it('turns user stories and requirements into tasks and ignores the rest', () => {
    expect(extractTasksFromPrd(PRD)).toEqual([
      { title: 'As an engineer, I want to save my filters', section: 'User Stories' },
      { title: 'As a PM, I want to share a filter with my team', section: 'User Stories' },
      { title: 'Filters persist across devices & sessions', section: 'Functional Requirements' },
    ])
  })

  it('returns nothing for a PRD without task-like sections', () => {
    expect(extractTasksFromPrd('<h1>Idea</h1><p>Just prose.</p><ul><li>a loose bullet</li></ul>')).toEqual([])
  })

  it('treats titles that differ only in case or punctuation as the same', () => {
    expect(normalizeTitle('Add CSV import!')).toBe(normalizeTitle('  add csv   IMPORT'))
  })
})

describe('assignOwners', () => {
  const task = (title: string): DraftTask => ({ title, section: 'User Stories' })
  const team = [
    { id: 'a', name: 'Ana', capacity: 6 },
    { id: 'b', name: 'Ben', capacity: 4 },
  ]

  it('gives each task to whoever has the most capacity left', () => {
    const planned = assignOwners([task('1'), task('2'), task('3')], team, new Map(), 2)
    expect(planned.map((p) => p.assigneeName)).toEqual(['Ana', 'Ana', 'Ben']) // 6→4 ties with Ben (4), Ana wins by name
  })

  it('counts work people already have and leaves tasks unassigned when nobody fits', () => {
    const planned = assignOwners([task('1'), task('2')], team, new Map([['a', 6], ['b', 2]]), 2)
    expect(planned.map((p) => p.assigneeId)).toEqual(['b', null])
  })
})

describe('runAutoPlan / undoAutoPlan', () => {
  let db: FakeDb
  beforeEach(async () => {
    db = new FakeDb()
    await db.workspace.create({ data: { id: 'ws', name: 'W', nextTaskNumber: 5 } })
    await db.document.create({ data: { id: 'prd', title: 'Saved Filters', content: PRD } })
    await db.member.create({ data: { id: 'ana', workspaceId: 'ws', name: 'Ana', capacity: 4 } })
    await db.member.create({ data: { id: 'ben', workspaceId: 'ws', name: 'Ben', capacity: 10 } })
    await db.sprint.create({ data: { id: 's1', workspaceId: 'ws', name: 'Sprint 12', startDate: '2026-10-20', endDate: '2026-11-02' } })
    // Ben already has 8 points open in this sprint
    await db.task.create({ data: { workspaceId: 'ws', number: 1, title: 'Old work', estimate: 8, assigneeId: 'ben', sprintId: 's1' } })
  })

  it('creates tasks in the active sprint, numbered and assigned by capacity', async () => {
    const { summary } = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })

    expect(summary.sprint).toEqual({ id: 's1', name: 'Sprint 12' })
    expect(summary.created.map((c) => [c.key, c.assignee])).toEqual([
      ['PROD-5', 'Ana'], ['PROD-6', 'Ana'], ['PROD-7', 'Ben'],
    ])
    const tasks = await db.task.findMany({ where: { docId: 'prd' } })
    expect(tasks.every((t) => t.sprintId === 's1' && t.autoPlanRunId)).toBe(true)
  })

  it('puts tasks in the backlog when no sprint is active', async () => {
    await db.sprint.update({ where: { id: 's1' }, data: { status: 'completed' } })
    const { summary } = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })
    expect(summary.sprint).toBeNull()
    expect((await db.task.findMany({ where: { docId: 'prd' } })).every((t) => t.sprintId === null)).toBe(true)
  })

  it('never overwrites or duplicates tasks the PRD already has', async () => {
    const mine = await db.task.create({ data: {
      workspaceId: 'ws', number: 2, docId: 'prd', title: 'As a PM, I want to share a filter with my team!',
      status: 'in_progress', estimate: 5, assigneeId: 'ana',
    } })

    const first = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })
    expect(first.summary.skipped).toEqual(['As a PM, I want to share a filter with my team'])
    expect(first.summary.created).toHaveLength(2)
    expect(await db.task.findUnique({ where: { id: mine.id } })).toMatchObject({ status: 'in_progress', estimate: 5, assigneeId: 'ana' })

    // Running again finds everything already planned
    const second = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })
    expect(second.summary.created).toHaveLength(0)
    expect(second.summary.skipped).toHaveLength(3)
  })

  it('undo removes the tasks it created but keeps ones that gained a pull request', async () => {
    const { runId, summary } = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })
    await db.pullRequestLink.create({ data: {
      workspaceId: 'ws', taskId: summary.created[0].taskId, repoFullName: 'a/b', number: 1, title: 't',
      url: 'u', state: 'open', author: 'x', prUpdatedAt: new Date(), source: 'auto',
    } })

    const result = await undoAutoPlan(db.asPrisma(), { workspaceId: 'ws', runId })
    expect(result).toEqual({ removed: 2, kept: [summary.created[0].title], alreadyUndone: false })
    expect(await db.task.count({ where: { docId: 'prd' } })).toBe(1)

    expect((await undoAutoPlan(db.asPrisma(), { workspaceId: 'ws', runId })).alreadyUndone).toBe(true)
  })

  it('cannot undo another workspace\'s run', async () => {
    const { runId } = await runAutoPlan(db.asPrisma(), { workspaceId: 'ws', docId: 'prd' })
    await expect(undoAutoPlan(db.asPrisma(), { workspaceId: 'other', runId })).rejects.toThrow(/not found/)
  })
})
