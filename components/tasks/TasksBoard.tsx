'use client'

import { useState } from 'react'
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
      className="rounded-xl p-3 mb-2 border cursor-pointer transition-colors hover:border-zinc-600"
      style={{ background: '#18181b', borderColor: '#27272a' }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-mono font-semibold" style={{ color: '#818cf8' }}>{task.key}</span>
        <CopyBranchButton branch={task.branch} />
      </div>

      <p className="text-xs font-medium leading-snug mb-2" style={{ color: '#e4e4e7' }}>{task.title}</p>

      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {shown.map((pr) => <PullRequestBadge key={pr.id} pr={pr} />)}
          {more > 0 && <span className="text-[10px]" style={{ color: '#71717a' }}>+{more}</span>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {prdTitle ? (
          <span className="truncate text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }} title={`PRD: ${prdTitle}`}>
            {prdTitle}
          </span>
        ) : <span />}
        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
          aria-label={`Status of ${task.key}`}
          className="text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer flex-shrink-0"
          style={{ background: '#27272a', color: '#a1a1aa', border: '1px solid #3f3f46' }}
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
    <div className="flex flex-col h-full" style={{ background: '#111113' }}>
      {/* Quick add + filter */}
      <div className="flex-shrink-0 p-3 border-b space-y-2" style={{ borderColor: '#1e1e22' }}>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="New task…"
            aria-label="New task title"
            className="flex-1 min-w-0 text-xs rounded-lg px-2.5 py-1.5 outline-none"
            style={{ background: '#18181b', border: '1px solid #2e2e32', color: '#e4e4e7' }}
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {linkPrd && (
          <p className="flex items-center gap-1 text-[10px]" style={{ color: '#71717a' }}>
            Links to PRD <span className="truncate max-w-[160px]" style={{ color: '#a5b4fc' }}>{linkPrd.title}</span>
            <button onClick={() => setSkipPrdLink(true)} title="Don't link to this PRD" aria-label="Don't link to this PRD" className="p-0.5 rounded hover:bg-white/5">
              <X size={10} />
            </button>
          </p>
        )}
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer w-fit" style={{ color: '#a1a1aa' }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Has open PR
        </label>
      </div>

      {/* Columns, stacked: the panel is too narrow for side-by-side */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="text-xs text-center py-8" style={{ color: '#52525b' }}>Loading tasks…</p>
        ) : error ? (
          <p className="text-xs text-center py-8" style={{ color: '#f87171' }}>{error}</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <p className="text-sm font-medium" style={{ color: '#a1a1aa' }}>No tasks yet</p>
            <p className="text-xs" style={{ color: '#52525b' }}>Add one above. Each task gets a key like PROD-1 for branch names.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: '#52525b' }}>No tasks have an open pull request.</p>
        ) : (
          TASK_STATUSES.map((status) => {
            const column = visible.filter((t) => t.status === status)
            if (openOnly && column.length === 0) return null
            return (
              <section key={status} className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a1a1aa' }}>{STATUS_LABELS[status]}</h3>
                  <span className="text-[10px]" style={{ color: '#52525b' }}>{column.length}</span>
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
