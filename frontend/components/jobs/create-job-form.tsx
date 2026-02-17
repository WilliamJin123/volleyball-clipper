'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useVideos } from '@/lib/hooks'
import { useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { triggerJobProcessing } from '@/lib/api'
import type { JobStatus } from '@/lib/types/database'

interface CreateJobFormProps {
  preselectedVideoId?: string
  onSuccess?: () => void
  defaultExpanded?: boolean
}

export function CreateJobForm({
  preselectedVideoId,
  onSuccess,
  defaultExpanded = false,
}: CreateJobFormProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [borderFlash, setBorderFlash] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined)
  const [selectedVideoId, setSelectedVideoId] = useState(preselectedVideoId || '')
  const [query, setQuery] = useState('')
  const [padding, setPadding] = useState(2)
  const [minConfidence, setMinConfidence] = useState(0.7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { videos, loading: videosLoading } = useVideos()
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const isFirstRender = useRef(true)

  // Load user's saved preference defaults
  useEffect(() => {
    if (!user) return
    const loadDefaults = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('default_clip_padding, default_min_confidence')
        .eq('id', user.id)
        .single()
      if (data) {
        if (data.default_clip_padding != null) setPadding(data.default_clip_padding)
        if (data.default_min_confidence != null) setMinConfidence(data.default_min_confidence)
      }
    }
    loadDefaults()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [expanded, videos, videosLoading, error])

  // Flash orange border on toggle (skip first render)
  const toggleExpanded = useCallback(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
    }
    setExpanded((prev) => !prev)
    // Trigger border flash after the animation completes
    setTimeout(() => {
      setBorderFlash(true)
      setTimeout(() => setBorderFlash(false), 400)
    }, 300)
  }, [])

  const readyVideos = videos.filter((v) => v.status === 'ready')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedVideoId || !query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: job, error: dbError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          video_id: selectedVideoId,
          query: query.trim(),
          padding,
          status: 'pending' as JobStatus,
        })
        .select()
        .single()

      if (dbError) throw dbError
      if (!job) throw new Error('Failed to create job')

      await triggerJobProcessing(job.id)

      await supabase
        .from('jobs')
        .update({ status: 'processing' as JobStatus })
        .eq('id', job.id)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/jobs/${job.id}`)
      }
    } catch (err) {
      console.error('Error creating job:', err)
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedVideoId(preselectedVideoId || '')
    setQuery('')
    setPadding(2)
    setMinConfidence(0.7)
    setError(null)
    setExpanded(false)
  }

  return (
    <div
      className={`bg-bg-surface border rounded-sm transition-[border-color] duration-300 ${
        borderFlash ? 'border-accent-primary' : 'border-border-dim'
      }`}
      style={borderFlash ? { boxShadow: '0 0 12px var(--accent-primary-glow)' } : undefined}
    >
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-6 cursor-pointer group"
      >
        <h2 className="font-display text-[1.125rem] font-semibold text-text-primary">
          Create New Job
        </h2>
        <span
          className={`font-mono text-xs transition-all duration-300 ${
            expanded ? 'rotate-180' : 'rotate-0'
          } ${borderFlash ? 'text-accent-primary' : 'text-text-dim group-hover:text-text-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          [{expanded ? 'COLLAPSE' : 'EXPAND'}]
        </span>
      </button>

      {/* Expandable Form with smooth animation */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          maxHeight: expanded ? `${(contentHeight ?? 600) + 32}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div ref={contentRef}>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-0">
          {error && (
            <div className="mb-4 px-3 py-2 bg-accent-error/10 border border-accent-error/20 rounded-sm">
              <p className="font-mono text-xs text-accent-error" role="alert">
                {error}
              </p>
            </div>
          )}

          {/* Video Select */}
          <div className="mb-4">
            <label
              htmlFor="video-select"
              className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-2"
            >
              Video
            </label>
            {videosLoading ? (
              <div className="h-10 bg-bg-void/80 border border-border-dim rounded-sm animate-pulse" />
            ) : readyVideos.length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-dim">No videos ready.</span>
                <button
                  type="button"
                  onClick={() => router.push('/upload')}
                  className="font-mono text-xs text-accent-primary hover:text-accent-primary/80 transition-colors cursor-pointer"
                >
                  Upload one
                </button>
              </div>
            ) : (
              <select
                id="video-select"
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full h-10 px-3 bg-bg-void/80 border border-border-dim rounded-sm
                  font-mono text-[0.8125rem] text-text-primary
                  focus:border-accent-primary focus:outline-none
                  transition-colors duration-150 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="">Select a video...</option>
                {readyVideos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.filename}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Query */}
          <div className="mb-4">
            <label
              htmlFor="query"
              className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-2"
            >
              Query
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the moments to find..."
              required
              className="w-full min-h-20 px-3 py-2.5 bg-bg-void/80 border border-border-dim rounded-sm
                font-mono text-[0.8125rem] text-text-primary placeholder:text-text-dim/50
                focus:border-accent-primary focus:outline-none
                transition-colors duration-150 resize-y"
            />
          </div>

          {/* Padding + Min Confidence - 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label
                htmlFor="padding"
                className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-2"
              >
                Padding (seconds)
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setPadding(Math.max(0, padding - 0.5))}
                  className="flex items-center justify-center w-[36px] h-10
                    bg-bg-raised border border-border-dim rounded-l-sm
                    font-mono text-sm text-text-secondary
                    transition-all duration-150 cursor-pointer
                    hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                    active:bg-accent-primary/10"
                >
                  &minus;
                </button>
                <input
                  id="padding"
                  type="number"
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={0.5}
                  className="hide-spinners flex-1 h-10 px-2 bg-bg-void/80 border-y border-border-dim
                    font-mono text-[0.8125rem] text-text-primary text-center
                    focus:border-accent-primary focus:outline-none
                    transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setPadding(Math.min(10, padding + 0.5))}
                  className="flex items-center justify-center w-[36px] h-10
                    bg-bg-raised border border-border-dim border-l-0 rounded-r-sm
                    font-mono text-sm text-text-secondary
                    transition-all duration-150 cursor-pointer
                    hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                    active:bg-accent-primary/10"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="min-confidence"
                className="block font-mono text-[0.625rem] text-text-dim uppercase tracking-widest mb-2"
              >
                Min Confidence (AI match certainty)
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setMinConfidence(Math.max(0, +(minConfidence - 0.05).toFixed(2)))}
                  className="flex items-center justify-center w-[36px] h-10
                    bg-bg-raised border border-border-dim rounded-l-sm
                    font-mono text-sm text-text-secondary
                    transition-all duration-150 cursor-pointer
                    hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                    active:bg-accent-primary/10"
                >
                  &minus;
                </button>
                <input
                  id="min-confidence"
                  type="number"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.05}
                  className="hide-spinners flex-1 h-10 px-2 bg-bg-void/80 border-y border-border-dim
                    font-mono text-[0.8125rem] text-text-primary text-center
                    focus:border-accent-primary focus:outline-none
                    transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setMinConfidence(Math.min(1, +(minConfidence + 0.05).toFixed(2)))}
                  className="flex items-center justify-center w-[36px] h-10
                    bg-bg-raised border border-border-dim border-l-0 rounded-r-sm
                    font-mono text-sm text-text-secondary
                    transition-all duration-150 cursor-pointer
                    hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                    active:bg-accent-primary/10"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 font-mono text-xs text-text-dim
                hover:text-text-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading || !selectedVideoId || !query.trim() || readyVideos.length === 0
              }
              className="px-4 py-2 bg-accent-primary text-bg-void font-mono text-xs font-medium
                rounded-sm transition-colors duration-150
                hover:bg-accent-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Starting...' : 'Start Job'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
