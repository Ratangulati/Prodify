'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, rectIntersection,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Calendar, TrendingUp, GripVertical,
  LayoutGrid, AlignLeft, ChevronDown, Filter,
  Trash2, User,
} from 'lucide-react'
import { format, parseISO, isValid, getQuarter, getYear } from 'date-fns'
import { useWorkspaceStore } from '@/lib/store'
import { SPRING_EASING } from '@/lib/motion'
import { toast } from '@/lib/toast'
import type { Feature, FeatureStatus, FeaturePriority } from '@/lib/types'

/* ── Constants ───────────────────────────────────────────────────── */
const COLUMNS: {
  id: FeatureStatus; label: string
  accent: string; accentBg: string
}[] = [
  { id: 'Now',   label: 'Now',   accent: 'rgb(var(--green))', accentBg: 'rgb(var(--green) / 0.08)'   },
  { id: 'Next',  label: 'Next',  accent: 'rgb(var(--brand))', accentBg: 'rgb(var(--brand) / 0.08)'  },
  { id: 'Later', label: 'Later', accent: 'rgb(var(--amber))', accentBg: 'rgb(var(--amber) / 0.08)'  },
  { id: 'Done',  label: 'Done',  accent: 'rgb(var(--n8))', accentBg: 'rgb(var(--n8) / 0.08)' },
]

const PRIORITY: Record<FeaturePriority, { bg: string; text: string; ring: string; label: string }> = {
  P0: { bg: 'rgb(var(--red) / 0.18)',  text: 'rgb(var(--red-fg))', ring: 'rgb(var(--red) / 0.35)',  label: 'Critical' },
  P1: { bg: 'rgb(var(--orange) / 0.18)', text: 'rgb(var(--orange-fg))', ring: 'rgb(var(--orange) / 0.35)', label: 'High'     },
  P2: { bg: 'rgb(var(--yellow) / 0.18)',  text: 'rgb(var(--amber-fg))', ring: 'rgb(var(--yellow) / 0.35)',  label: 'Medium'   },
  P3: { bg: 'rgb(var(--green) / 0.18)',  text: 'rgb(var(--green-fg))', ring: 'rgb(var(--green) / 0.35)',  label: 'Low'      },
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const AVATAR_COLORS = [
  'rgb(var(--brand))','rgb(var(--violet))','rgb(var(--pink))','rgb(var(--orange))','rgb(var(--green))','rgb(var(--cyan))','rgb(var(--blue))',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function fmtDate(dateStr: string) {
  if (!dateStr) return null
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'MMM d') : null
  } catch { return null }
}

function quarterLabel(dateStr: string) {
  if (!dateStr) return 'Unscheduled'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? `Q${getQuarter(d)} ${getYear(d)}` : 'Unscheduled'
  } catch { return 'Unscheduled' }
}

/* ── Assignee Avatar ─────────────────────────────────────────────── */
function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  if (!name) {
    return (
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: 'rgb(var(--n5))', border: '1px solid rgb(var(--n7))' }}
      >
        <User size={size * 0.5} style={{ color: 'rgb(var(--n8))' }} />
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: avatarColor(name), flexShrink: 0,
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}

