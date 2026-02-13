'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useClips } from '@/lib/hooks'
import type { Clip, Job } from '@/lib/types/database'

interface ClipWithJob extends Clip {
  jobs?: Job
}

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

function formatDuration(startTime: number, endTime: number): string {
  const duration = Math.round(endTime - startTime)
  const mins = Math.floor(duration / 60)
  const secs = duration % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ClipCardSkeleton() {
  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm overflow-hidden">
      <div className="aspect-video bg-bg-raised animate-pulse" />
      <div className="px-3 py-2.5">
        <div className="h-4 w-3/4 bg-bg-raised rounded-sm mb-1.5 animate-pulse" />
        <div className="h-3 w-1/3 bg-bg-raised rounded-sm animate-pulse" />
      </div>
    </div>
  )
}

function InlineClipCard({ clip }: { clip: ClipWithJob }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleClick = () => {
    if (!clip.public_url) return
    if (!playing) setPlaying(true)
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) videoRef.current.pause()
    setPlaying(false)
  }

  return (
    <div
      onClick={handleClick}
      className={`group bg-bg-surface border rounded-sm overflow-hidden
        transition-all duration-200 hover:-translate-y-0.5 cursor-pointer
        ${playing ? 'border-accent-primary/50' : 'border-border-dim hover:border-border-bright hover:shadow-lg hover:shadow-black/20'}`}
      style={playing ? { boxShadow: '0 0 20px var(--accent-primary-glow-10)' } : undefined}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-bg-raised">
        {playing && clip.public_url ? (
          <>
            <video
              ref={videoRef}
              src={clip.public_url}
              className="w-full h-full"
              controls
              autoPlay
              preload="auto"
              onEnded={() => setPlaying(false)}
            />
            <button
              onClick={handleStop}
              className="absolute top-2 right-2 z-10 font-mono text-[0.625rem] text-text-dim hover:text-accent-primary transition-colors duration-150 cursor-pointer px-1.5 py-0.5 rounded-sm bg-bg-void/75 hover:bg-bg-void/90"
            >
              [X]
            </button>
          </>
        ) : (
          <>
            {clip.thumbnail_url ? (
              <img
                src={clip.thumbnail_url}
                alt={`Clip ${clip.id.slice(0, 8)}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : clip.public_url ? (
              <video
                src={clip.public_url}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-mono text-xs text-text-dim">NO PREVIEW</span>
              </div>
            )}

            {/* Play overlay */}
            {clip.public_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-bg-void/30">
                <span className="font-mono text-xs text-text-primary bg-bg-void/75 px-2 py-1 rounded-sm">
                  PLAY
                </span>
              </div>
            )}

            {/* Duration badge */}
            <span
              className="absolute bottom-1.5 right-1.5 font-mono text-[0.625rem] text-text-primary
                px-1.5 py-0.5 rounded-sm"
              style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            >
              {formatDuration(clip.start_time, clip.end_time)}
            </span>
          </>
        )}
      </div>

      {/* Mini net divider pattern */}
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-border-dim) 0px, var(--color-border-dim) 4px, transparent 4px, transparent 8px)',
        }}
      />

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="font-display font-bold text-[0.9375rem] text-text-primary truncate">
          Clip {clip.id.slice(0, 8)}
        </p>
        <p className="font-mono text-[0.6875rem] text-text-dim">
          {formatTimeAgo(clip.created_at)}
        </p>
      </div>
    </div>
  )
}

export function VideoList() {
  const { clips, loading, error } = useClips()

  const recentClips = clips.slice(0, 4)

  if (error) {
    return (
      <div className="bg-bg-surface border border-accent-error/20 rounded-sm p-6 text-center">
        <p className="font-mono text-sm text-accent-error">{error}</p>
      </div>
    )
  }

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-[1.125rem] text-text-primary">
          Recent Clips
        </h2>
        <Link
          href="/clips"
          className="font-mono text-xs text-accent-secondary hover:text-accent-secondary/80 transition-colors duration-150"
        >
          View all clips &rarr;
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          <ClipCardSkeleton />
          <ClipCardSkeleton />
          <ClipCardSkeleton />
          <ClipCardSkeleton />
        </div>
      ) : recentClips.length === 0 ? (
        <div className="bg-bg-surface border border-border-dim rounded-sm p-8 text-center">
          <p className="font-mono text-sm text-text-dim mb-1">No clips yet</p>
          <p className="font-body text-xs text-text-dim">
            Create a job to generate clips from your videos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {recentClips.map((clip) => (
            <InlineClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </section>
  )
}
