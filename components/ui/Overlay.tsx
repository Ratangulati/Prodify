'use client'

import { AnimatePresence, m, useIsPresent } from 'motion/react'
import { springs } from '@/lib/motion'

interface OverlayProps {
  open: boolean
  onClose: () => void
  /** Classes for the full-screen scrim (positioning of the panel) */
  className?: string
  /** Classes and styles for the floating panel */
  panelClassName?: string
  panelStyle?: React.CSSProperties
  /** Where the panel grows from */
  origin?: string
  children: React.ReactNode
}

/**
 * Modal scrim + panel. Springs start from the current on-screen value, so
 * reopening while it is still closing reverses smoothly instead of jumping.
 */
export default function Overlay({ open, ...rest }: OverlayProps) {
  return (
    <AnimatePresence>
      {open && <OverlayContent key="overlay" {...rest} />}
    </AnimatePresence>
  )
}

function OverlayContent({
  onClose, className = '', panelClassName = '', panelStyle, origin = 'center', children,
}: Omit<OverlayProps, 'open'>) {
  // While exiting, let clicks fall through to the app underneath
  const isPresent = useIsPresent()

  // The scrim is a sibling, not a parent: a fading ancestor would stop the
  // panel's backdrop-filter from seeing the app behind it.
  return (
    <div
      className={`fixed inset-0 z-[1000] flex justify-center ${className}`}
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
    >
      <m.div
        aria-hidden
        className="overlay-scrim absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={springs.ui}
        onClick={onClose}
      />
      <m.div
        role="dialog"
        aria-modal="true"
        className={`relative ${panelClassName}`}
        style={{ transformOrigin: origin, ...panelStyle }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={springs.ui}
      >
        {children}
      </m.div>
    </div>
  )
}
