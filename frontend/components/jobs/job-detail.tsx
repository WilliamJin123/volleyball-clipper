'use client'

import Link from 'next/link'
import { useJob } from '@/lib/hooks'
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

  if (loading) return <p>Loading...</p>

  if (error || !job) {
    return (
      <div>
        <p>{error || 'Job not found'}</p>
        <Link href="/jobs">Back to Jobs</Link>
      </div>
    )
  }

  const isProcessing = job.status === 'pending' || job.status === 'processing'

  return (
    <div>
      <h2>Job Details</h2>
      <p>Status: <strong>{job.status}</strong></p>

      <dl>
        <dt>Query</dt>
        <dd>{job.query}</dd>
        <dt>Video</dt>
        <dd>{job.videos?.filename || 'Unknown'}</dd>
        <dt>Padding</dt>
        <dd>{job.padding} seconds</dd>
        <dt>Created</dt>
        <dd>{formatDate(job.created_at)}</dd>
      </dl>

      {isProcessing && (
        <div>
          <p>
            {job.status === 'pending'
              ? 'Job is queued and will start processing shortly.'
              : 'AI is analyzing your video and generating clips...'}
          </p>
        </div>
      )}

      {job.status === 'failed' && (
        <div>
          <p>Processing failed. There was an error processing your job.</p>
          <Link href="/jobs/new">Try Again</Link>
        </div>
      )}

      {job.status === 'completed' && (
        <div>
          <h3>Generated Clips ({job.clips?.length || 0})</h3>
          {job.clips && job.clips.length > 0 ? (
            <div>
              {job.clips.map((clip, index) => (
                <ClipCard key={clip.id} clip={clip} index={index + 1} />
              ))}
            </div>
          ) : (
            <p>No matching moments found for your query.</p>
          )}
        </div>
      )}
    </div>
  )
}
