import type { Transition } from 'motion/react'

/**
 * Apple-style spring described by damping ratio + response (seconds),
 * converted to physics values for a unit mass:
 *   stiffness = (2π / response)²   damping = 4π · ratio / response
 * Ratio 1 is critically damped: no overshoot, settles smoothly.
 */
function spring(response: number, dampingRatio = 1): Transition {
  return {
    type: 'spring',
    stiffness: (2 * Math.PI / response) ** 2,
    damping: (4 * Math.PI * dampingRatio) / response,
    mass: 1,
  }
}

export const springs = {
  /** Panels, modals, toasts, menus */
  ui: spring(0.35),
  /** Small things that should feel immediate: chat bubbles, diff toggle */
  snappy: spring(0.3),
}

/** CSS/WAAPI easing for the same critically damped curve (see --spring in globals.css) */
export const SPRING_EASING =
  'linear(0, 0.114, 0.321, 0.517, 0.671, 0.783, 0.860, 0.911, 0.945, 0.966, 0.979, 0.987, 0.992, 0.995, 0.997, 0.998, 1)'
