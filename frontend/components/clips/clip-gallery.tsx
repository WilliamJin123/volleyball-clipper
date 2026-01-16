'use client'

import Link from 'next/link'
import { useClips } from '@/lib/hooks'
import { Card, CardContent, Spinner, Button, Alert, AlertDescription } from '@/components/ui'
import { ClipCard } from './clip-card'
import { Video } from 'lucide-react'

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
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (clips.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No clips yet
          </h3>
          <p className="text-muted-foreground mb-4">
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
        <ClipCard key={clip.id} clip={clip} index={index + 1} />
      ))}
    </div>
  )
}
