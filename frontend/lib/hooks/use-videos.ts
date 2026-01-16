'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import type { Video } from '@/lib/types/database'

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchVideos = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVideos(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const createVideo = async (r2Path: string, filename: string) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        r2_path: r2Path,
        filename: filename,
        status: 'uploading',
      })
      .select()
      .single()

    if (error) throw error
    setVideos((prev) => [data, ...prev])
    return data
  }

  const updateVideoStatus = async (id: string, status: Video['status']) => {
    const { error } = await supabase
      .from('videos')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    )
  }

  return {
    videos,
    loading,
    error,
    refetch: fetchVideos,
    createVideo,
    updateVideoStatus,
  }
}

export function useVideo(id: string) {
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchVideo = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setVideo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video')
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    fetchVideo()
  }, [fetchVideo])

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`video:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setVideo(payload.new as Video)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, supabase])

  return { video, loading, error, refetch: fetchVideo }
}
