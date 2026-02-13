import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export type AnimationStatus = 'entering' | 'visible' | 'exiting'

export interface AnimatedItem<T> {
  item: T
  status: AnimationStatus
  key: string
}

interface UseAnimatedListOptions {
  /** Duration in ms for the exit animation. Default: 300 */
  exitDuration?: number
  /** Duration in ms for the enter animation. Default: 300 */
  enterDuration?: number
}

/**
 * Hook that provides enter/exit animations for a filtered list of items.
 * Exiting items stay in their original position (not appended at end).
 * Handles rapid filtering, re-entering items, and cancels stale timeouts.
 */
export function useAnimatedList<T extends { id: string }>(
  filteredItems: T[],
  options: UseAnimatedListOptions = {}
): AnimatedItem<T>[] {
  const { exitDuration = 300, enterDuration = 300 } = options

  const seenIdsRef = useRef<Set<string>>(new Set())
  const [exitingMap, setExitingMap] = useState<Map<string, T>>(new Map())
  const [enteringSet, setEnteringSet] = useState<Set<string>>(new Set())
  const prevFilteredMapRef = useRef<Map<string, T>>(new Map())
  // Stable order tracking: keeps IDs in their last known position
  const masterOrderRef = useRef<string[]>([])
  // Per-item exit timeouts so we can cancel individually
  const exitTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const filteredMap = useMemo(() => {
    const map = new Map<string, T>()
    for (const item of filteredItems) {
      map.set(item.id, item)
    }
    return map
  }, [filteredItems])

  // Cancel an exit timeout for a specific id
  const cancelExit = useCallback((id: string) => {
    const timeout = exitTimeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      exitTimeoutsRef.current.delete(id)
    }
    setExitingMap((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    const prevMap = prevFilteredMapRef.current

    // Detect newly removed items (were in prev, not in current)
    const newlyExiting = new Map<string, T>()
    for (const [id, item] of prevMap) {
      if (!filteredMap.has(id)) {
        newlyExiting.set(id, item)
      }
    }

    // Detect items that came back — cancel their exit animation
    for (const [id] of filteredMap) {
      if (exitTimeoutsRef.current.has(id)) {
        cancelExit(id)
      }
    }

    // Detect newly added items (in current, not seen before or re-entering)
    const newlyEntering = new Set<string>()
    for (const [id] of filteredMap) {
      if (!prevMap.has(id) && !seenIdsRef.current.has(id)) {
        newlyEntering.add(id)
        seenIdsRef.current.add(id)
      }
    }

    // Update previous map
    prevFilteredMapRef.current = new Map(filteredMap)

    // Update master order: insert new items at a reasonable position
    const currentOrder = new Set(masterOrderRef.current)
    for (const item of filteredItems) {
      if (!currentOrder.has(item.id)) {
        masterOrderRef.current.push(item.id)
      }
    }

    // Add newly exiting items
    if (newlyExiting.size > 0) {
      setExitingMap((prev) => {
        const next = new Map(prev)
        for (const [id, item] of newlyExiting) {
          next.set(id, item)
        }
        return next
      })

      // Schedule per-item removal after exit animation
      for (const [id] of newlyExiting) {
        const timeoutId = setTimeout(() => {
          setExitingMap((prev) => {
            const next = new Map(prev)
            next.delete(id)
            return next
          })
          exitTimeoutsRef.current.delete(id)
          // Allow re-enter animation if the item comes back later
          seenIdsRef.current.delete(id)
          // Remove from master order once fully exited
          masterOrderRef.current = masterOrderRef.current.filter((i) => i !== id)
        }, exitDuration)
        exitTimeoutsRef.current.set(id, timeoutId)
      }
    }

    // Handle entering items
    if (newlyEntering.size > 0) {
      setEnteringSet((prev) => {
        const next = new Set(prev)
        for (const id of newlyEntering) {
          next.add(id)
        }
        return next
      })

      const enteringIds = Array.from(newlyEntering)
      setTimeout(() => {
        setEnteringSet((prev) => {
          const next = new Set(prev)
          for (const id of enteringIds) {
            next.delete(id)
          }
          return next
        })
      }, enterDuration)
    }
  }, [filteredMap, exitDuration, enterDuration, cancelExit])

  // Seed on mount
  useEffect(() => {
    for (const item of filteredItems) {
      seenIdsRef.current.add(item.id)
    }
    prevFilteredMapRef.current = new Map(filteredItems.map((item) => [item.id, item]))
    masterOrderRef.current = filteredItems.map((item) => item.id)

    // Cleanup all timeouts on unmount
    return () => {
      for (const timeout of exitTimeoutsRef.current.values()) {
        clearTimeout(timeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build the final animated list, preserving original positions
  return useMemo(() => {
    const currentIds = new Set(filteredItems.map((i) => i.id))
    const exitingIds = new Set(exitingMap.keys())

    // Build a lookup of all renderable items
    const allItemMap = new Map<string, T>()
    for (const item of filteredItems) allItemMap.set(item.id, item)
    for (const [id, item] of exitingMap) {
      if (!currentIds.has(id)) allItemMap.set(id, item)
    }

    // Walk master order to preserve positions
    const result: AnimatedItem<T>[] = []
    const used = new Set<string>()

    for (const id of masterOrderRef.current) {
      if (!allItemMap.has(id) || used.has(id)) continue
      used.add(id)

      const item = allItemMap.get(id)!
      let status: AnimationStatus
      if (exitingIds.has(id) && !currentIds.has(id)) {
        status = 'exiting'
      } else if (enteringSet.has(id)) {
        status = 'entering'
      } else {
        status = 'visible'
      }
      result.push({ item, status, key: id })
    }

    // Any items not yet in master order (edge case: new items added in same frame)
    for (const item of filteredItems) {
      if (!used.has(item.id)) {
        const status: AnimationStatus = enteringSet.has(item.id) ? 'entering' : 'visible'
        result.push({ item, status, key: item.id })
      }
    }

    return result
  }, [filteredItems, exitingMap, enteringSet])
}
