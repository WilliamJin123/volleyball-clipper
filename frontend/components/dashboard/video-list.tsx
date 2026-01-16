'use client'

import Link from 'next/link'
import { useVideos } from '@/lib/hooks'
import { Card, CardContent, StatusBadge, Spinner, Button } from '@/components/ui'
import type { Video } from '@/lib/types/database'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function VideoCard({ video }: { video: Video }) {
  const isReady = video.status === 'ready'

  return (
    <Card className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {video.filename}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDate(video.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={video.status} />
            {isReady && (
              <Link href={`/jobs/new?video=${video.id}`}>
                <Button size="sm" variant="outline">
                  Create Job
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VideoList() {
  const { videos, loading, error } = useVideos()

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-3">
            No videos uploaded yet
          </p>
          <Link href="/upload">
            <Button size="sm">Upload Video</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {videos.slice(0, 5).map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
      {videos.length > 5 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
          And {videos.length - 5} more videos...
        </p>
      )}
    </div>
  )
}
