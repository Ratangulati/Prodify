'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { springs } from '@/lib/motion'
import type { AIWorkflow } from '@/lib/types'

export interface AIMode {
  id: AIWorkflow
  name: string
  hint: string
  icon: React.ReactNode
  /** Its answer is written into a document (otherwise it stays in chat) */
  writesDoc?: boolean
}

/**
 * Picks what the AI produces. One compact button instead of a second row of
 * tabs: the panel tabs above choose a view, this chooses a mode, so the two
 * never look alike. The menu grows from the button and closes on Escape or
 * a click outside.
 */
export default function AIModeMenu({
  modes, value, onChange,
}: {
  modes: AIMode[]
  value: AIWorkflow
  onChange: (id: AIWorkflow) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = modes.find((mode) => mode.id === value) ?? modes[0]

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const docModes = modes.filter((mode) => mode.writesDoc)
  const chatModes = modes.filter((mode) => !mode.writesDoc)

  const item = (mode: AIMode) => {
    const active = mode.id === value
    return (
      <button
        key={mode.id}
        role="menuitemradio"
        aria-checked={active}
        onClick={() => { onChange(mode.id); setOpen(false) }}
        className={`press-tint flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors ${active ? 'bg-brand/[0.08]' : 'hover:bg-overlay/5'}`}
      >
        <span className={`mt-0.5 ${active ? 'text-brand-fg' : 'text-n8'}`}>{mode.icon}</span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[13px] font-medium ${active ? 'text-n12' : 'text-n11'}`}>{mode.name}</span>
          <span className="block text-[11px] text-n8">{mode.hint}</span>
        </span>
        {active && <Check size={13} className="mt-0.5 text-brand-fg" aria-hidden />}
      </button>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-2 pr-1.5 h-7 rounded-md text-[13px] font-medium transition-colors text-n12 hover:bg-overlay/5"
      >
        <span className="text-brand-fg">{current.icon}</span>
        {current.name}
        <ChevronDown size={13} className={`text-n8 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            aria-label="AI mode"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={springs.ui}
            className="absolute left-0 top-full mt-1 z-50 w-72 py-1 rounded-xl border origin-top-left overflow-hidden"
            style={{ background: 'rgb(var(--n4))', borderColor: 'rgb(var(--n6))', boxShadow: 'var(--elev-md)' }}
          >
            <p className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-n8">Writes to a document</p>
            {docModes.map(item)}
            <div className="my-1 border-t border-n6" />
            <p className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider font-semibold text-n8">Answers in chat</p>
            {chatModes.map(item)}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
