'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Rocket } from 'lucide-react'
import { useTasks } from '@/lib/use-tasks'
import { isShipped, type PullRequestDto } from '@/lib/task-dto'
import PullRequestBadge from '@/components/tasks/PullRequestBadge'

/**
 * How much of a PRD has actually shipped: its tasks, how many are done or
 * merged, and every pull request linked to them.
 */
export default function DeliverySection({ docId }: { docId: string }) {
  const { tasks, loading } = useTasks()
  const [open, setOpen] = useState(false)

  const prdTasks = tasks.filter((t) => t.docId === docId)
  const shipped  = prdTasks.filter(isShipped).length

  // The same PR can be linked to several tasks; list it once
  const prs = new Map<string, PullRequestDto & { taskKeys: string[] }>()
  for (const task of prdTasks) {
    for (const pr of task.pullRequests) {
      const id = `${pr.repoFullName}#${pr.number}`
      const entry = prs.get(id) ?? { ...pr, taskKeys: [] }
      entry.taskKeys.push(task.key)
      prs.set(id, entry)
    }
  }

  if (loading) return null

  const pct = prdTasks.length ? Math.round((shipped / prdTasks.length) * 100) : 0

  return (
    <div className="flex-shrink-0 border-b px-6 py-2" style={{ borderColor: '#1e1e1e', background: '#0f0f0f' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full text-left"
      >
        {open ? <ChevronDown size={12} style={{ color: '#71717a' }} /> : <ChevronRight size={12} style={{ color: '#71717a' }} />}
        <Rocket size={12} style={{ color: '#818cf8' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a1a1aa' }}>Delivery</span>
        {prdTasks.length === 0 ? (
          <span className="text-[11px]" style={{ color: '#71717a' }}>No tasks linked yet</span>
        ) : (
          <>
            <span className="text-[11px]" style={{ color: '#e4e4e7' }}>
              {shipped} of {prdTasks.length} tasks shipped
            </span>
            <span className="flex-1 max-w-[160px] h-1 rounded-full overflow-hidden" style={{ background: '#27272a' }} aria-hidden>
              <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#22c55e' }} />
            </span>
            <span className="text-[10px]" style={{ color: '#71717a' }}>{prs.size} PR{prs.size === 1 ? '' : 's'}</span>
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 mb-1 pl-5 space-y-1.5">
          {prdTasks.length === 0 && (
            <p className="text-xs" style={{ color: '#71717a' }}>
              Add tasks from the Tasks tab while this PRD is open and they&apos;ll be linked here. A task counts as
              shipped when it&apos;s Done or one of its pull requests is merged.
            </p>
          )}
          {prdTasks.length > 0 && prs.size === 0 && (
            <p className="text-xs" style={{ color: '#71717a' }}>No pull requests linked to these tasks yet.</p>
          )}
          {Array.from(prs.values()).map((pr) => (
            <div key={`${pr.repoFullName}#${pr.number}`} className="flex items-center gap-2 text-xs">
              <PullRequestBadge pr={pr} />
              <a href={pr.url} target="_blank" rel="noreferrer" className="truncate hover:underline" style={{ color: '#d4d4d8' }}>
                {pr.title}
              </a>
              <span className="text-[10px] flex-shrink-0 font-mono" style={{ color: '#71717a' }}>{pr.taskKeys.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
