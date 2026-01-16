'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import type { Clip } from '@/lib/types/database'

interface ClipCardProps {
  clip: Clip
  index?: number
  showJobInfo?: boolean
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ClipCard({ clip, index, showJobInfo }: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
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
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-900 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-gray-500 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-400">Video unavailable</p>
              <p className="text-xs text-gray-500 mt-1">URL may have expired</p>
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
              <svg
                className="w-8 h-8 text-gray-900 ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            {index && (
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Clip #{index}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(clip.start_time)} - {formatTime(clip.end_time)} ({duration.toFixed(1)}s)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={error}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Video player modal for fullscreen playback
interface VideoPlayerModalProps {
  clip: Clip
  onClose: () => void
}

export function VideoPlayerModal({ clip, onClose }: VideoPlayerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <video
          src={clip.public_url}
          className="w-full rounded-lg"
          controls
          autoPlay
        />
      </div>
    </div>
  )
}
