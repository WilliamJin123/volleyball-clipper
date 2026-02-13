import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * FLIP animation hook: smoothly animates items to new positions
 * when the list layout changes (e.g., items removed after search filter).
 *
 * Add `data-flip-key="<unique-id>"` to each item wrapper that should animate.
 * Only add it to 'visible' items (not entering/exiting).
 */
export function useFlipAnimation(
  containerRef: RefObject<HTMLElement | null>,
  keys: string[] // array of visible item keys – changes trigger FLIP
) {
  const positionsRef = useRef<Map<string, DOMRect>>(new Map())
  const prevKeysRef = useRef<string[]>([])

  // Before paint: snapshot current positions for comparison on next render
  useLayoutEffect(() => {
    // Stable comparison: skip if keys haven't actually changed
    const prev = prevKeysRef.current
    if (
      prev.length === keys.length &&
      prev.every((k, i) => k === keys[i])
    ) {
      return
    }
    prevKeysRef.current = keys

    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll<HTMLElement>('[data-flip-key]')

    // --- First pass: read ALL new rects (no writes) ---
    const newPositions = new Map<string, DOMRect>()
    const deltas: Array<{ el: HTMLElement; deltaX: number; deltaY: number }> = []

    items.forEach((el) => {
      const key = el.dataset.flipKey!
      const newRect = el.getBoundingClientRect()
      newPositions.set(key, newRect)

      const oldRect = positionsRef.current.get(key)
      if (!oldRect) return

      const deltaX = oldRect.left - newRect.left
      const deltaY = oldRect.top - newRect.top
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return

      deltas.push({ el, deltaX, deltaY })
    })

    // Store new (actual) positions for next cycle
    positionsRef.current = newPositions

    // --- Second pass: write ALL inverse transforms (no reads) ---
    deltas.forEach(({ el, deltaX, deltaY }) => {
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      el.style.transition = 'none'
    })

    // --- Play phase: animate from old position to new position ---
    requestAnimationFrame(() => {
      deltas.forEach(({ el }) => {
        el.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
        el.style.transform = ''
      })
    })
  })
}
