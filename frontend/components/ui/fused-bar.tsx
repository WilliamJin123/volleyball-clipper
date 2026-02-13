'use client'

import type { JobStatus } from '@/lib/types/database'

interface FusedBarProps {
  status: JobStatus
  clipCount?: number
  className?: string
}

const tagStyles: Record<string, string> = {
  completed: 'text-accent-success',
  processing: 'text-accent-primary',
  pending: 'text-text-dim',
  failed: 'text-accent-error',
}

const tagLabels: Record<string, string> = {
  completed: '[COMPLETE]',
  processing: '[SLICING]',
  pending: '[QUEUED]',
  failed: '[ERROR]',
}

export function FusedBar({ status, clipCount, className = '' }: FusedBarProps) {
  const isActive = status === 'processing'
  const isComplete = status === 'completed'
  const isFailed = status === 'failed'
  const isPending = status === 'pending'

  return (
    <div
      className={`
        flex items-stretch h-8 bg-bg-raised rounded-sm overflow-hidden relative
        border border-border-dim
        ${isComplete ? 'border-accent-success/15' : ''}
        ${isFailed ? 'border-accent-error/20' : ''}
        ${className}
      `}
    >
      {/* Animated stripe overlay for active states */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-06) 6px, var(--accent-primary-glow-06) 12px)`,
            backgroundSize: '24px 24px',
            animation: 'upload-stripe 3s linear infinite',
          }}
        />
      )}
      {isFailed && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-error-glow-06) 6px, var(--accent-error-glow-06) 12px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Tag */}
      <div
        className={`flex items-center px-2 font-mono text-[0.6875rem] font-medium tracking-wide whitespace-nowrap border-r border-border-dim relative z-[2] ${tagStyles[status] || tagStyles.pending}`}
      >
        {tagLabels[status] || '[UNKNOWN]'}
      </div>

      {/* Data */}
      <div className="flex-1 flex items-center px-2.5 font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis relative z-[2]">
        {isComplete && clipCount !== undefined && (
          <span className="text-accent-success">
            CLIPS:{clipCount}
          </span>
        )}
        {isActive && (
          <span className="text-accent-primary pulse-text">PROCESSING...</span>
        )}
        {isPending && (
          <span className="text-text-dim pulse-text">AWAITING DATA...</span>
        )}
        {isFailed && (
          <span className="text-accent-error">ERR:TIMEOUT</span>
        )}
      </div>
    </div>
  )
}
