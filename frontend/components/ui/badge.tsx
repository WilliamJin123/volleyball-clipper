interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

// Predefined status badges
export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    uploading: { label: 'Uploading', variant: 'info' },
    processing: { label: 'Processing', variant: 'warning' },
    ready: { label: 'Ready', variant: 'success' },
    completed: { label: 'Completed', variant: 'success' },
    pending: { label: 'Pending', variant: 'default' },
    failed: { label: 'Failed', variant: 'error' },
  }

  const config = statusMap[status] || { label: status, variant: 'default' as const }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
