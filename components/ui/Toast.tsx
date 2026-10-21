'use client'

import { AnimatePresence, m } from 'motion/react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { springs } from '@/lib/motion'
import { useToastStore, type ToastItem } from '@/lib/toast'

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const icons = {
    success: <CheckCircle2 size={15} style={{ color: 'rgb(var(--green-fg))', flexShrink: 0 }} />,
    error:   <XCircle      size={15} style={{ color: 'rgb(var(--red-fg))', flexShrink: 0 }} />,
    info:    <Info         size={15} style={{ color: 'rgb(var(--blue-fg))', flexShrink: 0 }} />,
  }
  const borders = {
    success: 'rgb(var(--green-fg) / 0.2)',
    error:   'rgb(var(--red-fg) / 0.2)',
    info:    'rgb(var(--blue-fg) / 0.2)',
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-xl"
      style={{
        background: 'rgb(var(--n4))',
        border: `1px solid ${borders[toast.type]}`,
        maxWidth: 320,
        minWidth: 220,
      }}
    >
      {icons[toast.type]}
      <span className="text-xs flex-1 leading-snug" style={{ color: 'rgb(var(--n11))' }}>
        {toast.message}
      </span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-overlay/10 transition-colors flex-shrink-0"
        style={{ color: 'rgb(var(--n8))' }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      className="fixed bottom-5 right-5 flex flex-col gap-2 z-[9999] pointer-events-none"
    >
      {/* Enter from below and leave the same way */}
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((t) => (
          <m.div
            key={t.id}
            className="pointer-events-auto"
            style={{ transformOrigin: 'bottom right' }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={springs.ui}
          >
            <ToastCard toast={t} onRemove={() => removeToast(t.id)} />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
