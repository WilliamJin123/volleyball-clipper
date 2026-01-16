'use client'

import { useVideos, useJobs, useClips } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui'

interface StatCardProps {
  title: string
  value: number | string
  loading: boolean
  icon: React.ReactNode
}

function StatCard({ title, value, loading, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCards() {
  const { videos, loading: videosLoading } = useVideos()
  const { jobs, loading: jobsLoading } = useJobs()
  const { clips, loading: clipsLoading } = useClips()

  const readyVideos = videos.filter((v) => v.status === 'ready').length
  const processingJobs = jobs.filter((j) => j.status === 'processing' || j.status === 'pending').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Videos"
        value={videos.length}
        loading={videosLoading}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        }
      />
      <StatCard
        title="Ready for Processing"
        value={readyVideos}
        loading={videosLoading}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
      <StatCard
        title="Active Jobs"
        value={processingJobs}
        loading={jobsLoading}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        }
      />
      <StatCard
        title="Total Clips"
        value={clips.length}
        loading={clipsLoading}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />
    </div>
  )
}
