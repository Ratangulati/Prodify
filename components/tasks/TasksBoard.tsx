'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/store'
import { createTask, updateTask, useTasks } from '@/lib/use-tasks'
import { toast } from '@/lib/toast'
import { TASK_STATUSES, type TaskStatus } from '@/lib/tasks'
import { hasOpenPullRequest, type TaskDto } from '@/lib/task-dto'
import PullRequestBadge from './PullRequestBadge'
import TaskDetail from './TaskDetail'
import { CopyBranchButton, STATUS_COLORS, STATUS_LABELS } from './shared'

/* ── Task card ────────────────────────────────────────────────────── */
function TaskCard({
  task, prdTitle, onOpen, onStatus,
}: {
  task: TaskDto
  prdTitle?: string
  onOpen: () => void
  onStatus: (status: TaskStatus) => void
}) {
  // Show up to two PRs on the card; the rest are in the task detail
  const shown = task.pullRequests.slice(0, 2)
  const more  = task.pullRequests.length - shown.length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }}
      aria-label={`Open ${task.key}: ${task.title}`}
      className="rounded-xl p-3 mb-2 border cursor-pointer transition-colors hover:border-n7"
      style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n5))' }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono font-semibold" style={{ color: 'rgb(var(--brand-fg))' }}>{task.key}</span>
        <CopyBranchButton branch={task.branch} />
      </div>

      <p className="text-xs font-medium leading-snug mb-2" style={{ color: 'rgb(var(--n12))' }}>{task.title}</p>

      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {shown.map((pr) => <PullRequestBadge key={pr.id} pr={pr} />)}
          {more > 0 && <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>+{more}</span>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {prdTitle ? (
          <span className="truncate text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--brand) / 0.12)', color: 'rgb(var(--brand-soft))' }} title={`PRD: ${prdTitle}`}>
            {prdTitle}
          </span>
        ) : <span />}
        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
          aria-label={`Status of ${task.key}`}
          className="text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer flex-shrink-0"
          style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n10))', border: '1px solid rgb(var(--n7))' }}
        >
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>
    </div>
  )
}

/* ── Board ────────────────────────────────────────────────────────── */
export default function TasksBoard() {
  const { documents, activeDocId } = useWorkspaceStore()
  const { tasks, loading, error } = useTasks()
  const [title, setTitle]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [openOnly, setOpenOnly]     = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // New tasks link to the open PRD, unless the user unlinks it
  const activeDoc = documents.find((d) => d.id === activeDocId)
  const activePrd = activeDoc?.type === 'prd' ? activeDoc : null
  const [skipPrdLink, setSkipPrdLink] = useState(false)
  const linkPrd = activePrd && !skipPrdLink ? activePrd : null

  const docTitles = new Map(documents.map((d) => [d.id, d.title]))
  const openTask  = tasks.find((t) => t.id === openTaskId)
  if (openTask) return <TaskDetail task={openTask} onBack={() => setOpenTaskId(null)} />

  const visible = openOnly ? tasks.filter(hasOpenPullRequest) : tasks

  async function handleAdd() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const task = await createTask(title.trim(), linkPrd?.id ?? null)
      setTitle('')
      toast.success(`Created ${task.key}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the task')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(task: TaskDto, status: TaskStatus) {
    try {
      await updateTask(task.id, { status })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the task')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgb(var(--n1))' }}>
      {/* Quick add + filter */}
      <div className="flex-shrink-0 p-3 border-b space-y-2" style={{ borderColor: 'rgb(var(--n4))' }}>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            ref={titleRef}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="New task…"
            aria-label="New task title"
            className="flex-1 min-w-0 text-xs rounded-lg px-2.5 py-1.5 outline-none"
            style={{ background: 'rgb(var(--n3))', border: '1px solid rgb(var(--n6))', color: 'rgb(var(--n12))' }}
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-brand bg-brand hover:bg-brand-strong disabled:opacity-40 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {linkPrd && (
          <p className="flex items-center gap-1 text-[10px]" style={{ color: 'rgb(var(--n8))' }}>
            Links to PRD <span className="truncate max-w-[160px]" style={{ color: 'rgb(var(--brand-soft))' }}>{linkPrd.title}</span>
            <button onClick={() => setSkipPrdLink(true)} title="Don't link to this PRD" aria-label="Don't link to this PRD" className="p-0.5 rounded hover:bg-overlay/5">
              <X size={10} />
            </button>
          </p>
        )}
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer w-fit" style={{ color: 'rgb(var(--n10))' }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Has open PR
        </label>
      </div>

      {/* Columns, stacked: the panel is too narrow for side-by-side */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="text-xs text-center py-8" style={{ color: 'rgb(var(--n8))' }}>Loading tasks…</p>
        ) : error ? (
          <p className="text-xs text-center py-8" style={{ color: 'rgb(var(--red-fg))' }}>{error}</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <h3 className="font-serif text-xl font-semibold" style={{ color: 'rgb(var(--n12))' }}>No tasks yet</h3>
            <p className="text-xs" style={{ color: 'rgb(var(--n9))' }}>Each task gets a key like PROD-1 that links its pull requests.</p>
            <button
              onClick={() => titleRef.current?.focus()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-on-brand hover:bg-brand-strong transition-colors"
            >
              <Plus size={12} aria-hidden /> Add a task
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'rgb(var(--n8))' }}>No tasks have an open pull request.</p>
        ) : (
          TASK_STATUSES.map((status) => {
            const column = visible.filter((t) => t.status === status)
            if (openOnly && column.length === 0) return null
            return (
              <section key={status} className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--n10))' }}>{STATUS_LABELS[status]}</h3>
                  <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>{column.length}</span>
                </div>
                {column.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    prdTitle={task.docId ? docTitles.get(task.docId) : undefined}
                    onOpen={() => setOpenTaskId(task.id)}
                    onStatus={(s) => handleStatus(task, s)}
                  />
                ))}
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
