'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import { triggerVideoIndexing } from '@/lib/api'
import { Button, Card, CardContent, Progress, Alert, AlertDescription } from '@/components/ui'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'indexing' | 'complete' | 'error'
  progress: number
  message: string
}

export function VideoUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile)
      toast.success('Video selected', {
        description: droppedFile.name,
      })
    } else {
      toast.error('Invalid file type', {
        description: 'Please select a video file',
      })
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      toast.success('Video selected', {
        description: selectedFile.name,
      })
    }
  }

  const uploadFile = async () => {
    if (!file || !user) return

    try {
      setUploadProgress({
        status: 'uploading',
        progress: 0,
        message: 'Getting upload URL...',
      })

      // Get presigned upload URL
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

      setUploadProgress({
        status: 'uploading',
        progress: 10,
        message: 'Uploading video...',
      })

      // Upload file to R2
      const xhr = new XMLHttpRequest()

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 80)
            setUploadProgress({
              status: 'uploading',
              progress: 10 + percentComplete,
              message: `Uploading... ${Math.round(percentComplete / 80 * 100)}%`,
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

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setUploadProgress({
        status: 'processing',
        progress: 92,
        message: 'Creating video record...',
      })

      // Create video record in database
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          r2_path: r2Path,
          filename: filename,
          status: 'uploading',
        })
        .select()
        .single()

      if (dbError) throw dbError

      setUploadProgress({
        status: 'indexing',
        progress: 96,
        message: 'Starting video indexing...',
      })

      // Trigger indexing
      await triggerVideoIndexing(r2Path, video.id)

      // Update status to processing
      await supabase
        .from('videos')
        .update({ status: 'processing' })
        .eq('id', video.id)

      setUploadProgress({
        status: 'complete',
        progress: 100,
        message: 'Upload complete! Redirecting...',
      })

      toast.success('Upload complete!', {
        description: 'Your video is now being processed.',
      })

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: errorMessage,
      })
      toast.error('Upload failed', {
        description: errorMessage,
      })
    }
  }

  const resetUpload = () => {
    setFile(null)
    setUploadProgress({ status: 'idle', progress: 0, message: '' })
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const isUploading = uploadProgress.status !== 'idle' && uploadProgress.status !== 'error'

  return (
    <Card>
      <CardContent className="p-8">
        {/* Drag and drop zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-muted-foreground/50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>

            {file ? (
              <div>
                <p className="text-lg font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-foreground">
                  Drop your video here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports MP4, MOV, AVI, and other common video formats
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {uploadProgress.status !== 'idle' && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {uploadProgress.message}
              </span>
              <span className="text-muted-foreground">
                {uploadProgress.progress}%
              </span>
            </div>
            <Progress
              value={uploadProgress.progress}
              className={`h-2 ${
                uploadProgress.status === 'error'
                  ? '[&>div]:bg-destructive'
                  : uploadProgress.status === 'complete'
                  ? '[&>div]:bg-success'
                  : ''
              }`}
            />
          </div>
        )}

        {/* Error state */}
        {uploadProgress.status === 'error' && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{uploadProgress.message}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          {file && uploadProgress.status === 'idle' && (
            <Button onClick={uploadFile} className="flex-1">
              Upload Video
            </Button>
          )}
          {(file || uploadProgress.status === 'error') && !isUploading && (
            <Button variant="outline" onClick={resetUpload}>
              {uploadProgress.status === 'error' ? 'Try Again' : 'Cancel'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
