'use client'

import Link from 'next/link'
import { useJobs } from '@/lib/hooks'

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

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">{error}</p>

  if (jobs.length === 0) {
    return (
      <div>
        <p>No jobs created yet</p>
        <Link href="/jobs/new">Create Job</Link>
      </div>
    )
  }

  const recentJobs = jobs.slice(0, 5)

  return (
    <div>
      {recentJobs.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`}>
          <div>
            <p><strong>{job.query}</strong></p>
            <p>{job.videos?.filename || 'Unknown video'} — {job.status}</p>
            <p>{formatDate(job.created_at)}</p>
          </div>
        </Link>
      ))}
      {jobs.length > 5 && (
        <Link href="/jobs">View all jobs</Link>
      )}
    </div>
  )
}
