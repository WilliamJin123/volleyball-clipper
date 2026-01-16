'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import { triggerVideoIndexing } from '@/lib/api'
import { Button, Card, CardContent } from '@/components/ui'

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
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
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

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed',
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
            ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
            ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'}
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
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {file ? (
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Drop your video here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <span className="text-gray-600 dark:text-gray-400">
                {uploadProgress.message}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {uploadProgress.progress}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  uploadProgress.status === 'error'
                    ? 'bg-red-500'
                    : uploadProgress.status === 'complete'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {uploadProgress.status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {uploadProgress.message}
            </p>
          </div>
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
