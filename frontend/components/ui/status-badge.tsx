interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  ready: 'text-accent-success bg-accent-success/10 border border-accent-success/20',
  indexed: 'text-accent-success bg-accent-success/10 border border-accent-success/20',
  complete: 'text-accent-success bg-accent-success/10 border border-accent-success/20',
  completed: 'text-accent-success bg-accent-success/10 border border-accent-success/20',
  processing: 'text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20',
  indexing: 'text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20',
  uploading: 'text-accent-primary bg-accent-primary/10 border border-accent-primary/20',
  slicing: 'text-accent-primary bg-accent-primary/10 border border-accent-primary/20',
  pending: 'text-text-dim bg-text-dim/10 border border-text-dim/20',
  queued: 'text-text-dim bg-text-dim/10 border border-text-dim/20',
  failed: 'text-accent-error bg-accent-error/10 border border-accent-error/20',
  error: 'text-accent-error bg-accent-error/10 border border-accent-error/20',
}

const statusLabels: Record<string, string> = {
  ready: '[INDEXED]',
  indexed: '[INDEXED]',
  complete: '[COMPLETE]',
  completed: '[COMPLETE]',
  processing: '[INDEXING]',
  indexing: '[INDEXING]',
  uploading: '[UPLOADING]',
  slicing: '[SLICING]',
  pending: '[QUEUED]',
  queued: '[QUEUED]',
  failed: '[FAILED]',
  error: '[ERROR]',
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.pending
  const label = statusLabels[status] || `[${status.toUpperCase()}]`
  const showPulse = status === 'processing' || status === 'indexing'

  return (
    <span
      className={`font-mono text-[0.625rem] font-semibold tracking-wide px-2 py-0.5 rounded-sm whitespace-nowrap inline-flex items-center gap-1.5 ${style} ${className}`}
    >
      {showPulse && <span className="pulse-dot" />}
      {label}
    </span>
  )
}
