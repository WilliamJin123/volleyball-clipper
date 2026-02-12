'use client'

import { useVideos, useJobs, useClips } from '@/lib/hooks'

interface StatCardProps {
  label: string
  value: string | number
  colorClass: string
  glowColor: string
}

function StatCard({ label, value, colorClass, glowColor }: StatCardProps) {
  return (
    <div
      className="bg-bg-surface border border-border-dim rounded-sm p-5 transition-all duration-200 hover:border-border-bright group"
    >
      <p className="font-mono text-[0.6875rem] font-medium text-text-dim uppercase tracking-wide mb-2">
        {label}
      </p>
      <p
        className={`font-mono text-[1.75rem] font-bold tracking-tight ${colorClass} transition-all duration-200`}
        style={{ textShadow: 'none' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textShadow = `0 0 12px ${glowColor}`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textShadow = 'none'
        }}
      >
        {value}
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

  const isLoading = videosLoading || jobsLoading || clipsLoading

  const readyVideos = videos.filter((v) => v.status === 'ready').length
  const activeJobs = jobs.filter(
    (j) => j.status === 'processing' || j.status === 'pending'
  ).length

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
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
        glowColor="rgba(255, 90, 31, 0.4)"
      />
      <StatCard
        label="Videos Indexed"
        value={readyVideos}
        colorClass="text-accent-secondary"
        glowColor="rgba(59, 130, 246, 0.4)"
      />
      <StatCard
        label="Storage"
        value={'\u2014'}
        colorClass="text-text-secondary"
        glowColor="rgba(122, 122, 138, 0.3)"
      />
    </div>
  )
}
