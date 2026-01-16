'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVideos } from '@/lib/hooks'
import { useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { triggerJobProcessing } from '@/lib/api'
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatusBadge } from '@/components/ui'
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

  // Filter to only show ready videos
  const readyVideos = videos.filter((v) => v.status === 'ready')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedVideoId || !query.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Create job record
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

      // Trigger job processing
      await triggerJobProcessing(job.id)

      // Update status to processing
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
    <Card>
      <CardHeader>
        <CardTitle>Create Clip Job</CardTitle>
        <CardDescription>
          Describe what moments you want to find in your video
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Video selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Video
            </label>
            {videosLoading ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ) : readyVideos.length === 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  No videos are ready for processing.{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/upload')}
                    className="underline hover:no-underline"
                  >
                    Upload a video
                  </button>{' '}
                  first.
                </p>
              </div>
            ) : (
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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

          {/* Query input */}
          <div>
            <Textarea
              label="What moments do you want to find?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Me setting the ball to the outside hitter"
              required
              rows={3}
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Example queries:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Padding input */}
          <div>
            <Input
              label="Clip padding (seconds)"
              type="number"
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              min={0}
              max={10}
              step={0.5}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Extra time added before and after each detected moment
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!selectedVideoId || !query.trim() || readyVideos.length === 0}
          >
            Create Clip Job
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

// Video selection card component
interface VideoSelectionProps {
  videoId: string
  filename: string
  status: string
  selected: boolean
  onSelect: () => void
}

export function VideoSelectionCard({
  filename,
  status,
  selected,
  onSelect,
}: VideoSelectionProps) {
  const isReady = status === 'ready'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isReady}
      className={`
        w-full p-4 rounded-lg border text-left transition-all
        ${
          selected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-white truncate">
          {filename}
        </span>
        <StatusBadge status={status} />
      </div>
    </button>
  )
}
