'use client'

import Link from 'next/link'
import { useJobs } from '@/lib/hooks'
import type { JobWithVideo } from '@/lib/types/database'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function JobCard({ job }: { job: JobWithVideo }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div>
        <p><strong>{job.query}</strong></p>
        <p>Video: {job.videos?.filename || 'Unknown'}</p>
        <p>Status: {job.status}</p>
        <p>{formatDate(job.created_at)}</p>
      </div>
    </Link>
  )
}

export function JobList() {
  const { jobs, loading, error } = useJobs()

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">{error}</p>

  if (jobs.length === 0) {
    return (
      <div>
        <p>No jobs yet</p>
        <Link href="/jobs/new">Create Job</Link>
      </div>
    )
  }

  return (
    <div>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