/* ── Priority Badge ──────────────────────────────────────────────── */
function PriorityBadge({ p }: { p: FeaturePriority }) {
  const cfg = PRIORITY[p]
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.ring}` }}
    >
      {p}
    </span>
  )
}

/* ── Feature Card ────────────────────────────────────────────────── */
interface CardProps {
  feature: Feature
  isDragOverlay?: boolean
  onDelete?: (id: string) => void
}

function FeatureCard({ feature, isDragOverlay, onDelete }: CardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, isDragging,
  } = useDraggable({ id: feature.id, disabled: isDragOverlay })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const dateStr = fmtDate(feature.dueDate)

  return (
    <div
      ref={setNodeRef}
      className="group rounded-xl p-3 mb-2 border select-none"
      style={{
        ...style,
        opacity: isDragging ? 0.35 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        background: 'rgb(var(--n3))',
        borderColor: 'rgb(var(--n5))',
        boxShadow: isDragOverlay
          ? '0 16px 48px rgb(var(--shadow) / 0.7), 0 0 0 1px rgb(var(--brand) / 0.4)'
          : 'none',
        // The overlay is positioned by DragOverlay itself, so it only needs the "lifted" tilt
        transform: isDragOverlay ? 'rotate(1.5deg) scale(1.02)' : style?.transform,
      }}
      {...attributes}
      {...listeners}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <GripVertical size={13} className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--n8))' }} />
          <p className="text-xs font-medium leading-snug" style={{ color: 'rgb(var(--n12))' }}>{feature.title}</p>
        </div>
        <PriorityBadge p={feature.priority} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* RICE score */}
          <div className="flex items-center gap-1" title="RICE score">
            <TrendingUp size={10} style={{ color: 'rgb(var(--n8))' }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: 'rgb(var(--n8))' }}>
              {feature.riceScore.toLocaleString()}
            </span>
          </div>

          {/* Due date */}
          {dateStr && (
            <div className="flex items-center gap-1">
              <Calendar size={10} style={{ color: 'rgb(var(--n8))' }} />
              <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>{dateStr}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!isDragOverlay && onDelete && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(feature.id) }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition p-0.5 rounded text-n8 hover:text-danger"
            >
              <Trash2 size={11} />
            </button>
          )}
          <Avatar name={feature.assignee} size={20} />
        </div>
      </div>
    </div>
  )
}

/* ── Add Feature Form ────────────────────────────────────────────── */
interface AddFormProps {
  status: FeatureStatus
  onClose: () => void
}

const BLANK = {
  title: '', description: '', priority: 'P2' as FeaturePriority,
  assignee: '', dueDate: '',
}

function AddFeatureForm({ status, onClose }: AddFormProps) {
  const { addFeature } = useWorkspaceStore()
  const [form, setForm] = useState({ ...BLANK })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addFeature({
      ...form,
      title: form.title.trim(),
      status,
      reach: 1000, impact: 1, confidence: 50, effort: 1,
      moscow: 'Should', linkedDocId: null,
    })
    toast.success(`Feature "${form.title.trim()}" added`)
    onClose()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-3 mb-2"
      style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n7))' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Feature title…"
        className="w-full bg-transparent text-xs font-medium outline-none mb-2.5"
        style={{ color: 'rgb(var(--n12))', caretColor: 'rgb(var(--brand-fg))' }}
      />

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {/* Priority */}
        <div>
          <label className="block text-[10px] mb-1" style={{ color: 'rgb(var(--n8))' }}>Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as FeaturePriority })}
            className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))' }}
          >
            {(['P0','P1','P2','P3'] as FeaturePriority[]).map((p) => (
              <option key={p} value={p} style={{ background: 'rgb(var(--n3))' }}>
                {p} — {PRIORITY[p].label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-[10px] mb-1" style={{ color: 'rgb(var(--n8))' }}>Assignee</label>
          <input
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
            placeholder="Name"
            className="w-full bg-transparent text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))', caretColor: 'rgb(var(--brand-fg))' }}
          />
        </div>
      </div>

      {/* Due date */}
      <div className="mb-3">
        <label className="block text-[10px] mb-1" style={{ color: 'rgb(var(--n8))' }}>Due date</label>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
          style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))', colorScheme: 'dark' }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!form.title.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
          style={{ background: 'rgb(var(--brand))', color: 'rgb(var(--on-brand))' }}
        >
          Add feature
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n10))' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Droppable Column ────────────────────────────────────────────── */
interface ColumnProps {
  col: typeof COLUMNS[number]
  features: Feature[]
  onDelete: (id: string) => void
}

function DroppableColumn({ col, features, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const [adding, setAdding] = useState(false)

  const totalRice = features.reduce((s, f) => s + f.riceScore, 0)

  return (
    <div
      className="flex flex-col flex-shrink-0 rounded-xl overflow-hidden"
      style={{
        width: 200,
        background: isOver ? col.accentBg : 'rgb(var(--n1))',
        border: `1px solid ${isOver ? `color-mix(in srgb, ${col.accent} 27%, transparent)` : 'rgb(var(--n4))'}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgb(var(--n4))' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.accent }} aria-hidden />
          <span className="text-xs font-semibold" style={{ color: 'rgb(var(--n12))' }}>{col.label}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n8))' }}
          >
            {features.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {totalRice > 0 && (
            <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--n9))' }} title="Total RICE">
              {totalRice.toLocaleString()}
            </span>
          )}
          <button
            onClick={() => setAdding(true)}
            className="p-1 rounded transition-colors text-n8 hover:text-[var(--col-accent)]"
            style={{ '--col-accent': col.accent } as React.CSSProperties}
            title={`Add to ${col.label}`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2"
        style={{ minHeight: 80 }}
      >
        {adding && (
          <AddFeatureForm status={col.id} onClose={() => setAdding(false)} />
        )}
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} onDelete={onDelete} />
        ))}
        {features.length === 0 && !adding && (
          <div
            className="flex items-center justify-center h-16 rounded-lg border border-dashed text-[11px]"
            style={{ borderColor: 'rgb(var(--n5))', color: 'rgb(var(--n8))' }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Filter Bar ──────────────────────────────────────────────────── */
interface Filters {
  priorities: FeaturePriority[]
  assignee: string
  dateFrom: string
  dateTo: string
}

interface FilterBarProps {
  filters: Filters
  assignees: string[]
  onChange: (f: Filters) => void
}

function FilterBar({ filters, assignees, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const active = filters.priorities.length < 4 || filters.assignee || filters.dateFrom || filters.dateTo

  return (
    <div className="flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: active ? 'rgb(var(--brand) / 0.12)' : 'rgb(var(--n3))',
          color: active ? 'rgb(var(--brand-fg))' : 'rgb(var(--n8))',
          border: `1px solid ${active ? 'rgb(var(--brand) / 0.3)' : 'rgb(var(--n5))'}`,
        }}
      >
        <Filter size={11} />
        Filter
        {active && <span className="w-1.5 h-1.5 rounded-full bg-brand ml-0.5" />}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl p-3 space-y-3"
          style={{ background: 'rgb(var(--n3))', border: '1px solid rgb(var(--n5))' }}
        >
          {/* Priority chips */}
          <div>
            <p className="text-[10px] mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Priority</p>
            <div className="flex gap-1.5 flex-wrap">
              {(['P0','P1','P2','P3'] as FeaturePriority[]).map((p) => {
                const on = filters.priorities.includes(p)
                const cfg = PRIORITY[p]
                return (
                  <button
                    key={p}
                    onClick={() => {
                      const next = on
                        ? filters.priorities.filter(x => x !== p)
                        : [...filters.priorities, p]
                      onChange({ ...filters, priorities: next.length ? next : ['P0','P1','P2','P3'] })
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                    style={{
                      background: on ? cfg.bg : 'rgb(var(--n5))',
                      color: on ? cfg.text : 'rgb(var(--n8))',
                      border: `1px solid ${on ? cfg.ring : 'transparent'}`,
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assignee */}
          {assignees.length > 0 && (
            <div>
              <p className="text-[10px] mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Assignee</p>
              <select
                value={filters.assignee}
                onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
                className="w-full text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))' }}
              >
                <option value="" style={{ background: 'rgb(var(--n3))' }}>All assignees</option>
                {assignees.map((a) => (
                  <option key={a} value={a} style={{ background: 'rgb(var(--n3))' }}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-[10px] mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Due date range</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="flex-1 text-[10px] rounded-lg px-2 py-1.5 outline-none"
                style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))', colorScheme: 'dark' }}
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="flex-1 text-[10px] rounded-lg px-2 py-1.5 outline-none"
                style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n12))', border: '1px solid rgb(var(--n7))', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => onChange({ priorities: ['P0','P1','P2','P3'], assignee: '', dateFrom: '', dateTo: '' })}
            className="text-[10px] transition-colors text-n8 hover:text-n10"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Timeline View ───────────────────────────────────────────────── */
function TimelineView({ features }: { features: Feature[] }) {
  // Build ordered quarter list
  const quarters = useMemo(() => {
    const qtrs = new Map<string, Feature[]>()
    features.forEach((f) => {
      const q = quarterLabel(f.dueDate)
      if (!qtrs.has(q)) qtrs.set(q, [])
      qtrs.get(q)!.push(f)
    })
    // Sort quarters (Unscheduled last)
    const sorted = Array.from(qtrs.entries()).sort(([a], [b]) => {
      if (a === 'Unscheduled') return 1
      if (b === 'Unscheduled') return -1
      return a.localeCompare(b)
    })
    return sorted
  }, [features])

  if (features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-16 px-6 text-center">
        <div className="text-3xl">🗺</div>
        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--n11))' }}>No features yet</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--n8))' }}>
          Add features to any column to start building your roadmap.
        </p>
        <p className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>
          Click the <strong style={{ color: 'rgb(var(--brand-fg))' }}>+</strong> button in any column to add your first feature.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max pb-2">
        {quarters.map(([qtr, qFeatures]) => {
          const doneCount = qFeatures.filter(f => f.status === 'Done').length
          const pct = Math.round((doneCount / qFeatures.length) * 100)

          return (
            <div
              key={qtr}
              className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{ width: 180, background: 'rgb(var(--n1))', border: '1px solid rgb(var(--n4))' }}
            >
              {/* Quarter header */}
              <div className="px-3 py-2 border-b" style={{ borderColor: 'rgb(var(--n4))' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: qtr === 'Unscheduled' ? 'rgb(var(--n8))' : 'rgb(var(--n12))' }}>
                    {qtr}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>
                    {qFeatures.length} feature{qFeatures.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--n5))' }}>
                  <div
                    className="h-full w-full rounded-full origin-left"
                    style={{
                      transform: `scaleX(${pct / 100})`,
                      transition: `transform var(--spring-duration) var(--spring)`,
                      background: 'rgb(var(--green))',
                    }}
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'rgb(var(--n8))' }}>{pct}% done</p>
              </div>

              {/* Features */}
              <div className="p-2 space-y-1.5">
                {qFeatures
                  .sort((a, b) => {
                    const po = ['P0','P1','P2','P3']
                    return po.indexOf(a.priority) - po.indexOf(b.priority)
                  })
                  .map((f) => {
                    const col = COLUMNS.find(c => c.id === f.status)!
                    const pcfg = PRIORITY[f.priority]
                    return (
                      <div
                        key={f.id}
                        className="flex items-start gap-1.5 rounded-lg px-2 py-1.5"
                        style={{ background: 'rgb(var(--n3))', border: '1px solid rgb(var(--n5))' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: col.accent }} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium leading-snug truncate" style={{ color: 'rgb(var(--n12))' }}>
                            {f.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[10px] font-bold px-1 py-0.5 rounded"
                              style={{ background: pcfg.bg, color: pcfg.text }}
                            >
                              {f.priority}
                            </span>
                            {f.dueDate && (
                              <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>
                                {fmtDate(f.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Avatar name={f.assignee} size={16} />
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main RoadmapBoard ───────────────────────────────────────────── */
export default function RoadmapBoard() {
  const { features, updateFeature, deleteFeature } = useWorkspaceStore()
  const [view, setView]         = useState<'kanban' | 'timeline'>('kanban')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filters, setFilters]   = useState<Filters>({
    priorities: ['P0','P1','P2','P3'],
    assignee:   '',
    dateFrom:   '',
    dateTo:     '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const uniqueAssignees = useMemo(
    () => Array.from(new Set(features.map(f => f.assignee).filter(Boolean))).sort(),
    [features]
  )

  const filtered = useMemo(() => {
    return features.filter(f => {
      if (!filters.priorities.includes(f.priority)) return false
      if (filters.assignee && f.assignee !== filters.assignee) return false
      if (filters.dateFrom && f.dueDate && f.dueDate < filters.dateFrom) return false
      if (filters.dateTo   && f.dueDate && f.dueDate > filters.dateTo)   return false
      return true
    })
  }, [features, filters])

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string)
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const featureId  = active.id as string
    const targetId   = over.id as string
    const validCols  = COLUMNS.map(c => c.id) as string[]
    if (validCols.includes(targetId)) {
      const feature = features.find(f => f.id === featureId)
      if (feature && feature.status !== targetId) {
        updateFeature(featureId, { status: targetId as FeatureStatus })
      }
    }
  }, [features, updateFeature])

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgb(var(--n0))' }}>
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <FilterBar
          filters={filters}
          assignees={uniqueAssignees}
          onChange={setFilters}
        />

        {/* View toggle */}
        <div
          className="flex rounded-lg overflow-hidden flex-shrink-0"
          style={{ background: 'rgb(var(--n3))', border: '1px solid rgb(var(--n5))' }}
        >
          {([
            { id: 'kanban',   icon: <LayoutGrid size={12} /> },
            { id: 'timeline', icon: <AlignLeft size={12} /> },
          ] as { id: 'kanban' | 'timeline'; icon: React.ReactNode }[]).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-colors"
              style={{
                background: view === v.id ? 'rgb(var(--brand))' : 'transparent',
                color:      view === v.id ? 'rgb(var(--on-brand))'    : 'rgb(var(--n8))',
              }}
              title={v.id}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-3 pb-2 text-[10px]"
        style={{ color: 'rgb(var(--n8))' }}
      >
        <span>{filtered.length} features</span>
        {COLUMNS.map(c => {
          const n = filtered.filter(f => f.status === c.id).length
          if (!n) return null
          return (
            <span key={c.id} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.accent }} aria-hidden />
              <span style={{ color: 'rgb(var(--n10))' }}>{n}</span>
            </span>
          )
        })}
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex gap-3 h-full px-3 pb-3 min-w-max">
                {COLUMNS.map((col) => (
                  <DroppableColumn
                    key={col.id}
                    col={col}
                    features={filtered.filter(f => f.status === col.id)}
                    onDelete={deleteFeature}
                  />
                ))}
              </div>
            </div>

            <DragOverlay dropAnimation={{ duration: 300, easing: SPRING_EASING }}>
              {activeFeature && (
                <FeatureCard feature={activeFeature} isDragOverlay />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="h-full overflow-y-auto px-3 pb-3">
            <TimelineView features={filtered} />
          </div>
        )}
      </div>
    </div>
  )
}
