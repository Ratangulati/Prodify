'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, ExternalLink, Unlink } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { linkPullRequest, loadTaskDetail, unlinkPullRequest, updateTask } from '@/lib/use-tasks'
import { TASK_STATUSES, type TaskStatus } from '@/lib/tasks'
import type { TaskDto } from '@/lib/task-dto'
import { PR_STATE_STYLE } from './PullRequestBadge'
import { CopyBranchButton, STATUS_LABELS } from './shared'
import Tip from '@/components/ui/Tip'

type Activity = { id: string; message: string; createdAt: string }

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true })

export default function TaskDetail({ task, onBack }: { task: TaskDto; onBack: () => void }) {
  const { documents } = useWorkspaceStore()
  const prds = documents.filter((d) => d.type === 'prd')

  const [activity, setActivity] = useState<Activity[] | null>(null) // null while loading
  const [url, setUrl]           = useState('')
  const [linking, setLinking]   = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setActivity(await loadTaskDetail(task.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load the task')
    }
  }, [task.id])

  useEffect(() => { reload() }, [reload])

  async function change(changes: { status?: TaskStatus; docId?: string | null }) {
    try {
      await updateTask(task.id, changes)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the task')
    }
  }

  async function handleLink() {
    if (!url.trim()) return
    setLinking(true)
    setLinkError(null)
    try {
      await linkPullRequest(task.id, url.trim())
      setUrl('')
      toast.success('Pull request linked')
      await reload()
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Could not link the pull request.')
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink(linkId: string) {
    try {
      await unlinkPullRequest(task.id, linkId)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unlink the pull request')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgb(var(--n1))' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--n4))' }}>
        <Tip label="Back to tasks">
          <button onClick={onBack} aria-label="Back to tasks" className="p-1 rounded text-n8 hover:text-n11 hover:bg-overlay/5 transition-colors">
            <ArrowLeft size={14} />
          </button>
        </Tip>
        <span className="text-[11px] font-mono font-semibold" style={{ color: 'rgb(var(--brand-fg))' }}>{task.key}</span>
        <div className="ml-auto"><CopyBranchButton branch={task.branch} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        <h2 className="text-sm font-semibold leading-snug" style={{ color: 'rgb(var(--n12))' }}>{task.title}</h2>

        {/* Status + PRD */}
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Status</span>
            <select
              value={task.status}
              onChange={(e) => change({ status: e.target.value as TaskStatus })}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
              style={{ background: 'rgb(var(--n3))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n6))' }}
            >
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>PRD</span>
            <select
              value={task.docId ?? ''}
              onChange={(e) => change({ docId: e.target.value || null })}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
              style={{ background: 'rgb(var(--n3))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n6))' }}
            >
              <option value="">None</option>
              {prds.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </label>
        </div>

        {/* Pull requests */}
        <section>
          <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'rgb(var(--n8))' }}>
            Pull requests
          </h3>
          {task.pullRequests.length === 0 && (
            <p className="text-xs mb-2" style={{ color: 'rgb(var(--n8))' }}>
              None yet. Use the branch name above, put <span className="font-mono">{task.key}</span> in a PR title,
              or paste a PR link.
            </p>
          )}
          <ul className="space-y-1.5 mb-3">
            {task.pullRequests.map((pr) => {
              const style = PR_STATE_STYLE[pr.state]
              return (
                <li key={pr.id} className="group rounded-lg p-2.5 border" style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n5))' }}>
                  <div className="flex items-start gap-2">
                    <style.Icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} aria-label={style.label} />
                    <div className="min-w-0 flex-1">
                      <a href={pr.url} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: 'rgb(var(--n12))' }}>
                        {pr.title} <ExternalLink size={10} className="inline" aria-hidden />
                      </a>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--n8))' }}>
                        {pr.repoFullName}#{pr.number} · {pr.author} ·{' '}
                        <span style={{ color: style.color }}>{style.label}</span> · updated {ago(pr.updatedAt)}
                      </p>
                    </div>
                    <Tip label="Unlink this pull request">
                      <button
                        onClick={() => handleUnlink(pr.id)}
                        aria-label={`Unlink pull request #${pr.number}`}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-n8 hover:text-danger-fg transition"
                      >
                        <Unlink size={11} />
                      </button>
                    </Tip>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLink() }}
              placeholder="https://github.com/owner/repo/pull/12"
              aria-label="Pull request URL"
              className="flex-1 min-w-0 text-xs rounded-lg px-2.5 py-1.5 outline-none"
              style={{ background: 'rgb(var(--n3))', border: '1px solid rgb(var(--n6))', color: 'rgb(var(--n12))' }}
            />
            <button
              onClick={handleLink}
              disabled={!url.trim() || linking}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-brand bg-brand hover:bg-brand-strong disabled:opacity-40 transition-colors"
            >
              {linking ? 'Checking…' : 'Link'}
            </button>
          </div>
          {linkError && <p role="alert" className="text-[11px] mt-1.5" style={{ color: 'rgb(var(--red-fg))' }}>{linkError}</p>}
        </section>

        {/* Activity */}
        <section>
          <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'rgb(var(--n8))' }}>Activity</h3>
          {activity === null ? (
            <p className="text-xs" style={{ color: 'rgb(var(--n8))' }}>Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-xs" style={{ color: 'rgb(var(--n8))' }}>Nothing yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {activity.map((a) => (
                <li key={a.id} className="text-[11px] leading-relaxed" style={{ color: 'rgb(var(--n10))' }}>
                  {a.message} <span style={{ color: 'rgb(var(--n8))' }}>{ago(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
