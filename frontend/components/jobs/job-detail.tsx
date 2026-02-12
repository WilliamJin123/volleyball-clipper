'use client'

import Link from 'next/link'
import { useJob } from '@/lib/hooks'
import { FusedBar } from '@/components/ui/fused-bar'
import { NetDivider } from '@/components/ui/net-divider'
import { ClipCard } from '@/components/clips/clip-card'

interface JobDetailProps {
  jobId: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return formatDate(dateString)
}

export function JobDetail({ jobId }: JobDetailProps) {
  const { job, loading, error } = useJob(jobId)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-bg-surface border border-border-dim rounded-sm animate-pulse" />
        <div className="h-4 w-48 bg-bg-surface border border-border-dim rounded-sm animate-pulse" />
        <div className="h-10 bg-bg-surface border border-border-dim rounded-sm animate-pulse" />
        <div className="h-32 bg-bg-surface border border-border-dim rounded-sm animate-pulse" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="bg-bg-surface border border-accent-error/20 rounded-sm px-6 py-8 text-center">
        <p className="font-mono text-xs text-accent-error mb-3">
          {error || 'Job not found'}
        </p>
        <Link
          href="/jobs"
          className="font-mono text-xs text-text-dim hover:text-text-secondary transition-colors"
        >
          Back to Jobs
        </Link>
      </div>
    )
  }

  const isProcessing = job.status === 'pending' || job.status === 'processing'
  const clipCount = job.clips?.length || 0

  return (
    <div>
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors mb-6"
      >
        <span>&larr;</span>
        <span>Back to Jobs</span>
      </Link>

      {/* Job Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1 mr-4">
          <h1 className="font-display text-xl font-bold text-text-primary truncate mb-1">
            {job.videos?.filename || 'Untitled Job'}
          </h1>
          <p className="font-mono text-xs text-text-dim">
            {relativeTime(job.created_at)} -- {formatDate(job.created_at)}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="max-w-md mb-6">
        <FusedBar status={job.status} clipCount={clipCount} />
      </div>

      {/* Job Metadata */}
      <div className="bg-bg-surface border border-border-dim rounded-sm p-5 mb-6">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <span className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-1">
              Query
            </span>
            <p className="font-mono text-[0.8125rem] text-text-secondary">
              &quot;{job.query}&quot;
            </p>
          </div>
          <div>
            <span className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-1">
              Video
            </span>
            <p className="font-mono text-[0.8125rem] text-text-secondary truncate">
              {job.videos?.filename || 'Unknown'}
            </p>
          </div>
          <div>
            <span className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-1">
              Padding
            </span>
            <p className="font-mono text-[0.8125rem] text-text-secondary">
              {job.padding}s
            </p>
          </div>
          <div>
            <span className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-1">
              Clips Generated
            </span>
            <p className="font-mono text-[0.8125rem] text-text-secondary">
              {clipCount}
            </p>
          </div>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-bg-surface border border-accent-primary/20 rounded-sm px-5 py-6 text-center">
          <p className="font-mono text-xs text-accent-primary pulse-text mb-1">
            {job.status === 'pending'
              ? 'QUEUED -- AWAITING PROCESSING...'
              : 'ANALYZING VIDEO AND GENERATING CLIPS...'}
          </p>
          <p className="font-mono text-[0.625rem] text-text-dim">
            This page updates automatically via realtime.
          </p>
        </div>
      )}

      {/* Failed State */}
      {job.status === 'failed' && (
        <div className="bg-bg-surface border border-accent-error/20 rounded-sm px-5 py-6 text-center">
          <p className="font-mono text-xs text-accent-error mb-3">
            ERR: Processing failed. There was an error analyzing your video.
          </p>
          <Link
            href="/jobs/new"
            className="inline-block px-4 py-2 bg-accent-primary text-bg-void font-mono text-xs font-medium
              rounded-sm hover:bg-accent-primary/90 transition-colors"
          >
            Try Again
          </Link>
        </div>
      )}

      {/* Completed - Clips Section */}
      {job.status === 'completed' && (
        <div>
          <NetDivider className="!my-6" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[1.125rem] font-semibold text-text-primary">
              Generated Clips
            </h2>
            <span className="font-mono text-xs text-text-dim">
              {clipCount} clip{clipCount !== 1 ? 's' : ''}
            </span>
          </div>

          {clipCount > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.clips.map((clip, index) => (
                <ClipCard key={clip.id} clip={clip} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="bg-bg-surface border border-border-dim rounded-sm px-5 py-8 text-center">
              <p className="font-mono text-xs text-text-dim">
                No matching moments found for your query.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
