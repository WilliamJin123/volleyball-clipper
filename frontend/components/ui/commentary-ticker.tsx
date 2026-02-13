'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import type { Job, Clip, Video } from '@/lib/types/database'

// ── Types ────────────────────────────────────────────

type TickerTagVariant = 'ok' | 'hot' | 'blue' | 'warn'

interface TickerEvent {
  id: string
  tag: string
  variant: TickerTagVariant
  message: string
  detail: string
  timestamp: number
}

// ── Tag styling map ──────────────────────────────────

const TAG_STYLES: Record<TickerTagVariant, string> = {
  ok:   'bg-accent-success/15 text-accent-success',
  hot:  'bg-accent-hot/15 text-accent-hot',
  blue: 'bg-accent-secondary/15 text-accent-secondary',
  warn: 'bg-accent-warning/15 text-accent-warning',
}

// ── Default ticker events (shown when no real data yet) ─

const DEFAULT_EVENTS: TickerEvent[] = [
  {
    id: 'default-1',
    tag: 'CLIP',
    variant: 'ok',
    message: 'Cross-Court Kill extracted',
    detail: '00:04.32',
    timestamp: Date.now(),
  },
  {
    id: 'default-2',
    tag: 'DETECT',
    variant: 'hot',
    message: 'Moments detected',
    detail: '"kills and spikes"',
    timestamp: Date.now(),
  },
  {
    id: 'default-3',
    tag: 'INDEX',
    variant: 'blue',
    message: 'Video ready for analysis',
    detail: 'indexing complete',
    timestamp: Date.now(),
  },
  {
    id: 'default-4',
    tag: 'DONE',
    variant: 'ok',
    message: 'Job complete',
    detail: 'clips ready',
    timestamp: Date.now(),
  },
]

