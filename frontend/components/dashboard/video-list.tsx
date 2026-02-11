'use client'

import Link from 'next/link'
import { useVideos } from '@/lib/hooks'
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
  return (
    <div>
      <p><strong>{video.filename}</strong> — {video.status}</p>
      <p>{formatDate(video.created_at)}</p>
      {video.status === 'ready' && (
        <Link href={`/jobs/new?video=${video.id}`}>Create Job</Link>
      )}
    </div>
  )
}

export function VideoList() {
  const { videos, loading, error } = useVideos()

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">{error}</p>

  if (videos.length === 0) {
    return (
      <div>
        <p>No videos uploaded yet</p>
        <Link href="/upload">Upload Video</Link>
      </div>
    )
  }

  return (
    <div>
      {videos.slice(0, 5).map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
      {videos.length > 5 && <p>And {videos.length - 5} more videos...</p>}
    </div>
  )
}
