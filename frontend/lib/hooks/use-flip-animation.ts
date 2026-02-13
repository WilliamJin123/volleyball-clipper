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

  // Before paint: snapshot current positions for comparison on next render
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const items = container.querySelectorAll<HTMLElement>('[data-flip-key]')
    const newPositions = new Map<string, DOMRect>()

    // --- Invert phase: measure new positions, apply inverse transforms ---
    items.forEach((el) => {
      const key = el.dataset.flipKey!
      const newRect = el.getBoundingClientRect()
      newPositions.set(key, newRect)

      const oldRect = positionsRef.current.get(key)
      if (!oldRect) return

      const deltaX = oldRect.left - newRect.left
      const deltaY = oldRect.top - newRect.top
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return

      // Instantly place at old position (no transition)
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      el.style.transition = 'none'
    })

    // Store new (actual) positions for next cycle
    positionsRef.current = newPositions

    // --- Play phase: animate from old position to new position ---
    requestAnimationFrame(() => {
      items.forEach((el) => {
        if (
          el.style.transform &&
          el.style.transform !== '' &&
          el.style.transform !== 'none'
        ) {
          el.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
          el.style.transform = ''
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(',')])
}
