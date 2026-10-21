'use client'

import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import Overlay from '@/components/ui/Overlay'
import { toast } from '@/lib/toast'
import { apiError, refreshTasks } from '@/lib/use-tasks'
import type { AutoPlanSummary as Summary } from '@/lib/auto-plan'

export interface AutoPlanResult {
  runId: string
  summary: Summary
}

/**
 * Shown after auto-plan runs: what was created, where it went, who got it,
 * and what was skipped because the PRD already had a task for it. Undo
 * removes the created tasks.
 */
export default function AutoPlanSummary({ result, onClose }: { result: AutoPlanResult | null; onClose: () => void }) {
  const [undoing, setUndoing] = useState(false)
  const summary = result?.summary
  const destination = summary?.sprint ? summary.sprint.name : 'the backlog'

  async function undo() {
    if (!result) return
    setUndoing(true)
    try {
      const res = await fetch(`/api/auto-plan/${result.runId}/undo`, { method: 'POST' })
      if (!res.ok) throw new Error(await apiError(res))
      const { removed, kept } = await res.json() as { removed: number; kept: string[] }
      toast.info(kept.length
        ? `Removed ${removed} tasks. Kept ${kept.length} that already have a pull request.`
        : `Removed ${removed} task${removed === 1 ? '' : 's'}.`)
      await refreshTasks()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Undo failed')
    } finally {
      setUndoing(false)
    }
  }

  return (
    <Overlay
      open={!!result}
      onClose={onClose}
      className="items-center"
      panelClassName="material-panel w-full rounded-xl overflow-hidden"
      panelStyle={{ maxWidth: 520 }}
    >
      {summary && (
        <>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks size={16} className="text-brand-fg" aria-hidden />
              <h2 className="font-serif text-xl font-semibold text-n12">
                {summary.created.length
                  ? `Planned ${summary.created.length} task${summary.created.length === 1 ? '' : 's'}`
                  : 'Nothing new to plan'}
              </h2>
            </div>
            <p className="text-xs text-n9">
              From <span className="text-n12">{summary.docTitle}</span>
              {summary.created.length > 0 && <> into <span className="text-n12">{destination}</span></>}
            </p>
          </div>

          <div className="px-5 pb-4 max-h-[50vh] overflow-y-auto space-y-4 text-xs">
            {summary.created.length === 0 && summary.skipped.length === 0 && (
              <p className="text-n9">
                No user stories or requirements were found. Put them in bullet lists under a heading like
                &ldquo;User Stories&rdquo; or &ldquo;Functional Requirements&rdquo;, then mark the PRD final again.
              </p>
            )}

            {summary.created.length > 0 && (
              <ul className="divide-y divide-n6 rounded-lg border border-n6">
                {summary.created.map((t) => (
                  <li key={t.taskId} className="flex items-start gap-2.5 px-3 py-2">
                    <span className="font-mono font-semibold text-brand-fg flex-shrink-0">{t.key}</span>
                    <span className="flex-1 text-n11">{t.title}</span>
                    <span className="flex-shrink-0 text-right text-n9">
                      {t.assignee ?? <span className="text-n8">Unassigned</span>}
                      <span className="block tabular-nums text-n8">{t.estimate} pts</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {summary.created.some((t) => !t.assignee) && (
              <p className="text-n9">
                Unassigned tasks didn&apos;t fit anyone&apos;s remaining capacity. Add teammates or raise capacity in
                Tasks › Team &amp; sprints.
              </p>
            )}

            {summary.skipped.length > 0 && (
              <section>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-n8">
                  Already had a task · left unchanged
                </h3>
                <ul className="space-y-0.5 text-n9">
                  {summary.skipped.map((title) => <li key={title}>{title}</li>)}
                </ul>
              </section>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-n6 bg-n1/60">
            {summary.created.length > 0 && (
              <button
                onClick={undo}
                disabled={undoing}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-n7 text-n10 hover:text-danger-fg hover:border-danger/40 disabled:opacity-40 transition-colors"
              >
                {undoing ? 'Undoing…' : 'Undo'}
              </button>
            )}
            <button
              onClick={onClose}
              autoFocus
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-on-brand hover:bg-brand-strong transition-colors"
            >
              {summary.created.length ? 'Looks good' : 'Close'}
            </button>
          </div>
        </>
      )}
    </Overlay>
  )
}
