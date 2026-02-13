'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useVideos, useJobs, useClips, useStorage, formatBytes } from '@/lib/hooks'

function useAnimatedCounter(target: number, duration = 1000) {
  const [display, setDisplay] = useState(0)
  const animFrameRef = useRef<number>(0)
  const prevTargetRef = useRef<number>(0)

  const animate = useCallback((from: number, to: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (from === to) {
      setDisplay(to)
      return
    }

    const start = performance.now()

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      // ease-slam: quartic ease-out (matches AnimatedCounters component)
      const ease = 1 - Math.pow(1 - t, 4)
      const current = Math.round(from + (to - from) * ease)
      setDisplay(current)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        // Only update prevTarget on completion so strict-mode replays still animate from 0
        prevTargetRef.current = to
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [duration])

  useEffect(() => {
    animate(prevTargetRef.current, target)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [target, animate])

  return display
}

interface StatCardProps {
  label: string
  value: string | number
  colorClass: string
  glowColor: string
}

function StatCard({ label, value, colorClass, glowColor }: StatCardProps) {
  const isNumeric = typeof value === 'number'
  const animatedValue = useAnimatedCounter(isNumeric ? value : 0)
  const displayValue = isNumeric ? animatedValue.toLocaleString() : value

  return (
    <div
      className="bg-bg-surface border border-border-dim rounded-sm p-5 transition-all duration-200 hover:border-border-bright group"
    >
      <p className="font-mono text-[0.6875rem] font-medium text-text-dim uppercase tracking-wide mb-2">
        {label}
      </p>
      <p
        className={`font-mono text-[1.75rem] font-bold tracking-tight ${colorClass} transition-all duration-200`}
        style={{ textShadow: 'none', fontVariantNumeric: 'tabular-nums' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textShadow = `0 0 12px ${glowColor}`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textShadow = 'none'
        }}
      >
        {displayValue}
      </p>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm p-5">
      <div className="h-3 w-20 bg-bg-raised rounded-sm mb-3 animate-pulse" />
      <div className="h-8 w-12 bg-bg-raised rounded-sm animate-pulse" />
    </div>
  )
}

export function StatsCards() {
  const { videos, loading: videosLoading } = useVideos()
  const { jobs, loading: jobsLoading } = useJobs()
  const { clips, loading: clipsLoading } = useClips()
  const { storage, loading: storageLoading } = useStorage()

  const isLoading = videosLoading || jobsLoading || clipsLoading || storageLoading

  const readyVideos = videos.filter((v) => v.status === 'ready').length
  const activeJobs = jobs.filter(
    (j) => j.status === 'processing' || j.status === 'pending'
  ).length

  const storageDisplay = storageLoading
    ? '...'
    : storage
      ? formatBytes(storage.totalBytes)
      : '0 B'

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-3 mb-10">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-3 mb-10">
      <StatCard
        label="Total Clips"
        value={clips.length}
        colorClass="text-accent-success"
        glowColor="rgba(34, 211, 122, 0.4)"
      />
      <StatCard
        label="Active Jobs"
        value={activeJobs}
        colorClass="text-accent-primary"
        glowColor="var(--accent-primary-glow-30)"
      />
      <StatCard
        label="Videos Indexed"
        value={readyVideos}
        colorClass="text-accent-secondary"
        glowColor="rgba(59, 130, 246, 0.4)"
      />
      <StatCard
        label="Storage"
        value={storageDisplay}
        colorClass="text-text-secondary"
        glowColor="rgba(122, 122, 138, 0.3)"
      />
    </div>
  )
}
