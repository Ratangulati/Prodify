'use client'

import { useEffect, useState } from 'react'
import { Trash2, Users, X } from 'lucide-react'
import Overlay from '@/components/ui/Overlay'
import Tip from '@/components/ui/Tip'
import { toast } from '@/lib/toast'
import { usePlanning } from '@/lib/use-planning'

const inputClass = 'text-xs rounded-lg px-2.5 py-1.5 outline-none border bg-n3 border-n7 text-n12 focus:border-brand'
const labelClass = 'block text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-n8'

/** Today and two weeks from today, as YYYY-MM-DD */
function defaultSprintDates() {
  const start = new Date()
  const end = new Date(start.getTime() + 13 * 86_400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export default function PlanningSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const planning = usePlanning()
  const { state, error } = planning
  const [name, setName]         = useState('')
  const [capacity, setCapacity] = useState('10')
  const [sprintName, setSprintName] = useState('')
  const [dates, setDates]       = useState(defaultSprintDates)

  // Fresh numbers every time it opens (loads change as tasks move)
  const { reload } = planning
  useEffect(() => { if (open) reload() }, [open, reload])

  // Runs an action and turns failures into a toast instead of a silent no-op
  async function attempt(action: () => Promise<unknown>, done?: string) {
    try {
      await action()
      if (done) toast.success(done)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      className="items-center"
      panelClassName="material-panel w-full rounded-xl overflow-hidden"
      panelStyle={{ maxWidth: 520 }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-n6">
        <Users size={15} className="text-brand-fg" aria-hidden />
        <h2 className="text-sm font-semibold text-n12">Team &amp; sprints</h2>
        <Tip label="Close">
          <button onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded text-n8 hover:bg-overlay/10 transition-colors">
            <X size={14} />
          </button>
        </Tip>
      </div>

      <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto text-xs text-n10">
        {error && <p role="alert" className="rounded-lg px-3 py-2 bg-danger/10 text-danger-fg">{error}</p>}
        {!state && !error && <p>Loading…</p>}

        {state && (
          <>
            {/* Auto-plan */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={state.autoPlan}
                onChange={(e) => attempt(() => planning.setAutoPlan(e.target.checked))}
              />
              <span>
                <span className="block text-[13px] font-medium text-n12">Auto-plan when a PRD is marked final</span>
                Turns the PRD&apos;s user stories and requirements into tasks in the active sprint (or the backlog),
                assigned to whoever has capacity. You always get a summary with Undo, and tasks the PRD already has
                are never changed.
              </span>
            </label>

            {/* Team */}
            <section>
              <h3 className={labelClass}>Team · points per sprint</h3>
              {state.members.length === 0 && <p className="mb-2">No teammates yet. Auto-plan leaves tasks unassigned until you add some.</p>}
              <ul className="space-y-1.5 mb-2">
                {state.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-n5/60">
                    <span className="flex-1 text-[13px] text-n12">{m.name}</span>
                    <span className="tabular-nums text-n8" title="Open points where new work goes">{m.load} used of</span>
                    <input
                      type="number" min={0} max={100}
                      defaultValue={m.capacity}
                      aria-label={`${m.name}'s capacity`}
                      onBlur={(e) => {
                        const n = Number(e.target.value)
                        if (n !== m.capacity) attempt(() => planning.updateMember(m.id, n))
                      }}
                      className={`${inputClass} w-16 tabular-nums`}
                    />
                    <Tip label={`Remove ${m.name}`}>
                      <button
                        onClick={() => attempt(() => planning.removeMember(m.id), `Removed ${m.name}; their tasks are unassigned`)}
                        aria-label={`Remove ${m.name}`}
                        className="p-1 rounded text-n8 hover:text-danger-fg hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Tip>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!name.trim()) return
                  attempt(async () => { await planning.addMember(name.trim(), Number(capacity)); setName('') }, `Added ${name.trim()}`)
                }}
              >
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Teammate name" className={`${inputClass} flex-1 min-w-0`} />
                <input type="number" min={0} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-label="Capacity in points" className={`${inputClass} w-16`} />
                <button type="submit" disabled={!name.trim()} className="px-3 py-1.5 rounded-lg font-medium bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-40 transition-colors">
                  Add
                </button>
              </form>
            </section>

            {/* Sprint */}
            <section>
              <h3 className={labelClass}>Sprint</h3>
              {state.activeSprint ? (
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2 bg-n5/60">
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium text-n12">{state.activeSprint.name}</span>
                    {state.activeSprint.startDate} → {state.activeSprint.endDate}
                  </span>
                  <button
                    onClick={() => attempt(() => planning.completeSprint(state.activeSprint!.id), 'Sprint completed; unfinished tasks are back in the backlog')}
                    className="px-2.5 py-1 rounded-lg border border-n7 text-n10 hover:bg-overlay/5 transition-colors"
                  >
                    Complete
                  </button>
                </div>
              ) : (
                <p className="mb-2">No active sprint. New tasks go to the backlog.</p>
              )}
              <form
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!sprintName.trim()) return
                  attempt(async () => { await planning.startSprint(sprintName.trim(), dates.start, dates.end); setSprintName('') },
                    state.activeSprint ? 'New sprint started; unfinished tasks carried over' : 'Sprint started')
                }}
              >
                <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="New sprint name" aria-label="Sprint name" className={`${inputClass} min-w-0`} />
                <input type="date" value={dates.start} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} aria-label="Start date" className={inputClass} />
                <input type="date" value={dates.end} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} aria-label="End date" className={inputClass} />
                <button type="submit" disabled={!sprintName.trim()} className="px-3 py-1.5 rounded-lg font-medium bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-40 transition-colors">
                  Start
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </Overlay>
  )
}
