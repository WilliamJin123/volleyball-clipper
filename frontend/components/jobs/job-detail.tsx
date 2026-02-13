'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useJob } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { FusedBar } from '@/components/ui/fused-bar'
import { NetDivider } from '@/components/ui/net-divider'
import { ConfirmDelete } from '@/components/ui/confirm-delete'
import { ClipCard } from '@/components/clips/clip-card'
import { StreamingTerminal } from '@/components/ui/streaming-terminal'
import { JobDetailLoadingDemo } from '@/components/jobs/job-loading-demo'
import type { TerminalLine } from '@/components/ui/streaming-terminal'

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

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2)
  return `${String(mins).padStart(2, '0')}:${secs.padStart(5, '0')}`
}

/** Build streaming terminal lines from current job state */
function buildProcessingLines(
  job: { status: string; query: string; clips?: { start_time: number; end_time: number }[]; videos?: { filename?: string } | null },
): TerminalLine[] {
  const lines: TerminalLine[] = []
  const filename = job.videos?.filename || 'video.mp4'
  const clips = job.clips || []

  if (job.status === 'pending') {
    lines.push({
      prefix: '[QUEUE]',
      prefixClass: 'dim',
      text: `Job queued. Awaiting processing slot...`,
      textClass: 'val',
    })
    return lines
  }

  // Processing or completed/failed -- show the full log
  lines.push({
    prefix: '[INDEX]',
    prefixClass: 'op',
    text: `Analyzing ${filename} with TwelveLabs...`,
    textClass: 'val',
  })

  lines.push({
    prefix: '[QUERY]',
    prefixClass: 'op',
    text: `"${job.query}" `,
    textClass: 'val',
  })

  if (job.status === 'processing' && clips.length === 0) {
    lines.push({
      prefix: '[SCAN]',
      prefixClass: 'op',
      text: 'Searching for matching moments...',
      textClass: 'val',
    })
    return lines
  }

  if (clips.length > 0) {
    lines.push({
      prefix: '[QUERY]',
      prefixClass: 'op',
      text: `Results: `,
      textClass: 'val',
      suffix: `${clips.length} moment${clips.length !== 1 ? 's' : ''} detected`,
      suffixClass: 'hot',
    })
  }

  // Add a line for each clip
  clips.forEach((clip, idx) => {
    lines.push({
      prefix: '[SLICE]',
      prefixClass: 'op',
      text: `Generating clip ${idx + 1}/${clips.length}... `,
      textClass: 'val',
      suffix: `${formatTimestamp(clip.start_time)} \u2192 ${formatTimestamp(clip.end_time)}`,
      suffixClass: 'primary',
    })
    lines.push({
      prefix: '[UPLOAD]',
      prefixClass: 'op',
      text: `clip_${String(idx + 1).padStart(3, '0')}.mp4 \u2192 `,
      textClass: 'val',
      suffix: 'R2 \u2713',
      suffixClass: 'ok',
    })
  })

  if (job.status === 'completed') {
    lines.push({
      prefix: '[DONE]',
      prefixClass: 'ok',
      text: 'Job complete. ',
      textClass: 'val',
      suffix: `${clips.length} clip${clips.length !== 1 ? 's' : ''} generated`,
      suffixClass: 'ok',
    })
  }

  if (job.status === 'failed') {
    lines.push({
      prefix: '[ERR]',
      prefixClass: 'err',
      text: 'Processing failed. An error occurred during analysis.',
      textClass: 'val',
    })
  }

  return lines
}

