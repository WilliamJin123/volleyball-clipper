'use client'

import { useJobs, useClips } from '@/lib/hooks'
import { useAuth } from '@/lib/context/auth-context'
import { useState, useEffect, useRef, useCallback } from 'react'

function formatElapsed(startDate: string): string {
  const start = new Date(startDate).getTime()
  const now = Date.now()
  const diffSec = Math.floor((now - start) / 1000)

  if (diffSec < 0) return '00:00:00'

  const hours = Math.floor(diffSec / 3600)
  const mins = Math.floor((diffSec % 3600) / 60)
  const secs = diffSec % 60

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function ScoreBug() {
  const { user } = useAuth()
  const { jobs, loading: jobsLoading } = useJobs()
  const { clips, loading: clipsLoading } = useClips()
  const [elapsed, setElapsed] = useState('00:00:00')

  // Drag state
  // Position is stored as { x, y } in pixels from top-left of viewport.
  // null means "use the default bottom-right CSS position".
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const completedClips = clips.length
  const activeJobs = jobs.filter(
    (j) => j.status === 'processing' || j.status === 'pending'
  )
  const activeCount = activeJobs.length

  // Find the earliest active job to track elapsed time
  const earliestActiveJob = activeJobs.length > 0
    ? activeJobs.reduce((earliest, job) =>
        new Date(job.created_at) < new Date(earliest.created_at) ? job : earliest
      )
    : null

  // Update elapsed time every second when there are active jobs
  useEffect(() => {
    if (!earliestActiveJob) {
      setElapsed('00:00:00')
      return
    }

    setElapsed(formatElapsed(earliestActiveJob.created_at))
    const interval = setInterval(() => {
      setElapsed(formatElapsed(earliestActiveJob.created_at))
    }, 1000)

    return () => clearInterval(interval)
  }, [earliestActiveJob])

  // --- Drag handlers ---

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    // If this is the first drag, convert from the default CSS position to
    // an explicit pixel position so we can move it freely.
    if (position === null) {
      setPosition({ x: rect.left, y: rect.top })
    }

    setIsDragging(true)
    el.setPointerCapture(e.pointerId)
  }, [position])

  const rafRef = useRef<number | null>(null)

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return

    const clientX = e.clientX
    const clientY = e.clientY

    if (rafRef.current !== null) return

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const newX = clientX - dragOffset.current.x
      const newY = clientY - dragOffset.current.y

      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    })
  }, [isDragging])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const el = containerRef.current
    if (el) {
      el.releasePointerCapture(e.pointerId)
    }
  }, [isDragging])

  // Don't render if not authenticated or still loading
  if (!user || (jobsLoading && clipsLoading)) return null

  // Determine current "set" label based on total completed jobs
  const completedJobs = jobs.filter((j) => j.status === 'completed').length
  const currentSet = completedJobs + (activeCount > 0 ? 1 : 0)
  const setLabel = currentSet > 0 ? `SET ${currentSet}` : 'SET 0'

  // Build position styles
  const positionStyle: React.CSSProperties = position !== null
    ? {
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      }
    : {
        right: 16,
        bottom: 16,
      }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{
        ...positionStyle,
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="font-mono text-[0.6875rem] rounded-sm min-w-[120px]"
        style={{
          background: 'var(--bg-void-92)',
          border: '1px solid var(--color-border-dim)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* DONE row */}
        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-[0.5625rem] tracking-wide">
            <span
              className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: 'var(--color-accent-success)' }}
            />
            <span>CLIPS</span>
          </div>
          <span className="text-text-primary font-medium text-[0.875rem]">
            {completedClips}
          </span>
        </div>

        {/* ACTIVE row */}
        <div className="flex items-center justify-between px-2.5 pb-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-[0.5625rem] tracking-wide">
            <span
              className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: 'var(--color-accent-primary)' }}
            />
            <span>ACTIVE</span>
          </div>
          <span
            className="font-medium text-[0.875rem]"
            style={{ color: activeCount > 0 ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)' }}
          >
            {activeCount}
          </span>
        </div>

        {/* Bottom bar */}
        <div
          className="px-2.5 py-1 text-center text-text-dim text-[0.5rem] tracking-wider"
          style={{ borderTop: '1px solid var(--color-border-dim)' }}
        >
          {setLabel} &middot; {elapsed}
        </div>
      </div>
    </div>
  )
}
