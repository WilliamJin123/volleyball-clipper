'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Play, Download, AlertCircle } from 'lucide-react'
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

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
    <>
      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video unavailable</p>
                <p className="text-xs text-muted-foreground/70 mt-1">URL may have expired</p>
              </div>
            </div>
          ) : (
            <video
              src={clip.public_url}
              className="w-full h-full object-contain"
              controls={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setError(true)}
              preload="metadata"
            />
          )}
          {!isPlaying && !error && (
            <button
              onClick={(e) => {
                e.preventDefault()
                const video = e.currentTarget.parentElement?.querySelector('video')
                if (video) {
                  video.play()
                }
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-foreground ml-1" fill="currentColor" />
              </div>
            </button>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              {index && (
                <p className="text-sm font-medium text-foreground">
                  Clip #{index}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {formatTime(clip.start_time)} - {formatTime(clip.end_time)} ({duration.toFixed(1)}s)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
                disabled={error}
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={error}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen video dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {index ? `Clip #${index}` : 'Video Clip'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <video
              src={clip.public_url}
              className="w-full rounded-lg"
              controls
              autoPlay
            />
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {formatTime(clip.start_time)} - {formatTime(clip.end_time)} ({duration.toFixed(1)}s)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Video player modal for fullscreen playback (kept for backwards compatibility)
interface VideoPlayerModalProps {
  clip: Clip
  onClose: () => void
}

export function VideoPlayerModal({ clip, onClose }: VideoPlayerModalProps) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <video
          src={clip.public_url}
          className="w-full rounded-lg"
          controls
          autoPlay
        />
      </DialogContent>
    </Dialog>
  )
}
