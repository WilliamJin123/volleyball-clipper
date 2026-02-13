'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ThemeColors, StoredTheme } from '@/lib/themes'
import {
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  getDefaultTheme,
  resolveColors,
  applyThemeColors,
} from '@/lib/themes'

interface ThemeContextValue {
  /** Current stored theme config */
  theme: StoredTheme
  /** Resolved color values (preset + overrides) */
  colors: ThemeColors
  /** Switch to a preset (clears custom overrides) */
  setPreset: (presetId: string) => void
  /** Apply a custom color override on top of current preset */
  setCustomColor: (key: keyof ThemeColors, value: string) => void
  /** Set all custom overrides at once */
  setCustomColors: (overrides: Partial<ThemeColors>) => void
  /** Reset to default preset, clear all custom overrides */
  resetTheme: () => void
  /** Start from a preset for custom editing */
  startCustomFrom: (presetId: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function loadStoredTheme(): StoredTheme {
  if (typeof window === 'undefined') return getDefaultTheme()
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredTheme
  } catch {
    // ignore
  }
  return getDefaultTheme()
}

function saveTheme(theme: StoredTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<StoredTheme>(getDefaultTheme)
  const isFirstRender = useRef(true)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadStoredTheme()
    setTheme(stored)
    applyThemeColors(resolveColors(stored))
  }, [])

  // Apply colors whenever theme changes (skip first render — inline script already handled it)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    applyThemeColors(resolveColors(theme))
    saveTheme(theme)
  }, [theme])

  const setPreset = useCallback((presetId: string) => {
    setTheme({ presetId, customColors: undefined })
  }, [])

  const setCustomColor = useCallback((key: keyof ThemeColors, value: string) => {
    setTheme((prev) => ({
      ...prev,
      customColors: { ...prev.customColors, [key]: value },
    }))
  }, [])

  const setCustomColors = useCallback((overrides: Partial<ThemeColors>) => {
    setTheme((prev) => ({
      ...prev,
      customColors: { ...prev.customColors, ...overrides },
    }))
  }, [])

  const resetTheme = useCallback(() => {
    setTheme(getDefaultTheme())
  }, [])

  const startCustomFrom = useCallback((presetId: string) => {
    setTheme({ presetId, customColors: undefined })
  }, [])

  const colors = useMemo(() => resolveColors(theme), [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors,
      setPreset,
      setCustomColor,
      setCustomColors,
      resetTheme,
      startCustomFrom,
    }),
    [theme, colors, setPreset, setCustomColor, setCustomColors, resetTheme, startCustomFrom]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
