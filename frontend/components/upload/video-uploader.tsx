'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { useVideos } from '@/lib/hooks/use-videos'
import { triggerVideoIndexing } from '@/lib/api'

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

export interface UploadState {
  status: UploadStatus
  progress: number
  message: string
  videoId?: string
  filename?: string
  fileSize?: number
}

interface VideoUploaderProps {
  onUploadStateChange?: (state: UploadState) => void
}

export function VideoUploader({ onUploadStateChange }: VideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const { user } = useAuth()
  const { createVideo } = useVideos()

  const updateState = useCallback(
    (state: UploadState) => {
      setUploadState(state)
      onUploadStateChange?.(state)
    },
    [onUploadStateChange]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      if (!user) return
      if (!file.type.startsWith('video/')) return

      // Max 2GB check
      if (file.size > 2 * 1024 * 1024 * 1024) {
        updateState({
          status: 'error',
          progress: 0,
          message: 'File exceeds 2GB limit',
          filename: file.name,
          fileSize: file.size,
        })
        return
      }

      try {
        updateState({
          status: 'uploading',
          progress: 0,
          message: 'Getting upload URL...',
          filename: file.name,
          fileSize: file.size,
        })

        // 1. Get presigned URL
        const urlResponse = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        })

        if (!urlResponse.ok) {
          throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, r2Path, filename } = await urlResponse.json()

        // 2. Upload to R2 via XHR for progress tracking
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100)
              updateState({
                status: 'uploading',
                progress: pct,
                message: `Uploading... ${pct}%`,
                filename: file.name,
                fileSize: file.size,
              })
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error('Upload failed'))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Upload failed')))
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.send(file)
        })

        xhrRef.current = null

        // 3. Create video record in Supabase
        updateState({
          status: 'processing',
          progress: 100,
          message: 'Creating video record...',
          filename: file.name,
          fileSize: file.size,
        })

        const video = await createVideo(r2Path, filename)

        // 4. Trigger indexing on backend
        updateState({
          status: 'processing',
          progress: 100,
          message: 'Starting indexing...',
          filename: file.name,
          fileSize: file.size,
          videoId: video.id,
        })

        await triggerVideoIndexing(r2Path, video.id)

        // 5. Done -- realtime subscription in useVideos will track indexing progress
        updateState({
          status: 'complete',
          progress: 100,
          message: 'Upload complete',
          filename: file.name,
          fileSize: file.size,
          videoId: video.id,
        })

        // Reset after brief delay
        setTimeout(() => {
          updateState({ status: 'idle', progress: 0, message: '' })
        }, 2000)
      } catch (error) {
        console.error('Upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        updateState({
          status: 'error',
          progress: 0,
          message: errorMessage,
          filename: file.name,
          fileSize: file.size,
        })
      }
    },
    [user, createVideo, updateState]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile && droppedFile.type.startsWith('video/')) {
        processFile(droppedFile)
      }
    },
    [processFile]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClick = () => {
    if (isUploading) return
    inputRef.current?.click()
  }

  const isUploading =
    uploadState.status === 'uploading' || uploadState.status === 'processing'

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative h-[160px] flex flex-col items-center justify-center gap-2
        border-2 border-dashed rounded-sm cursor-pointer
        transition-all duration-200
        ${
          dragActive
            ? 'border-transparent bg-[var(--bg-void-70)] marching-active'
            : 'border-border-dim bg-[var(--bg-void-50)]'
        }
        ${isUploading ? 'pointer-events-none opacity-60' : ''}
        hover:border-transparent hover:bg-[var(--bg-void-70)]
        group
      `}
      style={
        dragActive
          ? {
              boxShadow:
                '0 0 32px var(--accent-primary-glow), inset 0 0 32px var(--accent-primary-glow-03)',
            }
          : undefined
      }
    >
      {/* Marching ants animated border on hover */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none rounded-sm ${
          dragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity duration-200`}
        overflow="visible"
      >
        <rect
          x="0" y="0"
          width="100%" height="100%"
          rx="2" ry="2"
          fill="none"
          stroke="var(--color-border-bright)"
          strokeWidth="2"
          strokeDasharray="8 6"
          className="marching-ants-rect"
        />
      </svg>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[1.5rem] leading-none text-accent-primary">
            {'\u2191'}
          </span>
          <span className="font-body text-sm text-text-secondary">
            {uploadState.message}
          </span>
          <div className="w-[200px] h-[3px] bg-bg-raised rounded-sm overflow-hidden mt-1">
            <div
              className="h-full rounded-sm bg-accent-primary transition-[width] duration-300"
              style={{
                width: `${uploadState.progress}%`,
                boxShadow: '0 0 8px var(--accent-primary-glow)',
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <span className="font-mono text-[1.5rem] leading-none text-text-dim group-hover:text-accent-primary transition-colors duration-200 group-hover:[text-shadow:0_0_16px_var(--accent-primary-glow)]">
            {'\u2191'}
          </span>
          <span className="font-body text-sm text-text-secondary">
            Drop video file or click to browse
          </span>
          <span className="font-mono text-[0.6875rem] text-text-dim">
            MP4, MOV, AVI &middot; Max 2GB
          </span>
        </>
      )}

      {uploadState.status === 'error' && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="font-mono text-[0.6875rem] text-accent-error">
            {uploadState.message}
          </span>
        </div>
      )}
    </div>
  )
}
