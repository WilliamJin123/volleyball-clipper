'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import type { JobWithVideo, JobWithVideoAndClips } from '@/lib/types/database'

export function useJobs() {
  const [jobs, setJobs] = useState<JobWithVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchJobs = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, videos(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Subscribe to realtime updates for all user's jobs
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch to get the updated data with relations
          fetchJobs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchJobs])

  const createJob = async (videoId: string, query: string, padding: number = 2) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        query,
        padding,
        status: 'pending',
      })
      .select('*, videos(*)')
      .single()

    if (error) throw error
    setJobs((prev) => [data, ...prev])
    return data
  }

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    createJob,
  }
}

export function useJob(id: string) {
  const [job, setJob] = useState<JobWithVideoAndClips | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchJob = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, videos(*), clips(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job')
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`job:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${id}`,
        },
        () => {
          // Refetch to get updated data with relations
          fetchJob()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clips',
          filter: `job_id=eq.${id}`,
        },
        () => {
          // Refetch when new clips are added
          fetchJob()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, supabase, fetchJob])

  return { job, loading, error, refetch: fetchJob }
}
