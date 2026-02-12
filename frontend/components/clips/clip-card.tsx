'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/ui/status-badge'
import { VideoPlayerModal } from '@/components/ui/video-player-modal'
import type { Clip, Job } from '@/lib/types/database'

interface ClipWithOptionalJob extends Clip {
  jobs?: Job
}

interface ClipCardProps {
  clip: ClipWithOptionalJob
  index: number
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function ClipCard({ clip, index }: ClipCardProps) {
  const [imgError, setImgError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const duration = clip.end_time - clip.start_time
  const isProcessing = clip.jobs?.status === 'processing'
  const jobStatus = clip.jobs?.status || 'completed'
  const title = clip.jobs?.query
    ? `${clip.jobs.query} #${index}`
    : `Clip #${index}`

  return (
    <>
      <div
        onClick={() => {
          if (!isProcessing && clip.public_url) setModalOpen(true)
        }}
        className={`
          bg-bg-surface border rounded-sm overflow-hidden cursor-pointer
          transition-all duration-200
          ${
            isProcessing
              ? 'border-accent-primary/30'
              : 'border-border-dim hover:border-border-bright'
          }
        `}
        style={
          isProcessing
            ? { animation: 'pulse-border 2s infinite' }
            : undefined
        }
        onMouseEnter={(e) => {
          if (!isProcessing) {
            e.currentTarget.style.boxShadow =
              '0 0 20px rgba(255, 90, 31, 0.08), 0 0 40px rgba(255, 90, 31, 0.04)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = ''
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-bg-raised flex items-center justify-center">
          {clip.thumbnail_url && !imgError ? (
            <img
              src={clip.thumbnail_url}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : clip.public_url && !videoError ? (
            <video
              src={clip.public_url}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              onError={() => setVideoError(true)}
            />
          ) : (
            <span className="font-mono text-sm text-text-dim/50">16:9</span>
          )}

          {/* Duration badge */}
          <span className="absolute bottom-2 right-2 font-mono text-[0.7rem] text-text-primary bg-bg-void/75 px-1.5 py-0.5 rounded-sm">
            {formatDuration(duration)}
          </span>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-void/50">
              <span
                className="font-mono text-xs text-accent-primary"
                style={{ animation: 'blink 1.5s ease-in-out infinite' }}
              >
                PROCESSING...
              </span>
            </div>
          )}
        </div>

        {/* Card net divider */}
        <div className="font-mono text-[0.5rem] text-text-dim/30 text-center py-1 select-none">
          {'┼─────┼─────┼─────┼─────┼'}
        </div>

        {/* Meta */}
        <div className="px-4 py-3.5">
          <h3 className="font-display text-[0.9375rem] font-semibold mb-2 truncate">
            {title}
          </h3>
          <div className="flex justify-between items-center">
            <span className="font-mono text-[0.6875rem] text-text-dim">
              {formatTimestamp(clip.start_time)}
            </span>
            {isProcessing && <StatusBadge status={jobStatus} />}
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        videoUrl={clip.public_url}
        title={title}
        subtitle={clip.jobs?.query ? `Query: "${clip.jobs.query}"` : undefined}
        metadata={[
          { label: 'Start', value: formatTimestamp(clip.start_time) },
          { label: 'End', value: formatTimestamp(clip.end_time) },
          { label: 'Duration', value: formatDuration(duration) },
        ]}
      />
    </>
  )
}
