'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVideos } from '@/lib/hooks'
import { useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { triggerJobProcessing } from '@/lib/api'
import type { JobStatus } from '@/lib/types/database'

interface CreateJobFormProps {
  preselectedVideoId?: string
  onSuccess?: () => void
}

export function CreateJobForm({ preselectedVideoId, onSuccess }: CreateJobFormProps) {
  const [selectedVideoId, setSelectedVideoId] = useState(preselectedVideoId || '')
  const [query, setQuery] = useState('')
  const [padding, setPadding] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { videos, loading: videosLoading } = useVideos()
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

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

  const exampleQueries = [
    'Me setting the ball',
    'Spikes and attacks',
    'Defensive plays and digs',
    'Serves',
    'Blocks at the net',
    'Rally plays',
  ]

  return (
    <div>
      <h2>Create Clip Job</h2>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}

        <div>
          <label htmlFor="video-select">Select Video</label>
          {videosLoading ? (
            <p>Loading videos...</p>
          ) : readyVideos.length === 0 ? (
            <p>No videos ready. <button type="button" onClick={() => router.push('/upload')}>Upload one</button></p>
          ) : (
            <select
              id="video-select"
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
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

        <div>
          <label htmlFor="query">What moments do you want to find?</label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Me setting the ball to the outside hitter"
            required
            rows={3}
          />
          <div>
            <p>Example queries:</p>
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="padding">Clip padding (seconds)</label>
          <input
            id="padding"
            type="number"
            value={padding}
            onChange={(e) => setPadding(Number(e.target.value))}
            min={0}
            max={10}
            step={0.5}
          />
          <p>Extra time added before and after each detected moment</p>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedVideoId || !query.trim() || readyVideos.length === 0}
        >
          {loading ? 'Creating...' : 'Create Clip Job'}
        </button>
      </form>
    </div>
  )
}
