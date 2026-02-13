'use client'

import Link from 'next/link'
import { useJobs } from '@/lib/hooks'
import { FusedBar } from '@/components/ui/fused-bar'
import { DashboardJobLoadingDemo } from '@/components/jobs/job-loading-demo'

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function JobRowSkeleton() {
  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm p-3.5 px-4.5">
      <div className="grid grid-cols-[1fr_minmax(140px,200px)_auto] gap-4 items-center">
        <div>
          <div className="h-4 w-40 bg-bg-raised rounded-sm mb-1.5 animate-pulse" />
          <div className="h-3 w-24 bg-bg-raised rounded-sm animate-pulse" />
        </div>
        <div className="h-8 bg-bg-raised rounded-sm animate-pulse" />
        <div className="h-3 w-12 bg-bg-raised rounded-sm animate-pulse" />
      </div>
    </div>
  )
}

export function RecentJobs() {
  const { jobs, loading, error } = useJobs()

  const recentJobs = jobs.slice(0, 3)

  if (error) {
    return (
      <div className="bg-bg-surface border border-accent-error/20 rounded-sm p-6 text-center">
        <p className="font-mono text-sm text-accent-error">{error}</p>
      </div>
    )
  }

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-[1.125rem] text-text-primary">
          Active Jobs
        </h2>
        <Link
          href="/jobs"
          className="font-mono text-xs text-accent-secondary hover:text-accent-secondary/80 transition-colors duration-150"
        >
          View all jobs &rarr;
        </Link>
      </div>

      {/* Job list */}
      {loading ? (
        <DashboardJobLoadingDemo />
      ) : recentJobs.length === 0 ? (
        <div className="bg-bg-surface border border-border-dim rounded-sm p-8 text-center">
          <p className="font-mono text-sm text-text-dim mb-1">No jobs yet</p>
          <p className="font-body text-xs text-text-dim">
            Upload a video and create a job to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recentJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group bg-bg-surface border border-border-dim rounded-sm p-3.5 px-4.5
                transition-all duration-200 hover:border-border-bright"
            >
              <div className="grid grid-cols-[1fr_minmax(140px,200px)_auto] gap-4 items-center">
                {/* Job info */}
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm text-text-primary truncate">
                    {job.videos?.filename || 'Unknown video'}
                  </p>
                  <p className="font-mono text-[0.6875rem] text-text-dim truncate">
                    {job.query}
                  </p>
                </div>

                {/* Fused bar */}
                <FusedBar status={job.status} />

                {/* Time */}
                <p className="font-mono text-[0.6875rem] text-text-dim text-right whitespace-nowrap">
                  {formatTimeAgo(job.created_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