// ── Helper: format duration ──────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 100)
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`
}

// ── Helper: time ago ─────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Build ticker event from DB changes ───────────────

function jobToEvent(job: Job & { videos?: Video }): TickerEvent {
  const filename = job.videos?.filename ?? 'video'
  switch (job.status) {
    case 'pending':
      return {
        id: `job-pending-${job.id}`,
        tag: 'QUEUE',
        variant: 'blue',
        message: `Job queued for ${filename}`,
        detail: `"${job.query}"`,
        timestamp: new Date(job.created_at).getTime(),
      }
    case 'processing':
      return {
        id: `job-proc-${job.id}`,
        tag: 'DETECT',
        variant: 'hot',
        message: `Analyzing ${filename}`,
        detail: `"${job.query}"`,
        timestamp: new Date(job.created_at).getTime(),
      }
    case 'completed':
      return {
        id: `job-done-${job.id}`,
        tag: 'DONE',
        variant: 'ok',
        message: `Job complete for ${filename}`,
        detail: `"${job.query}"`,
        timestamp: new Date(job.created_at).getTime(),
      }
    case 'failed':
      return {
        id: `job-fail-${job.id}`,
        tag: 'FAIL',
        variant: 'warn',
        message: `Job failed for ${filename}`,
        detail: `"${job.query}"`,
        timestamp: new Date(job.created_at).getTime(),
      }
    default:
      return {
        id: `job-${job.id}`,
        tag: 'JOB',
        variant: 'blue',
        message: `Job updated for ${filename}`,
        detail: job.status,
        timestamp: new Date(job.created_at).getTime(),
      }
  }
}

function clipToEvent(clip: Clip): TickerEvent {
  const duration = clip.end_time - clip.start_time
  return {
    id: `clip-${clip.id}`,
    tag: 'CLIP',
    variant: 'ok',
    message: 'Clip extracted',
    detail: formatDuration(duration),
    timestamp: new Date(clip.created_at).getTime(),
  }
}

function videoToEvent(video: Video): TickerEvent {
  switch (video.status) {
    case 'uploading':
      return {
        id: `vid-up-${video.id}`,
        tag: 'UPLOAD',
        variant: 'blue',
        message: `Uploading ${video.filename}`,
        detail: 'in progress',
        timestamp: new Date(video.created_at).getTime(),
      }
    case 'processing':
      return {
        id: `vid-proc-${video.id}`,
        tag: 'INDEX',
        variant: 'blue',
        message: `Indexing ${video.filename}`,
        detail: 'processing',
        timestamp: new Date(video.created_at).getTime(),
      }
    case 'ready':
      return {
        id: `vid-ready-${video.id}`,
        tag: 'INDEX',
        variant: 'ok',
        message: `${video.filename} ready`,
        detail: 'indexed',
        timestamp: new Date(video.created_at).getTime(),
      }
    case 'failed':
      return {
        id: `vid-fail-${video.id}`,
        tag: 'FAIL',
        variant: 'warn',
        message: `${video.filename} failed`,
        detail: 'indexing error',
        timestamp: new Date(video.created_at).getTime(),
      }
    default:
      return {
        id: `vid-${video.id}`,
        tag: 'VIDEO',
        variant: 'blue',
        message: video.filename,
        detail: video.status,
        timestamp: new Date(video.created_at).getTime(),
      }
  }
}

// ── Max events to display ────────────────────────────

const MAX_EVENTS = 12

// ── Component ────────────────────────────────────────

interface CommentaryTickerProps {
  className?: string
}

export function CommentaryTicker({ className = '' }: CommentaryTickerProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [events, setEvents] = useState<TickerEvent[]>([])
  const [initialized, setInitialized] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)

  // ── Seed with recent activity from the DB ──────────

  const seedEvents = useCallback(async () => {
    if (!user) return

    try {
      // Fetch recent jobs with video info
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, videos(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      // Fetch recent clips
      const { data: clips } = await supabase
        .from('clips')
        .select('*, jobs!inner(*)')
        .eq('jobs.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      // Fetch recent videos
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)

      const seeded: TickerEvent[] = []

      if (jobs) {
        jobs.forEach((j) => seeded.push(jobToEvent(j as Job & { videos?: Video })))
      }
      if (clips) {
        clips.forEach((c) => seeded.push(clipToEvent(c as Clip)))
      }
      if (videos) {
        videos.forEach((v) => seeded.push(videoToEvent(v as Video)))
      }

      // Sort by timestamp descending, take the most recent
      seeded.sort((a, b) => b.timestamp - a.timestamp)
      setEvents(seeded.slice(0, MAX_EVENTS))
      setInitialized(true)
    } catch {
      // If seeding fails, use defaults
      setInitialized(true)
    }
  }, [user, supabase])

  useEffect(() => {
    seedEvents()
  }, [seedEvents])

  // ── Subscribe to realtime changes ──────────────────

  useEffect(() => {
    if (!user) return

    const addEvent = (event: TickerEvent) => {
      setEvents((prev) => {
        // Deduplicate by id
        const filtered = prev.filter((e) => e.id !== event.id)
        return [event, ...filtered].slice(0, MAX_EVENTS)
      })
    }

    const channel = supabase
      .channel('commentary-ticker')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const job = payload.new as Job
          // Try to get video info for richer display
          const { data: video } = await supabase
            .from('videos')
            .select('*')
            .eq('id', job.video_id)
            .single()
          addEvent(jobToEvent({ ...job, videos: video ?? undefined } as Job & { videos?: Video }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clips',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addEvent(clipToEvent(payload.new as Clip))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addEvent(videoToEvent(payload.new as Video))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // ── Choose display events ──────────────────────────

  const displayEvents = useMemo(() => {
    return events.length > 0 ? events : (initialized ? DEFAULT_EVENTS : DEFAULT_EVENTS)
  }, [events, initialized])

  // ── Pause on hover ─────────────────────────────────

  const [paused, setPaused] = useState(false)

  return (
    <div
      className={`ticker-container overflow-hidden h-8 relative rounded-sm border border-border-dim ${className}`}
      style={{ background: 'var(--bg-void-92)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={stripRef}
        className="ticker-strip flex items-center h-full whitespace-nowrap font-mono text-[0.6875rem] text-text-secondary"
        style={{
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {/* Render events twice for seamless loop */}
        {[...displayEvents, ...displayEvents].map((event, i) => (
          <span key={`${event.id}-${i}`} className="contents">
            <span className="px-3 inline-flex items-center gap-1.5">
              <span
                className={`inline-block text-[0.5625rem] font-medium tracking-wider px-1 py-px rounded-sm ${TAG_STYLES[event.variant]}`}
              >
                {event.tag}
              </span>
              <span>{event.message}</span>
              <span className="text-text-dim">
                {' '}· {event.detail} · {timeAgo(event.timestamp)}
              </span>
            </span>
            <span className="text-border-dim px-2 font-bold">///</span>
          </span>
        ))}
      </div>
    </div>
  )
}
