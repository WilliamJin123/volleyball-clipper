'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title?: string
  subtitle?: string
  metadata?: { label: string; value: string }[]
  onVideoLoaded?: (duration: number) => void
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  subtitle,
  metadata,
  onVideoLoaded,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  // Resolve portal target on mount (client-side only)
  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isOpen])

  if (!isOpen || !portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          background: 'rgba(6, 6, 10, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'modal-fade-in 0.3s var(--ease-slam) both',
        }}
      />

      {/* Scroll container */}
      <div className="min-h-full flex items-center justify-center p-6">
        {/* Modal content */}
        <div
          className="relative w-full max-w-4xl bg-bg-surface border border-border-dim rounded-sm overflow-hidden"
          style={{
            animation: 'modal-slide-up 0.4s var(--ease-slam) both',
            animationDelay: '50ms',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 font-mono text-xs text-text-dim hover:text-accent-primary transition-colors duration-150 cursor-pointer px-2 py-1 rounded-sm hover:bg-white/[0.04]"
          aria-label="Close"
        >
          [ESC]
        </button>

        {/* Video player */}
        <div className="aspect-video bg-bg-void/80">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
            preload="auto"
            onLoadedMetadata={() => {
              if (videoRef.current && onVideoLoaded) {
                onVideoLoaded(videoRef.current.duration)
              }
            }}
          />
        </div>

        {/* Net divider */}
        <div className="font-mono text-[0.5rem] text-text-dim/30 text-center py-1 select-none">
          {'───┼─────┼─────┼─────┼─────┼─────┼─────┼───'}
        </div>

        {/* Metadata */}
        {(title || metadata) && (
          <div className="px-5 py-4">
            {title && (
              <h3 className="font-display text-base font-semibold text-text-primary mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-mono text-xs text-text-dim mb-3">{subtitle}</p>
            )}
            {metadata && metadata.length > 0 && (
              <div className="flex gap-6">
                {metadata.map((item) => (
                  <div key={item.label}>
                    <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest block mb-0.5">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs text-text-secondary">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>,
    portalTarget
  )
}
