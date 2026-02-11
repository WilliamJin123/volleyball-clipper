'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import { triggerVideoIndexing } from '@/lib/api'

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

      await triggerVideoIndexing(r2Path, video.id)

      await supabase
        .from('videos')
        .update({ status: 'processing' })
        .eq('id', video.id)

      setUploadProgress({
        status: 'complete',
        progress: 100,
        message: 'Upload complete! Redirecting...',
      })

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
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        style={{ border: dragActive ? '2px dashed blue' : '2px dashed gray', padding: '2rem', cursor: isUploading ? 'default' : 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file ? (
          <div>
            <p><strong>{file.name}</strong></p>
            <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <p>Drop your video here or click to browse</p>
        )}
      </div>

      {uploadProgress.status !== 'idle' && (
        <div>
          <p>{uploadProgress.message} — {uploadProgress.progress}%</p>
          <progress value={uploadProgress.progress} max={100} />
        </div>
      )}

      {uploadProgress.status === 'error' && (
        <p role="alert">{uploadProgress.message}</p>
      )}

      <div>
        {file && uploadProgress.status === 'idle' && (
          <button onClick={uploadFile}>Upload Video</button>
        )}
        {(file || uploadProgress.status === 'error') && !isUploading && (
          <button onClick={resetUpload}>
            {uploadProgress.status === 'error' ? 'Try Again' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  )
}