/** Collapsible terminal log for completed/failed jobs */
function CompletedTerminalLog({ lines }: { lines: TerminalLine[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 font-mono text-[0.625rem] text-text-dim hover:text-text-secondary transition-colors cursor-pointer mb-2"
      >
        <span className="uppercase tracking-widest">Processing Log</span>
        <span>{expanded ? '[\u2212]' : '[+]'}</span>
      </button>
      {expanded && (
        <StreamingTerminal
          lines={lines}
          active={false}
          skipAnimation={true}
          maxHeight="260px"
        />
      )}
    </div>
  )
}

export function JobDetail({ jobId }: JobDetailProps) {
  const { job, loading, error } = useJob(jobId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [terminalSkipped, setTerminalSkipped] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Build terminal lines from current job state
  const terminalLines = useMemo(() => {
    if (!job) return []
    return buildProcessingLines(job)
  }, [job])

  // Determine if the terminal should be active (still processing)
  const terminalActive = job?.status === 'pending' || job?.status === 'processing'

  // Track whether the job was ever in a processing state for showing the terminal on completed/failed
  const wasProcessingRef = useRef(false)
  useEffect(() => {
    if (terminalActive) {
      wasProcessingRef.current = true
    }
  }, [terminalActive])

  const handleDeleteJob = useCallback(async () => {
    if (!job) return
    setIsDeleting(true)
    try {
      // Delete clips first (foreign key constraint)
      const { error: clipsError } = await supabase
        .from('clips')
        .delete()
        .eq('job_id', job.id)
      if (clipsError) throw clipsError

      // Delete the job
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id)
      if (jobError) throw jobError

      // Navigate back to jobs list
      router.push('/jobs')
    } catch (err) {
      console.error('Failed to delete job:', err)
      setIsDeleting(false)
    }
  }, [job, supabase, router])

  if (loading) {
    return <JobDetailLoadingDemo />
  }

  if (error || !job) {
    return (
      <div className="bg-bg-surface border border-accent-error/20 rounded-sm px-6 py-8 text-center">
        <p className="font-mono text-xs text-accent-error mb-3">
          {error || 'Job not found'}
        </p>
        <button
          onClick={() => router.back()}
          className="font-mono text-xs text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; Back
        </button>
      </div>
    )
  }

  const isProcessing = job.status === 'pending' || job.status === 'processing'
  const clipCount = job.clips?.length || 0

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 font-mono text-xs text-text-dim
          hover:text-text-secondary transition-all duration-150 mb-6 group cursor-pointer
          px-2.5 py-1.5 -ml-2.5 rounded-sm hover:bg-bg-surface"
      >
        <span className="transition-transform duration-150 group-hover:-translate-x-0.5">&larr;</span>
        <span>Back</span>
      </button>

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
        {/* Delete button - only show for completed or failed jobs, not while processing */}
        {!isProcessing && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-shrink-0 px-3.5 py-2 rounded-sm
              bg-transparent text-accent-error/70 border border-accent-error/20
              font-mono text-xs font-medium
              transition-all duration-150
              hover:text-accent-error hover:border-accent-error/40 hover:bg-accent-error/5
              cursor-pointer"
          >
            Delete Job
          </button>
        )}
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

      {/* Confirm Delete */}
      {showDeleteConfirm && (
        <div className="mb-6">
          <ConfirmDelete
            actionLabel={`DELETE JOB: "${job.videos?.filename || 'Untitled Job'}"`}
            currentState={{
              label: 'CURRENT STATE',
              items: [
                `${clipCount} clip${clipCount !== 1 ? 's' : ''} generated`,
                `Query: "${job.query}"`,
                `Status: ${job.status}`,
              ],
            }}
            afterDelete={{
              label: 'AFTER DELETE',
              items: [
                `${clipCount} clip${clipCount !== 1 ? 's' : ''} removed`,
                'R2 files deleted',
                'Irreversible',
              ],
            }}
            countdownSeconds={5}
            onConfirm={handleDeleteJob}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={isDeleting}
          />
        </div>
      )}

      {/* Processing State -- Streaming Terminal Log */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest">
              Processing Log
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.625rem] text-text-dim">
                Live
              </span>
              <span className="pulse-dot" />
            </div>
          </div>
          <StreamingTerminal
            lines={terminalLines}
            active={terminalActive}
            skipAnimation={terminalSkipped}
            maxHeight="260px"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="font-mono text-[0.625rem] text-text-dim">
              Updates automatically via realtime.
            </p>
            {!terminalSkipped && (
              <button
                onClick={() => setTerminalSkipped(true)}
                className="font-mono text-[0.625rem] text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
              >
                [SKIP]
              </button>
            )}
          </div>
        </div>
      )}

      {/* Failed State */}
      {job.status === 'failed' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest">
              Processing Log
            </span>
          </div>
          <StreamingTerminal
            lines={terminalLines}
            active={false}
            skipAnimation={true}
            maxHeight="260px"
          />
          <div className="mt-4 text-center">
            <Link
              href="/jobs/new"
              className="inline-block px-4 py-2 bg-accent-primary text-bg-void font-mono text-xs font-medium
                rounded-sm hover:bg-accent-primary/90 transition-colors"
            >
              Try Again
            </Link>
          </div>
        </div>
      )}

      {/* Completed - show collapsed processing log */}
      {job.status === 'completed' && clipCount > 0 && (
        <CompletedTerminalLog lines={terminalLines} />
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
