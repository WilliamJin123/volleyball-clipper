'use client'

import Link from 'next/link'
import { useJobs } from '@/lib/hooks'
import { Card, CardContent, StatusBadge, Spinner, Button } from '@/components/ui'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentJobs() {
  const { jobs, loading, error } = useJobs()

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

  if (jobs.length === 0) {
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-3">
            No jobs created yet
          </p>
          <Link href="/jobs/new">
            <Button size="sm">Create Job</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const recentJobs = jobs.slice(0, 5)

  return (
    <div className="space-y-3">
      {recentJobs.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`}>
          <Card className="hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {job.query}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {job.videos?.filename || 'Unknown video'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(job.created_at)}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {jobs.length > 5 && (
        <div className="text-center pt-2">
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              View all jobs
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
