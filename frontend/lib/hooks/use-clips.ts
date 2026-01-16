'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import type { Clip, Job } from '@/lib/types/database'

interface ClipWithJob extends Clip {
  jobs: Job
}

export function useClips() {
  const [clips, setClips] = useState<ClipWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchClips = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('clips')
        .select('*, jobs!inner(*)')
        .eq('jobs.user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClips(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clips')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchClips()
  }, [fetchClips])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('clips-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clips',
        },
        () => {
          fetchClips()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchClips])

  return {
    clips,
    loading,
    error,
    refetch: fetchClips,
  }
}
