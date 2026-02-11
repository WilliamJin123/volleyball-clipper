'use client'

import { useVideos, useJobs, useClips } from '@/lib/hooks'

export function StatsCards() {
  const { videos, loading: videosLoading } = useVideos()
  const { jobs, loading: jobsLoading } = useJobs()
  const { clips, loading: clipsLoading } = useClips()

  const readyVideos = videos.filter((v) => v.status === 'ready').length
  const processingJobs = jobs.filter((j) => j.status === 'processing' || j.status === 'pending').length

  if (videosLoading || jobsLoading || clipsLoading) {
    return <p>Loading stats...</p>
  }

  return (
    <div>
      <span>Videos: {videos.length}</span>
      {' | '}
      <span>Ready: {readyVideos}</span>
      {' | '}
      <span>Active Jobs: {processingJobs}</span>
      {' | '}
      <span>Clips: {clips.length}</span>
    </div>
  )
}
