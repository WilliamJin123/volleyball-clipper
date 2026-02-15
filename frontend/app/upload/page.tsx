'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Sidebar } from '@/components/layout'
import type { UploadState } from '@/components/upload/video-uploader'
import { StreamingTerminal } from '@/components/ui/streaming-terminal'

const VideoUploader = dynamic(
  () => import('@/components/upload/video-uploader').then(m => ({ default: m.VideoUploader })),
  { ssr: false, loading: () => <div className="animate-pulse bg-bg-surface border border-border-dim rounded-sm h-40" /> }
)
import type { TerminalLine } from '@/components/ui/streaming-terminal'
import { NetDivider } from '@/components/ui/net-divider'
import { StatusBadge } from '@/components/ui/status-badge'

import { ConfirmDelete } from '@/components/ui/confirm-delete'
import { useVideos } from '@/lib/hooks/use-videos'
import { useAnimatedList, useFlipAnimation } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
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
  onDelete,
  duration,
  onDuration,
  showDeleteConfirm,
  onShowDeleteConfirm,
  onCancelDelete,
  isDeleting,
}: {
  video: Video
  activeUpload?: UploadState
  onDelete: () => void
  duration?: number
  onDuration?: (id: string, d: number) => void
  showDeleteConfirm: boolean
  onShowDeleteConfirm: () => void
  onCancelDelete: () => void
  isDeleting: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isUploading = activeUpload?.status === 'uploading'
  const isProcessing = video.status === 'processing'
  const isFailed = video.status === 'failed'
  const isReady = video.status === 'ready'

  // Determine display status - prefer active upload state over DB status
  const displayStatus = isUploading ? 'uploading' : video.status

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handlePlay = useCallback(async () => {
    if (!isReady || menuOpen) return
    if (playing) {
      if (videoRef.current) videoRef.current.pause()
      setPlaying(false)
      return
    }
    if (videoUrl) {
      setPlaying(true)
      return
    }
    setLoadingUrl(true)
    try {
      const res = await fetch('/api/video-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Path: video.r2_path }),
      })
      const data = await res.json()
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl)
        setPlaying(true)
      }
    } catch (err) {
      console.error('Failed to get video URL:', err)
    } finally {
      setLoadingUrl(false)
    }
  }, [isReady, menuOpen, playing, videoUrl, video.r2_path])

  return (
    <div>
      <div
        onClick={handlePlay}
        className={`
          grid items-center gap-3 md:gap-4
          bg-bg-surface border border-border-dim rounded-sm px-3 md:px-4 py-2.5
          transition-all duration-200
          hover:border-border-bright hover:shadow-[0_2px_16px_rgba(0,0,0,0.2)]
          grid-cols-[1fr_auto] md:grid-cols-[80px_1fr_140px_80px_60px]
          ${isReady ? 'cursor-pointer' : ''}
          ${isUploading ? 'uploading-stripe' : ''}
        `}
      >
        {/* Thumbnail — hidden on mobile */}
        <div className="hidden md:flex w-[80px] h-[45px] bg-bg-raised border border-border-dim rounded-sm items-center justify-center shrink-0">
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

        {/* Status column — on mobile spans full row, on desktop inline */}
        <div className="flex flex-col items-start gap-1 col-span-2 md:col-span-1">
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

        {/* Size — hidden on mobile */}
        <div className="hidden md:block font-mono text-xs text-text-secondary text-right">
          {activeUpload?.fileSize
            ? formatFileSize(activeUpload.fileSize)
            : '--'}
        </div>

        {/* Actions */}
        <div className="relative flex items-center justify-end" ref={menuRef}>
          <button
            className="font-mono text-base text-text-dim px-2 py-1 rounded-sm transition-colors duration-150 hover:text-text-primary hover:bg-white/[0.04] tracking-[2px] cursor-pointer"
            aria-label="Video actions"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
          >
            &middot;&middot;&middot;
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20
                bg-bg-surface border border-border-dim rounded-sm
                shadow-[0_4px_24px_rgba(0,0,0,0.4)] min-w-[140px]"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onShowDeleteConfirm()
                }}
                className="w-full text-left px-3.5 py-2
                  font-mono text-xs text-accent-error
                  hover:bg-accent-error/5 transition-colors duration-150
                  cursor-pointer"
              >
                Delete Video
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline video player */}
      {(playing || loadingUrl) && (
        <div className="mt-1.5 mb-1.5 bg-bg-surface border border-accent-primary/30 rounded-sm overflow-hidden">
          {loadingUrl && !videoUrl ? (
            <div className="aspect-video flex items-center justify-center bg-bg-raised">
              <span className="font-mono text-xs text-text-dim pulse-text">Loading video...</span>
            </div>
          ) : videoUrl ? (
            <div className="relative">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full aspect-video"
                controls
                autoPlay
                preload="auto"
                onEnded={() => setPlaying(false)}
                onLoadedMetadata={() => {
                  if (videoRef.current && onDuration) {
                    onDuration(video.id, videoRef.current.duration)
                  }
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (videoRef.current) videoRef.current.pause()
                  setPlaying(false)
                }}
                className="absolute top-2 right-2 z-10 font-mono text-[0.625rem] text-text-dim hover:text-accent-primary transition-colors duration-150 cursor-pointer px-1.5 py-0.5 rounded-sm bg-bg-void/75 hover:bg-bg-void/90"
              >
                [CLOSE]
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Confirm Delete - modal popup */}
      {showDeleteConfirm && (
        <ConfirmDelete
          actionLabel={`DELETE VIDEO: "${video.filename}"`}
          currentState={{
            label: 'CURRENT STATE',
            items: [
              `Status: ${video.status}`,
              'Stored in R2',
              video.twelvelabs_video_id ? 'Indexed in TwelveLabs' : 'Not indexed',
            ],
          }}
          afterDelete={{
            label: 'AFTER DELETE',
            items: [
              'Video removed',
              'R2 file deleted',
              'Irreversible',
            ],
          }}
          onConfirm={onDelete}
          onCancel={onCancelDelete}
          isDeleting={isDeleting}
        />
      )}
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

/** Build streaming terminal lines from the latest upload state */
function buildUploadTerminalLines(state: UploadState): TerminalLine[] {
  const lines: TerminalLine[] = []
  const filename = state.filename || 'video.mp4'
  const fileSize = state.fileSize
    ? `${(state.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : ''

  if (state.status === 'uploading' || state.status === 'processing' || state.status === 'complete' || state.status === 'error') {
    lines.push({
      prefix: '[UPLOAD]',
      prefixClass: 'op',
      text: `Selected ${filename}`,
      textClass: 'val',
      suffix: fileSize ? ` (${fileSize})` : '',
      suffixClass: 'dim',
    })
  }

  if (state.status === 'uploading') {
    lines.push({
      prefix: '[UPLOAD]',
      prefixClass: 'op',
      text: `Uploading to R2... `,
      textClass: 'val',
      suffix: `${state.progress}%`,
      suffixClass: state.progress >= 100 ? 'ok' : 'primary',
    })
  }

  if (state.status === 'processing' || state.status === 'complete' || state.status === 'error') {
    lines.push({
      prefix: '[UPLOAD]',
      prefixClass: 'op',
      text: 'Upload to R2... ',
      textClass: 'val',
      suffix: 'complete',
      suffixClass: 'ok',
    })
  }

  if (state.status === 'processing') {
    if (state.message.includes('record')) {
      lines.push({
        prefix: '[DB]',
        prefixClass: 'op',
        text: 'Creating video record in database...',
        textClass: 'val',
      })
    } else if (state.message.includes('index') || state.message.includes('Index')) {
      lines.push({
        prefix: '[DB]',
        prefixClass: 'op',
        text: 'Video record created. ',
        textClass: 'val',
        suffix: state.videoId ? `ID: ${state.videoId.substring(0, 8)}` : '',
        suffixClass: 'ok',
      })
      lines.push({
        prefix: '[INDEX]',
        prefixClass: 'op',
        text: 'Triggering TwelveLabs indexing...',
        textClass: 'val',
      })
    }
  }

  if (state.status === 'complete') {
    lines.push({
      prefix: '[DB]',
      prefixClass: 'op',
      text: 'Video record created. ',
      textClass: 'val',
      suffix: state.videoId ? `ID: ${state.videoId.substring(0, 8)}` : '',
      suffixClass: 'ok',
    })
    lines.push({
      prefix: '[INDEX]',
      prefixClass: 'op',
      text: 'TwelveLabs indexing triggered. ',
      textClass: 'val',
      suffix: 'Queued',
      suffixClass: 'ok',
    })
    lines.push({
      prefix: '[DONE]',
      prefixClass: 'ok',
      text: 'Upload pipeline complete. Video will be ready once indexing finishes.',
      textClass: 'val',
    })
  }

  if (state.status === 'error') {
    lines.push({
      prefix: '[ERR]',
      prefixClass: 'err',
      text: state.message || 'An error occurred during upload.',
      textClass: 'val',
    })
  }

  return lines
}

export default function UploadPage() {
  const { videos, loading, refetch } = useVideos()
  const supabase = createClient()
  const [activeUploads, setActiveUploads] = useState<ActiveUploads>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [videoDurations, setVideoDurations] = useState<Map<string, number>>(new Map())
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null)
  const [isDeletingVideo, setIsDeletingVideo] = useState(false)
  const [uploadTerminalLines, setUploadTerminalLines] = useState<TerminalLine[]>([])
  const [showUploadTerminal, setShowUploadTerminal] = useState(false)
  const uploadTerminalCompleteRef = useRef(false)

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos
    const q = searchQuery.toLowerCase()
    return videos.filter((video) => {
      const filename = video.filename.toLowerCase()
      const status = video.status.toLowerCase()
      return filename.includes(q) || status.includes(q)
    })
  }, [videos, searchQuery])

  // Animated list for smooth enter/exit transitions during search
  const animatedVideos = useAnimatedList(filteredVideos, { exitDuration: 300, enterDuration: 300 })

  // FLIP animation: smoothly reposition visible items when exiting items are removed
  const videoListRef = useRef<HTMLDivElement>(null)
  const visibleVideoKeys = useMemo(
    () => animatedVideos.filter((a) => a.status === 'visible').map((a) => a.key),
    [animatedVideos]
  )
  useFlipAnimation(videoListRef, visibleVideoKeys)

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

      // Update terminal log for upload flow
      if (state.status !== 'idle') {
        setShowUploadTerminal(true)
        uploadTerminalCompleteRef.current = false
        setUploadTerminalLines(buildUploadTerminalLines(state))
      }

      // Hide terminal after a delay once complete
      if (state.status === 'complete') {
        uploadTerminalCompleteRef.current = true
        setTimeout(() => {
          if (uploadTerminalCompleteRef.current) {
            setShowUploadTerminal(false)
            setUploadTerminalLines([])
          }
        }, 5000)
      }

      if (state.status === 'idle') {
        // Reset terminal if going back to idle (e.g. after the 2s auto-reset in uploader)
        if (uploadTerminalCompleteRef.current) {
          setShowUploadTerminal(false)
          setUploadTerminalLines([])
        }
      }
    },
    [refetch]
  )

  const handleVideoDuration = useCallback((videoId: string, duration: number) => {
    if (duration && isFinite(duration)) {
      setVideoDurations((prev) => {
        const next = new Map(prev)
        next.set(videoId, duration)
        return next
      })
    }
  }, [])

  // Delete a video and its associated jobs/clips
  const handleDeleteVideo = useCallback(async (videoId: string) => {
    setIsDeletingVideo(true)
    try {
      // Get all jobs for this video to delete their clips first
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id')
        .eq('video_id', videoId)

      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map((j) => j.id)
        // Delete clips for all related jobs
        const { error: clipsError } = await supabase
          .from('clips')
          .delete()
          .in('job_id', jobIds)
        if (clipsError) throw clipsError

        // Delete jobs
        const { error: jobsError } = await supabase
          .from('jobs')
          .delete()
          .eq('video_id', videoId)
        if (jobsError) throw jobsError
      }

      // Delete the video
      const { error: videoError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
      if (videoError) throw videoError

      setDeleteVideoId(null)
      refetch()
    } catch (err) {
      console.error('Failed to delete video:', err)
    } finally {
      setIsDeletingVideo(false)
    }
  }, [supabase, refetch])

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
      <Sidebar />

      <main className="md:ml-[60px] relative z-1 max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-8 pb-24">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 animate-in">
          <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight">
            Videos
          </h1>
        </div>

        {/* Upload dropzone */}
        <div id="upload-dropzone" className="animate-in animate-delay-1">
          <VideoUploader onUploadStateChange={handleUploadStateChange} />
        </div>

        {/* Upload streaming terminal log */}
        {showUploadTerminal && uploadTerminalLines.length > 0 && (
          <div className="mt-3 animate-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest">
                Upload Log
              </span>
              {activeUploads.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.625rem] text-text-dim">Live</span>
                  <span className="pulse-dot" />
                </div>
              )}
            </div>
            <StreamingTerminal
              lines={uploadTerminalLines}
              active={true}
              skipAnimation={true}
              maxHeight="180px"
            />
          </div>
        )}

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
              className="font-mono text-xs px-3.5 py-1.5 rounded-sm border border-border-dim bg-bg-surface text-text-primary w-full sm:w-[200px] placeholder:text-text-dim outline-none transition-all duration-150 focus:border-border-bright"
              style={{ boxShadow: 'none' }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 8px var(--accent-primary-glow-08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        )}

        {/* Video list */}
        <div ref={videoListRef} className="flex flex-col gap-1.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-3 md:gap-4 bg-bg-surface border border-border-dim rounded-sm px-3 md:px-4 py-2.5 animate-pulse
                  grid-cols-[1fr_auto] md:grid-cols-[80px_1fr_140px_80px_60px]"
              >
                <div className="hidden md:block w-[80px] h-[45px] bg-bg-raised rounded-sm" />
                <div className="space-y-2">
                  <div className="h-3 bg-bg-raised rounded-sm w-3/4" />
                  <div className="h-2 bg-bg-raised rounded-sm w-1/2" />
                </div>
                <div className="h-5 bg-bg-raised rounded-sm w-20 col-span-2 md:col-span-1" />
                <div className="hidden md:block h-3 bg-bg-raised rounded-sm w-12 ml-auto" />
                <div className="h-3 bg-bg-raised rounded-sm w-6 ml-auto" />
              </div>
            ))
          ) : videos.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-mono text-sm text-text-dim">
                No videos yet. Upload one to get started.
              </p>
            </div>
          ) : filteredVideos.length === 0 && animatedVideos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-mono text-xs text-text-dim">[NO MATCHES]</p>
              <p className="font-body text-text-secondary text-sm mt-1">
                No videos match your search.
              </p>
            </div>
          ) : (
            animatedVideos.map(({ item: video, status, key }) => (
              <div
                key={key}
                data-flip-key={status === 'visible' ? key : undefined}
                className={
                  status === 'exiting'
                    ? 'list-item-exiting'
                    : status === 'entering'
                      ? 'list-item-entering'
                      : ''
                }
              >
                <VideoRow
                  video={video}
                  activeUpload={activeUploads.get(video.filename)}
                  onDelete={() => handleDeleteVideo(video.id)}
                  duration={videoDurations.get(video.id)}
                  onDuration={handleVideoDuration}
                  showDeleteConfirm={deleteVideoId === video.id}
                  onShowDeleteConfirm={() => setDeleteVideoId(video.id)}
                  onCancelDelete={() => setDeleteVideoId(null)}
                  isDeleting={isDeletingVideo}
                />
              </div>
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

    </div>
  )
}
