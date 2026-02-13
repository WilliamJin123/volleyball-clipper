'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/auth-context'

interface StorageData {
  totalBytes: number
  rawBytes: number
  clipsBytes: number
}

export function useStorage() {
  const [storage, setStorage] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, loading: authLoading } = useAuth()

  const fetchStorage = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/storage')

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch storage info')
      }

      const data: StorageData = await response.json()
      setStorage(data)
    } catch (err) {
      console.error('Storage fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch storage')
      // On error, set storage to zero so the UI shows 0 B instead of loading forever
      setStorage({ totalBytes: 0, rawBytes: 0, clipsBytes: 0 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Don't fetch until auth has resolved
    if (authLoading) return
    fetchStorage()
  }, [authLoading, fetchStorage])

  return {
    storage,
    loading: loading || authLoading,
    error,
    refetch: fetchStorage,
  }
}

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)

  // Use 1 decimal place for MB and above, 0 for smaller
  const decimals = i >= 2 ? 1 : 0
  return `${value.toFixed(decimals)} ${units[i]}`
}
