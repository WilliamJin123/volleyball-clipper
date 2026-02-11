'use client'

import Link from 'next/link'
import { useClips } from '@/lib/hooks'
import { ClipCard } from './clip-card'

export function ClipGallery() {
  const { clips, loading, error } = useClips()

  if (loading) return <p>Loading...</p>
  if (error) return <p role="alert">{error}</p>

  if (clips.length === 0) {
    return (
      <div>
        <p>No clips yet</p>
        <Link href="/jobs/new">Create Job</Link>
      </div>
    )
  }

  return (
    <div>
      {clips.map((clip, index) => (
        <ClipCard key={clip.id} clip={clip} index={index + 1} />
      ))}
    </div>
  )
}
