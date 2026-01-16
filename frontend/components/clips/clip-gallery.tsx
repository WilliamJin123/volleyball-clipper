'use client'

import Link from 'next/link'
import { useClips } from '@/lib/hooks'
import { Card, CardContent, Spinner, Button } from '@/components/ui'
import { ClipCard } from './clip-card'

export function ClipGallery() {
  const { clips, loading, error } = useClips()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
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

  if (clips.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No clips yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create a clip job to generate clips from your videos
          </p>
          <Link href="/jobs/new">
            <Button>Create Job</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clips.map((clip, index) => (
        <ClipCard key={clip.id} clip={clip} index={index + 1} showJobInfo />
      ))}
    </div>
  )
}
