'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'

/**
 * Tooltip for icon-only buttons. Shows on hover after a short delay and on
 * keyboard focus, renders in a portal so panel overflow can't clip it, and
 * uses ink on paper (inverted in dark mode). The child should carry its own
 * aria-label; the tooltip is the visible version of it.
 */
export default function Tip({
  label, side = 'bottom', children,
}: {
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactElement
}) {
  return (
    <TooltipPrimitive.Root delayDuration={400}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-[2000] rounded-md px-2 py-1 text-[11px] font-medium leading-tight select-none"
          style={{ background: 'rgb(var(--n12))', color: 'rgb(var(--n0))', boxShadow: 'var(--elev-md)' }}
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
