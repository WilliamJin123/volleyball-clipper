'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Header } from '@/components/layout'
import { VideoUploader, type UploadState } from '@/components/upload/video-uploader'
import { NetDivider } from '@/components/ui/net-divider'
import { StatusBadge } from '@/components/ui/status-badge'
import { VideoPlayerModal } from '@/components/ui/video-player-modal'
import { useVideos } from '@/lib/hooks/use-videos'
import type { Video } from '@/lib/types/database'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0)} ${units[i]}`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Map of currently-uploading videos: filename -> upload progress */
type ActiveUploads = Map<string, UploadState>

function VideoRow({
  video,
  activeUpload,
  onPlay,
  duration,
}: {
  video: Video
  activeUpload?: UploadState
  onPlay: () => void
  duration?: number
}) {
  const isUploading = activeUpload?.status === 'uploading'
  const isProcessing = video.status === 'processing'
  const isFailed = video.status === 'failed'
  const isReady = video.status === 'ready'

  // Determine display status - prefer active upload state over DB status
  const displayStatus = isUploading ? 'uploading' : video.status

  return (
    <div
      onClick={() => {
        if (isReady) onPlay()
      }}
      className={`
        grid items-center gap-4
        bg-bg-surface border border-border-dim rounded-sm px-4 py-2.5
        transition-all duration-200
        hover:border-border-bright hover:shadow-[0_2px_16px_rgba(0,0,0,0.2)]
        ${isReady ? 'cursor-pointer' : ''}
        ${isUploading ? 'uploading-stripe' : ''}
      `}
      style={{
        gridTemplateColumns: '80px 1fr 140px 80px 60px',
      }}
    >
      {/* Thumbnail */}
      <div className="w-[80px] h-[45px] bg-bg-raised border border-border-dim rounded-sm flex items-center justify-center shrink-0">
        <span className="font-mono text-[0.625rem] text-text-dim/50">16:9</span>
      </div>

      {/* Video info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="font-display font-bold text-sm tracking-tight truncate">
          {video.filename}
        </div>
        <div className="font-mono text-xs text-text-dim flex items-center gap-1.5">
          <span>{formatRelativeDate(video.created_at)}</span>
          {duration != null && (
            <>
              <span className="text-text-dim/40">&middot;</span>
              <span>{formatVideoDuration(duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Status column */}
      <div className="flex flex-col items-start gap-1">
        <StatusBadge status={displayStatus} />

        {/* Upload progress bar */}
        {isUploading && activeUpload && (
          <>
            <span
              className="font-mono text-[0.6875rem]"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              {activeUpload.progress}%
            </span>
            <div className="w-[100px] h-[3px] bg-bg-raised rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm bg-accent-primary transition-[width] duration-300"
                style={{
                  width: `${activeUpload.progress}%`,
                  boxShadow: '0 0 8px var(--accent-primary-glow)',
                }}
              />
            </div>
          </>
        )}

        {/* Indexing progress bar (processing status) */}
        {isProcessing && (
          <>
            <div className="w-[100px] h-[3px] bg-bg-raised rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm bg-accent-secondary animate-pulse"
                style={{
                  width: '60%',
                  boxShadow: '0 0 8px var(--accent-secondary-glow)',
                }}
              />
            </div>
          </>
        )}

        {/* Failed error text */}
        {isFailed && (
          <span className="font-mono text-[0.6875rem] text-accent-error/60">
            Processing failed
          </span>
        )}
      </div>

      {/* Size */}
      <div className="font-mono text-xs text-text-secondary text-right">
        {activeUpload?.fileSize
          ? formatFileSize(activeUpload.fileSize)
          : '--'}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          className="font-mono text-base text-text-dim px-2 py-1 rounded-sm transition-colors duration-150 hover:text-text-primary hover:bg-white/[0.04] tracking-[2px] cursor-pointer"
          aria-label="Video actions"
          onClick={(e) => e.stopPropagation()}
        >
          &middot;&middot;&middot;
        </button>
      </div>
    </div>
  )
}

function StorageSummary({ videos }: { videos: Video[] }) {
  const totalVideos = videos.length
  const estimatedGB = totalVideos * 0.8
  const maxGB = 10
  const pct = Math.min((estimatedGB / maxGB) * 100, 100)

  return (
    <div className="mt-8 py-4">
      <div className="font-mono text-[0.6875rem] font-medium text-text-dim tracking-[0.06em] uppercase mb-2">
        STORAGE: {estimatedGB.toFixed(2)} GB / {maxGB} GB
      </div>
      <div className="w-full h-1 bg-bg-raised rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm bg-accent-secondary transition-[width] duration-600"
          style={{
            width: `${pct}%`,
            boxShadow: '0 0 12px var(--accent-secondary-glow)',
            transition: 'width 0.6s var(--ease-slam)',
          }}
        />
      </div>
    </div>
  )
}

export default function UploadPage() {
  const { videos, loading, refetch } = useVideos()
  const [activeUploads, setActiveUploads] = useState<ActiveUploads>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [videoPlayUrl, setVideoPlayUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [videoDurations, setVideoDurations] = useState<Map<string, number>>(new Map())

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos
    const q = searchQuery.toLowerCase()
    return videos.filter((video) => {
      const filename = video.filename.toLowerCase()
      const status = video.status.toLowerCase()
      return filename.includes(q) || status.includes(q)
    })
  }, [videos, searchQuery])

  const handleUploadStateChange = useCallback(
    (state: UploadState) => {
      if (state.filename) {
        setActiveUploads((prev) => {
          const next = new Map(prev)
          if (state.status === 'idle' || state.status === 'complete') {
            next.delete(state.filename!)
            if (state.status === 'complete') {
              refetch()
            }
          } else {
            next.set(state.filename!, state)
          }
          return next
        })
      }
    },
    [refetch]
  )

  const handlePlayVideo = useCallback(async (video: Video) => {
    setSelectedVideo(video)
    setLoadingUrl(true)
    try {
      const res = await fetch('/api/video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Path: video.r2_path }),
      })
      const data = await res.json()
      if (data.videoUrl) {
        setVideoPlayUrl(data.videoUrl)
      }
    } catch (err) {
      console.error('Failed to get video URL:', err)
    } finally {
      setLoadingUrl(false)
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedVideo(null)
    setVideoPlayUrl(null)
  }, [])

  // Read duration from the modal video when metadata loads
  const handleVideoDuration = useCallback((videoId: string, duration: number) => {
    if (duration && isFinite(duration)) {
      setVideoDurations((prev) => {
        const next = new Map(prev)
        next.set(videoId, duration)
        return next
      })
    }
  }, [])

  // Probe durations for all ready videos in the background
  const probedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const readyVideos = videos.filter(
      (v) => v.status === 'ready' && !probedRef.current.has(v.id)
    )
    if (readyVideos.length === 0) return

    readyVideos.forEach((video) => {
      probedRef.current.add(video.id)
      fetch('/api/video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Path: video.r2_path }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.videoUrl) return
          const probe = new Audio()
          probe.preload = 'metadata'
          probe.onloadedmetadata = () => {
            if (probe.duration && isFinite(probe.duration)) {
              setVideoDurations((prev) => {
                const next = new Map(prev)
                next.set(video.id, probe.duration)
                return next
              })
            }
          }
          probe.src = data.videoUrl
        })
        .catch(() => {})
    })
  }, [videos])

  return (
    <div className="min-h-screen bg-bg-void">
      <Header />

      <main className="relative z-1 max-w-[1200px] mx-auto px-6 py-8 pb-24">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 animate-in">
          <h1 className="font-display font-bold text-[1.5rem] tracking-tight">
            Videos
          </h1>
        </div>

        {/* Upload dropzone */}
        <div id="upload-dropzone" className="animate-in animate-delay-1">
          <VideoUploader onUploadStateChange={handleUploadStateChange} />
        </div>

        {/* Net divider */}
        <NetDivider className="animate-in animate-delay-2" />

        {/* Search bar */}
        {!loading && videos.length > 0 && (
          <div className="flex justify-between items-center mb-4 animate-in animate-delay-3">
            <span className="font-mono text-[0.8125rem] text-text-dim">
              {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
            </span>
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-mono text-xs px-3.5 py-1.5 rounded-sm border border-border-dim bg-bg-surface text-text-primary w-[200px] placeholder:text-text-dim outline-none transition-all duration-150 focus:border-border-bright"
              style={{ boxShadow: 'none' }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 90, 31, 0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        )}

        {/* Video list */}
        <div className="flex flex-col gap-1.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-4 bg-bg-surface border border-border-dim rounded-sm px-4 py-2.5 animate-pulse"
                style={{
                  gridTemplateColumns: '80px 1fr 140px 80px 60px',
                }}
              >
                <div className="w-[80px] h-[45px] bg-bg-raised rounded-sm" />
                <div className="space-y-2">
                  <div className="h-3 bg-bg-raised rounded-sm w-3/4" />
                  <div className="h-2 bg-bg-raised rounded-sm w-1/2" />
                </div>
                <div className="h-5 bg-bg-raised rounded-sm w-20" />
                <div className="h-3 bg-bg-raised rounded-sm w-12 ml-auto" />
                <div className="h-3 bg-bg-raised rounded-sm w-6 ml-auto" />
              </div>
            ))
          ) : videos.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-mono text-sm text-text-dim">
                No videos yet. Upload one to get started.
              </p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-xs text-text-dim">[NO MATCHES]</p>
              <p className="font-body text-text-secondary text-sm mt-1">
                No videos match your search.
              </p>
            </div>
          ) : (
            filteredVideos.map((video) => (
              <VideoRow
                key={video.id}
                video={video}
                activeUpload={activeUploads.get(video.filename)}
                onPlay={() => handlePlayVideo(video)}
                duration={videoDurations.get(video.id)}
              />
            ))
          )}
        </div>

        {/* Storage summary */}
        {!loading && videos.length > 0 && (
          <div className="animate-in animate-delay-9">
            <StorageSummary videos={videos} />
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={!!selectedVideo}
        onClose={handleCloseModal}
        videoUrl={videoPlayUrl || ''}
        title={selectedVideo?.filename || ''}
        subtitle={loadingUrl ? 'Loading video...' : undefined}
        metadata={selectedVideo ? [
          { label: 'Status', value: selectedVideo.status },
          { label: 'Uploaded', value: formatRelativeDate(selectedVideo.created_at) },
          ...(videoDurations.has(selectedVideo.id)
            ? [{ label: 'Duration', value: formatVideoDuration(videoDurations.get(selectedVideo.id)!) }]
            : []),
        ] : []}
        onVideoLoaded={(duration) => {
          if (selectedVideo) handleVideoDuration(selectedVideo.id, duration)
        }}
      />
    </div>
  )
}
