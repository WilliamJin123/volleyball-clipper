'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVideos } from '@/lib/hooks'
import { useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { triggerJobProcessing } from '@/lib/api'
import {
  Button,
  Input,
  Textarea,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatusBadge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
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
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Video selection */}
          <div className="space-y-2">
            <Label htmlFor="video-select">Select Video</Label>
            {videosLoading ? (
              <div className="h-10 bg-muted rounded-lg animate-pulse" />
            ) : readyVideos.length === 0 ? (
              <Alert variant="warning">
                <AlertDescription>
                  No videos are ready for processing.{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/upload')}
                    className="underline hover:no-underline"
                  >
                    Upload a video
                  </button>{' '}
                  first.
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedVideoId}
                onValueChange={setSelectedVideoId}
              >
                <SelectTrigger id="video-select">
                  <SelectValue placeholder="Select a video..." />
                </SelectTrigger>
                <SelectContent>
                  {readyVideos.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Query input */}
          <div className="space-y-2">
            <Label htmlFor="query">What moments do you want to find?</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Me setting the ball to the outside hitter"
              required
              rows={3}
            />
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Example queries:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Padding input */}
          <div className="space-y-2">
            <Label htmlFor="padding">Clip padding (seconds)</Label>
            <Input
              id="padding"
              type="number"
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              min={0}
              max={10}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
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
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-muted-foreground/50'
        }
        ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground truncate">
          {filename}
        </span>
        <StatusBadge status={status} />
      </div>
    </button>
  )
}
