'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDeleteSideData {
  label: string
  items: string[]
  isDestructive?: boolean
}

interface ConfirmDeleteProps {
  /** Action label shown in the header, e.g. 'DELETE VIDEO: "Match Highlights"' */
  actionLabel: string
  /** Data shown on the left side (current state) */
  currentState: ConfirmDeleteSideData
  /** Data shown on the right side (after delete) */
  afterDelete: ConfirmDeleteSideData
  /** Called when the user confirms deletion */
  onConfirm: () => void | Promise<void>
  /** Called when the user cancels */
  onCancel: () => void
  /** Whether the delete action is in progress */
  isDeleting?: boolean
}

export function ConfirmDelete({
  actionLabel,
  currentState,
  afterDelete,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteProps) {
  const [confirmed, setConfirmed] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel, isDeleting])

  const handleConfirm = useCallback(async () => {
    if (confirmed || isDeleting) return
    setConfirmed(true)
    await onConfirm()
  }, [confirmed, isDeleting, onConfirm])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm"
        onClick={() => { if (!isDeleting) onCancel() }}
      />

      {/* Modal */}
      <div className="relative max-w-[500px] w-[calc(100%-2rem)] border border-accent-error/25 rounded-sm bg-bg-surface overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div
          className="flex items-center px-4 py-2.5"
          style={{
            background: 'var(--accent-error-glow-06)',
            borderBottom: '1px solid var(--accent-error-glow-15)',
          }}
        >
          <span className="font-mono text-xs text-text-secondary">
            {actionLabel}
          </span>
        </div>

        {/* Body - split view */}
        <div className="flex items-stretch p-4 gap-0">
          {/* Current state */}
          <div className="flex-1 px-3">
            <div className="font-mono text-[0.5625rem] text-text-dim tracking-[0.1em] uppercase mb-2">
              {currentState.label}
            </div>
            <div className="font-mono text-xs text-text-secondary leading-[1.8]">
              {currentState.items.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
            </div>
          </div>

          {/* Divider with arrow */}
          <div className="w-px bg-border-dim flex items-center justify-center relative">
            <div className="absolute font-mono text-sm text-accent-error bg-bg-surface py-1">
              &rarr;
            </div>
          </div>

          {/* After delete */}
          <div className="flex-1 px-3">
            <div
              className="font-mono text-[0.5625rem] tracking-[0.1em] uppercase mb-2"
              style={{ color: 'var(--color-accent-error)' }}
            >
              {afterDelete.label}
            </div>
            <div
              className="font-mono text-xs leading-[1.8]"
              style={{ color: 'var(--color-accent-error)', opacity: 0.7 }}
            >
              {afterDelete.items.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-dim">
          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-sm
              bg-transparent text-text-secondary border border-border-dim
              font-mono text-xs font-medium
              transition-all duration-150
              hover:text-text-primary hover:border-border-bright
              disabled:opacity-40 disabled:cursor-not-allowed
              cursor-pointer"
          >
            Cancel
          </button>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={isDeleting || confirmed}
            className={`
              px-4 py-2 rounded-sm
              font-mono text-xs font-medium
              transition-all duration-200
              ${
                !isDeleting && !confirmed
                  ? 'bg-accent-error/10 text-accent-error border border-accent-error/40 hover:bg-accent-error/20 hover:border-accent-error/60 cursor-pointer'
                  : 'bg-transparent text-accent-error/30 border border-accent-error/15 cursor-not-allowed opacity-30'
              }
            `}
          >
            {isDeleting ? 'Deleting...' : confirmed ? 'Deleted' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
