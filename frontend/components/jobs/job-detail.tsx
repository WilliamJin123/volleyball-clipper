'use client'

import Link from 'next/link'
import { useJob } from '@/lib/hooks'
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, Spinner, Button } from '@/components/ui'
import { ClipCard } from '@/components/clips/clip-card'

interface JobDetailProps {
  jobId: string
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function JobDetail({ jobId }: JobDetailProps) {
  const { job, loading, error } = useJob(jobId)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 dark:text-red-400">
            {error || 'Job not found'}
          </p>
          <Link href="/jobs" className="mt-4 inline-block">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const isProcessing = job.status === 'pending' || job.status === 'processing'

  return (
    <div className="space-y-6">
      {/* Job info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Job Details</CardTitle>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Query
            </label>
            <p className="mt-1 text-gray-900 dark:text-white">{job.query}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Video
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {job.videos?.filename || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Padding
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {job.padding} seconds
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Created
            </label>
            <p className="mt-1 text-gray-900 dark:text-white">
              {formatDate(job.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Processing status */}
      {isProcessing && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <Spinner size="lg" className="mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {job.status === 'pending' ? 'Job Queued' : 'Processing Video'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {job.status === 'pending'
                  ? 'Your job is in the queue and will start processing shortly.'
                  : 'AI is analyzing your video and generating clips. This may take a few minutes depending on video length.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed status */}
      {job.status === 'failed' && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Processing Failed
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">
                There was an error processing your job. This could be due to video format issues or AI analysis problems.
              </p>
              <Link href="/jobs/new">
                <Button>Try Again</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clips section */}
      {job.status === 'completed' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Generated Clips ({job.clips?.length || 0})
          </h2>
          {job.clips && job.clips.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {job.clips.map((clip, index) => (
                <ClipCard key={clip.id} clip={clip} index={index + 1} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No matching moments found for your query.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
