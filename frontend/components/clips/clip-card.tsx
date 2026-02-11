'use client'

import { useState } from 'react'
import type { Clip } from '@/lib/types/database'

interface ClipCardProps {
  clip: Clip
  index?: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ClipCard({ clip, index }: ClipCardProps) {
  const [error, setError] = useState(false)

  const duration = clip.end_time - clip.start_time

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = clip.public_url
    link.download = `clip_${index || clip.id}.mp4`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      {index && <p><strong>Clip #{index}</strong></p>}
      {error ? (
        <p>Video unavailable</p>
      ) : (
        <video
          src={clip.public_url}
          controls
          onError={() => setError(true)}
          preload="metadata"
          style={{ maxWidth: '100%' }}
        />
      )}
      <p>
        {formatTime(clip.start_time)} - {formatTime(clip.end_time)} ({duration.toFixed(1)}s)
      </p>
      <button onClick={handleDownload} disabled={error}>
        Download
      </button>
    </div>
  )
}
