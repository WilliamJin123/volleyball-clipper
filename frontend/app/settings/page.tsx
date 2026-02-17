'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sidebar } from '@/components/layout'
import { NetDivider } from '@/components/ui/net-divider'
import { ConfirmDelete } from '@/components/ui/confirm-delete'
import { useAuth } from '@/lib/context/auth-context'
import { useTheme } from '@/lib/context/theme-context'
import { THEME_PRESETS } from '@/lib/themes'
import type { ThemeColors } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'

/* ── Types ──────────────────────────────────────────── */
type SidebarItem = {
  id: string
  label: string
  danger?: boolean
}

const sidebarItems: SidebarItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'danger-zone', label: 'Danger Zone', danger: true },
]

/* ── Helpers ────────────────────────────────────────── */
function getUserInitials(email: string | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  if (name.length <= 2) return name.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/* ── Settings Page ──────────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { theme, colors, setPreset, setCustomColor, resetTheme, startCustomFrom } = useTheme()

  // Active sidebar section
  const [activeSection, setActiveSection] = useState('profile')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Appearance state — auto-open editor if custom colors already exist
  const [customEditing, setCustomEditing] = useState(!!theme.customColors)
  // Sync customEditing when theme loads from localStorage
  useEffect(() => {
    if (theme.customColors && !customEditing) setCustomEditing(true)
  }, [theme.customColors]) // eslint-disable-line react-hooks/exhaustive-deps

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preferences state (persisted to profiles table)
  const [clipPadding, setClipPadding] = useState('2')
  const [minConfidence, setMinConfidence] = useState('0.60')
  const [outputResolution, setOutputResolution] = useState('720p')
  const [autoRetry, setAutoRetry] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Auto-save state
  const prefsLoadedRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle')

  // API Keys state
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false)
  const [apiKeyValue] = useState('tlk_••••••••••••••••••••••••')

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fixed nav positioning
  const navContainerRef = useRef<HTMLElement | null>(null)
  const [navLeft, setNavLeft] = useState<number | null>(null)

  // Flash outline state (section id that is currently flashing)
  const [flashingSection, setFlashingSection] = useState<string | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Section refs for scroll
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Lock to prevent scroll handler from overriding manual clicks during smooth scroll
  const clickLockRef = useRef(false)

  // Populate form from user data and load profile/preferences from DB
  useEffect(() => {
    if (user) {
      setEmail(user.email ?? '')
      setIsEmailVerified(!!user.email_confirmed_at)

      // Load profile + preferences from the profiles table
      const loadProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, default_clip_padding, default_min_confidence, output_resolution, auto_retry')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setDisplayName(data.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '')
          setClipPadding(String(data.default_clip_padding ?? 2))
          setMinConfidence(String(data.default_min_confidence ?? 0.60))
          setOutputResolution(data.output_resolution ?? '720p')
          setAutoRetry(data.auto_retry ?? false)
          // Mark loaded so auto-save doesn't fire on initial hydration
          setTimeout(() => { prefsLoadedRef.current = true }, 100)
        } else {
          // Fallback to auth metadata if profile fetch fails
          setDisplayName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '')
        }
      }
      loadProfile()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Measure fixed nav left position (tracks centered layout on resize)
  useEffect(() => {
    const measure = () => {
      const el = navContainerRef.current?.parentElement
      if (el) setNavLeft(el.getBoundingClientRect().left)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Cleanup flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
    }
  }, [])


  // Scroll-based active section tracking (center of viewport)
  useEffect(() => {
    const handleScroll = () => {
      if (clickLockRef.current) return
      // At the very top of the page, always highlight the first section
      if (window.scrollY < 100) {
        setActiveSection(sidebarItems[0].id)
        return
      }
      const centerY = window.innerHeight / 2
      // Find the last section whose top is at or above viewport center
      for (let i = sidebarItems.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[sidebarItems[i].id]
        if (!el) continue
        if (el.getBoundingClientRect().top <= centerY) {
          setActiveSection(sidebarItems[i].id)
          return
        }
      }
      setActiveSection(sidebarItems[0].id)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to section with flash outline
  const scrollToSection = useCallback((id: string) => {
    // Lock scroll handler so it doesn't override during smooth scroll
    clickLockRef.current = true
    setActiveSection(id)

    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Clear any existing flash timeout
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
        setFlashingSection(null)
      }

      // Delay the flash to let the scroll animation settle, then release lock
      flashTimeoutRef.current = setTimeout(() => {
        setFlashingSection(id)

        flashTimeoutRef.current = setTimeout(() => {
          setFlashingSection(null)
          clickLockRef.current = false
        }, 1100)
      }, 400)
    } else {
      clickLockRef.current = false
    }
  }, [])

  // Auto-save preferences with 3s debounce
  useEffect(() => {
    if (!prefsLoadedRef.current || !user) return

    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    setAutoSaveStatus('pending')

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            default_clip_padding: parseFloat(clipPadding) || 2,
            default_min_confidence: parseFloat(minConfidence) || 0.60,
            output_resolution: outputResolution,
            auto_retry: autoRetry,
          })
          .eq('id', user.id)

        if (error) throw error
        setAutoSaveStatus('saved')
        // Reset to idle after brief display
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [clipPadding, minConfidence, outputResolution, autoRetry, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unified save: profile + preferences
  const [savingAll, setSavingAll] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveAll = async () => {
    if (!user) return
    // Cancel pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    setAutoSaveStatus('idle')
    setSavingAll(true)
    setSaveMessage(null)
    setProfileMessage(null)
    setPrefsMessage(null)
    try {
      // Save profile (auth metadata)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      })
      if (authError) throw authError

      // Save profile + preferences to profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: displayName,
          default_clip_padding: parseFloat(clipPadding) || 2,
          default_min_confidence: parseFloat(minConfidence) || 0.60,
          output_resolution: outputResolution,
          auto_retry: autoRetry,
        })
        .eq('id', user.id)
      if (dbError) throw dbError

      setSaveMessage({ type: 'success', text: 'All changes saved.' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save.'
      setSaveMessage({ type: 'error', text: message })
    } finally {
      setSavingAll(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // Sign out and let backend handle cascading deletion
      // In a full implementation, this would call a backend endpoint
      // that deletes user data (videos, jobs, clips, R2 files) then the auth user
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      console.error('Failed to delete account:', err)
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-12 pb-24">
        {/* Page Header — sticky on desktop */}
        <div className="mb-8 animate-in md:sticky md:top-0 md:z-30 md:pt-4 md:pb-3" style={{ background: 'var(--bg-void-50)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-text-primary">
            Settings
          </h1>
          <p className="font-mono text-xs text-text-dim mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Settings Layout: Fixed Nav + Content */}
        <div className="md:pl-[208px]">
          {/* Mobile Section Selector — fixed beside hamburger */}
          <div className="md:hidden fixed top-3 left-[60px] right-4 z-40">
            <div className="relative">
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className={`
                  w-full h-10 flex items-center justify-between
                  border rounded-sm
                  font-mono text-xs font-medium cursor-pointer
                  transition-colors duration-200
                  ${mobileNavOpen ? 'border-accent-primary' : 'border-border-dim'}
                `}
                style={{
                  background: 'var(--color-bg-surface)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 shrink-0 rounded-full ${
                      sidebarItems.find(i => i.id === activeSection)?.danger
                        ? 'bg-accent-error'
                        : 'bg-accent-primary'
                    }`}
                  />
                  <span className={`truncate ${
                    sidebarItems.find(i => i.id === activeSection)?.danger
                      ? 'text-accent-error'
                      : 'text-text-primary'
                  }`}>
                    {sidebarItems.find(i => i.id === activeSection)?.label}
                  </span>
                </span>
                <svg
                  className={`shrink-0 text-text-dim transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3.5 5.25L7 8.75L10.5 5.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {mobileNavOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMobileNavOpen(false)}
                  />
                  <div
                    className="absolute left-0 right-0 mt-1 z-20 min-w-[200px] bg-bg-raised border border-border-dim rounded-sm overflow-hidden"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  >
                    {sidebarItems.map((item) => {
                      const isActive = activeSection === item.id
                      const isDanger = item.danger

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            scrollToSection(item.id)
                            setMobileNavOpen(false)
                          }}
                          className={`
                            w-full text-left flex items-center gap-3 px-4 py-3
                            font-mono text-[0.8125rem] font-medium
                            transition-all duration-150 cursor-pointer
                            ${isActive
                              ? isDanger
                                ? 'text-accent-error bg-accent-error/[0.06]'
                                : 'text-text-primary bg-accent-primary/[0.06]'
                              : isDanger
                                ? 'text-accent-error/70 hover:text-accent-error hover:bg-white/[0.02]'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
                            }
                          `}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isActive
                                ? isDanger ? 'bg-accent-error' : 'bg-accent-primary'
                                : 'bg-transparent'
                            }`}
                          />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Fixed Sidebar Navigation */}
          <nav
            ref={(el) => { navContainerRef.current = el }}
            className="hidden md:flex md:flex-col gap-0.5 md:fixed md:top-[140px] md:w-[192px] rounded-sm border border-border-dim p-2"
            style={{
              ...(navLeft !== null ? { left: navLeft } : {}),
              background: 'var(--bg-void-50)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.id
              const isDanger = item.danger

              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    text-left font-mono text-[0.8125rem] font-medium
                    px-4 py-2.5 rounded-sm border-l-2 whitespace-nowrap
                    transition-all duration-150 cursor-pointer
                    ${
                      isDanger
                        ? isActive
                          ? 'text-accent-error border-l-accent-error bg-accent-error/[0.04]'
                          : 'text-accent-error/70 border-l-transparent hover:text-accent-error hover:bg-white/[0.02]'
                        : isActive
                          ? 'text-text-primary border-l-accent-primary bg-accent-primary/[0.04]'
                          : 'text-text-secondary border-l-transparent hover:text-text-primary hover:bg-white/[0.02]'
                    }
                  `}
                >
                  {item.label}
                </button>
              )
            })}

            {/* Save button */}
            <div className="mt-4 px-1">
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                className="w-full px-4 py-2.5 rounded-sm
                  bg-accent-primary text-white font-display font-semibold text-sm
                  transition-all duration-200 hover:-translate-y-px
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  cursor-pointer"
                style={{
                  boxShadow: '0 0 20px var(--accent-primary-glow), 0 0 40px var(--accent-primary-glow-08)',
                }}
                onMouseEnter={(e) => {
                  if (!savingAll)
                    e.currentTarget.style.boxShadow =
                      '0 0 28px var(--accent-primary-glow-25), 0 0 56px var(--accent-primary-glow-12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 0 20px var(--accent-primary-glow), 0 0 40px var(--accent-primary-glow-08)'
                }}
              >
                {savingAll ? 'Saving...' : 'Save Changes'}
              </button>
              {/* Auto-save / save status */}
              <div className="h-5 mt-1.5 px-1">
                {saveMessage ? (
                  <span
                    className={`font-mono text-[0.625rem] uppercase tracking-widest ${
                      saveMessage.type === 'success' ? 'text-accent-success' : 'text-accent-error'
                    }`}
                  >
                    {saveMessage.text}
                  </span>
                ) : autoSaveStatus !== 'idle' ? (
                  <span
                    className={`font-mono text-[0.625rem] uppercase tracking-widest transition-opacity duration-300 ${
                      autoSaveStatus === 'saved' ? 'text-accent-success' : 'text-text-dim'
                    }`}
                  >
                    {autoSaveStatus === 'pending' && 'Unsaved changes...'}
                    {autoSaveStatus === 'saving' && 'Auto-saving...'}
                    {autoSaveStatus === 'saved' && 'Auto-saved'}
                  </span>
                ) : null}
              </div>
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0 animate-in animate-delay-1">
            {/* ── Profile Section ────────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['profile'] = el }}
              id="profile"
              className={`scroll-mt-24${flashingSection === 'profile' ? ' section-flash-outline' : ''}`}
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                Profile
              </h2>

              {/* Avatar */}
              <div className="flex items-start gap-5 mb-6">
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full
                    bg-bg-raised border border-border-dim
                    font-mono text-[1.25rem] leading-none text-text-secondary flex-shrink-0"
                >
                  {getUserInitials(user?.email)}
                </div>
                <div className="pt-2">
                  <button
                    className="font-mono text-xs text-accent-primary hover:underline cursor-pointer"
                  >
                    Change avatar
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5
                    font-body text-sm text-text-primary placeholder:text-text-dim
                    transition-all duration-150 outline-none
                    focus:border-accent-primary"
                  style={{
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 12px var(--accent-primary-glow-10)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  placeholder="Your display name"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5
                      font-body text-sm text-text-primary
                      outline-none cursor-default opacity-70"
                  />
                  {isEmailVerified && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2
                        inline-flex items-center
                        text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-sm
                        text-accent-success bg-accent-success/10 border border-accent-success/20
                        font-mono uppercase tracking-wide"
                    >
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Profile message */}
              {profileMessage && (
                <div
                  className={`font-mono text-xs px-3 py-2 rounded-sm border ${
                    profileMessage.type === 'success'
                      ? 'text-accent-success bg-accent-success/5 border-accent-success/20'
                      : 'text-accent-error bg-accent-error/5 border-accent-error/20'
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}
            </section>

            <NetDivider />

            {/* ── Appearance Section ────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['appearance'] = el }}
              id="appearance"
              className={`scroll-mt-24${flashingSection === 'appearance' ? ' section-flash-outline' : ''}`}
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                Appearance
              </h2>

              {/* Preset Grid */}
              <div className="mb-6">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Theme Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isActive = theme.presetId === preset.id && !theme.customColors
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setPreset(preset.id)
                          setCustomEditing(false)
                        }}
                        className={`
                          group relative flex items-center gap-3 px-4 py-3 rounded-sm border
                          transition-all duration-200 cursor-pointer text-left
                          ${isActive
                            ? 'border-accent-primary bg-accent-primary/[0.06]'
                            : 'border-border-dim hover:border-border-bright bg-bg-surface'
                          }
                        `}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-1 shrink-0">
                          {preset.preview.map((color, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-sm border border-white/10"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="font-mono text-xs font-medium text-text-primary">
                          {preset.name}
                        </span>
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Colors Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Custom Colors
                  </label>
                  {!customEditing ? (
                    <button
                      onClick={() => {
                        // If custom colors already exist, just open the editor
                        // Otherwise, start fresh from the current preset
                        if (!theme.customColors) {
                          startCustomFrom(theme.presetId)
                        }
                        setCustomEditing(true)
                      }}
                      className="font-mono text-[0.6875rem] text-accent-primary hover:underline cursor-pointer"
                    >
                      {theme.customColors
                        ? `Edit custom colors (${Object.keys(theme.customColors).length})`
                        : `Customize from ${THEME_PRESETS.find(p => p.id === theme.presetId)?.name ?? 'preset'}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        resetTheme()
                        setCustomEditing(false)
                      }}
                      className="font-mono text-[0.6875rem] text-accent-error hover:underline cursor-pointer"
                    >
                      Reset to default
                    </button>
                  )}
                </div>

                {customEditing && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(colors) as (keyof ThemeColors)[]).map((key) => (
                      <div key={key} className="flex items-center gap-2.5">
                        <label
                          className="relative w-7 h-7 rounded-sm border border-border-dim overflow-hidden cursor-pointer shrink-0
                            hover:border-border-bright transition-colors duration-150"
                        >
                          <input
                            type="color"
                            value={colors[key]}
                            onChange={(e) => setCustomColor(key, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <span
                            className="block w-full h-full"
                            style={{ backgroundColor: colors[key] }}
                          />
                        </label>
                        <span className="font-mono text-[0.625rem] text-text-dim truncate">
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!customEditing && theme.customColors && Object.keys(theme.customColors).length > 0 && (
                  <p className="font-mono text-xs text-accent-primary mt-1">
                    Custom overrides active ({Object.keys(theme.customColors).length} color{Object.keys(theme.customColors).length !== 1 ? 's' : ''})
                  </p>
                )}
              </div>
            </section>

            <NetDivider />

            {/* ── Preferences Section ────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['preferences'] = el }}
              id="preferences"
              className={`scroll-mt-24${flashingSection === 'preferences' ? ' section-flash-outline' : ''}`}
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                Preferences
              </h2>

              {/* Default Clip Padding */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Default Clip Padding
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setClipPadding(String(Math.max(0, (parseFloat(clipPadding) || 0) - 0.5)))}
                    className="flex items-center justify-center w-[44px] h-[44px]
                      bg-bg-raised border border-border-dim rounded-l-sm
                      font-mono text-sm text-text-secondary
                      transition-all duration-150 cursor-pointer
                      hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                      active:bg-accent-primary/10"
                  >
                    &minus;
                  </button>
                  <input
                    type="number"
                    value={clipPadding}
                    onChange={(e) => setClipPadding(e.target.value)}
                    className="hide-spinners w-[72px] bg-bg-surface border-y border-border-dim px-2 py-2.5
                      font-mono text-sm text-text-primary text-center
                      transition-all duration-150 outline-none
                      focus:border-accent-primary"
                    min="0"
                    step="0.5"
                  />
                  <button
                    type="button"
                    onClick={() => setClipPadding(String((parseFloat(clipPadding) || 0) + 0.5))}
                    className="flex items-center justify-center w-[44px] h-[44px]
                      bg-bg-raised border border-border-dim border-l-0 rounded-none
                      font-mono text-sm text-text-secondary
                      transition-all duration-150 cursor-pointer
                      hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                      active:bg-accent-primary/10"
                  >
                    +
                  </button>
                  <span
                    className="inline-flex items-center font-mono text-xs text-text-dim
                      bg-bg-raised border border-border-dim border-l-0 rounded-r-sm px-3.5 py-2.5 h-[40px]"
                  >
                    seconds
                  </span>
                </div>
                <p className="font-mono text-xs text-text-dim mt-1.5">
                  Extra time added before and after each detected clip
                </p>
              </div>

              {/* Minimum Confidence */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Minimum Confidence (AI match certainty)
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setMinConfidence(String(Math.max(0, (parseFloat(minConfidence) || 0) - 0.05).toFixed(2)))}
                    className="flex items-center justify-center w-[44px] h-[44px]
                      bg-bg-raised border border-border-dim rounded-l-sm
                      font-mono text-sm text-text-secondary
                      transition-all duration-150 cursor-pointer
                      hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                      active:bg-accent-primary/10"
                  >
                    &minus;
                  </button>
                  <input
                    type="number"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(e.target.value)}
                    className="hide-spinners w-[72px] bg-bg-surface border-y border-border-dim px-2 py-2.5
                      font-mono text-sm text-text-primary text-center
                      transition-all duration-150 outline-none
                      focus:border-accent-primary"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <button
                    type="button"
                    onClick={() => setMinConfidence(String(Math.min(1, (parseFloat(minConfidence) || 0) + 0.05).toFixed(2)))}
                    className="flex items-center justify-center w-[44px] h-[44px]
                      bg-bg-raised border border-border-dim border-l-0 rounded-r-sm
                      font-mono text-sm text-text-secondary
                      transition-all duration-150 cursor-pointer
                      hover:bg-bg-surface hover:text-text-primary hover:border-border-bright
                      active:bg-accent-primary/10"
                  >
                    +
                  </button>
                </div>
                <p className="font-mono text-xs text-text-dim mt-1.5">
                  Clips below this threshold are excluded &mdash; higher values mean stricter matching
                </p>
              </div>

              {/* Output Resolution */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Output Resolution
                </label>
                <div className="relative w-full sm:w-[200px]">
                  <select
                    value={outputResolution}
                    onChange={(e) => setOutputResolution(e.target.value)}
                    className="w-full appearance-none bg-bg-surface border border-border-dim rounded-sm
                      px-3.5 py-2.5 pr-10
                      font-body text-sm text-text-primary
                      transition-all duration-150 outline-none cursor-pointer
                      focus:border-accent-primary"
                    style={{ boxShadow: 'none' }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 12px var(--accent-primary-glow-10)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="original">Original</option>
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-dim"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="font-mono text-xs text-text-dim mt-1.5">
                  Resolution for exported clip files
                </p>
              </div>

              {/* Auto-retry Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-mono text-[0.8125rem] font-semibold text-text-primary">
                      Auto-retry Failed Jobs
                    </label>
                    <p className="font-mono text-xs text-text-dim mt-0.5">
                      Automatically retry jobs that fail due to transient errors
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoRetry(!autoRetry)}
                    className={`
                      relative flex-shrink-0 w-[48px] h-[28px] rounded-sm border
                      transition-all duration-200 cursor-pointer
                      ${
                        autoRetry
                          ? 'bg-accent-primary/15 border-accent-primary'
                          : 'bg-bg-raised border-border-dim'
                      }
                    `}
                    style={
                      autoRetry
                        ? { boxShadow: '0 0 12px var(--accent-primary-glow)' }
                        : {}
                    }
                    role="switch"
                    aria-checked={autoRetry}
                  >
                    <span
                      className={`
                        absolute top-1/2 -translate-y-1/2
                        w-[18px] h-[18px] rounded-[2px]
                        transition-all duration-200
                        ${
                          autoRetry
                            ? 'left-[25px] bg-accent-primary'
                            : 'left-[4px] bg-text-dim'
                        }
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Preferences message */}
              {prefsMessage && (
                <div
                  className={`font-mono text-xs px-3 py-2 rounded-sm border ${
                    prefsMessage.type === 'success'
                      ? 'text-accent-success bg-accent-success/5 border-accent-success/20'
                      : 'text-accent-error bg-accent-error/5 border-accent-error/20'
                  }`}
                >
                  {prefsMessage.text}
                </div>
              )}
            </section>

            <NetDivider />

            {/* ── API Keys Section ───────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['api-keys'] = el }}
              id="api-keys"
              className={`scroll-mt-24${flashingSection === 'api-keys' ? ' section-flash-outline' : ''}`}
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                API Keys
              </h2>

              <div className="mb-5">
                <label className="flex items-center gap-2.5 font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  TwelveLabs API Key
                  <span
                    className="inline-flex items-center normal-case tracking-normal
                      text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-sm
                      text-accent-success bg-accent-success/10 border border-accent-success/20"
                  >
                    Active
                  </span>
                </label>
                <input
                  type={apiKeyRevealed ? 'text' : 'password'}
                  value={apiKeyValue}
                  readOnly
                  className="w-full bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5
                    font-mono text-sm text-text-primary tracking-widest
                    outline-none cursor-default"
                />
                <p className="font-mono text-xs text-text-dim mt-1.5">
                  Used for video indexing and analysis
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Reveal / Hide Button (Ghost) */}
                <button
                  onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                  className="px-3.5 py-2 rounded-sm
                    bg-transparent text-text-secondary border border-border-dim
                    font-mono text-xs font-medium
                    transition-all duration-150
                    hover:text-text-primary hover:border-border-bright
                    cursor-pointer"
                >
                  {apiKeyRevealed ? 'Hide' : 'Reveal'}
                </button>

                {/* Regenerate Button (Danger Ghost) */}
                <button
                  className="px-3.5 py-2 rounded-sm
                    bg-transparent text-accent-error border border-accent-error/30
                    font-mono text-xs font-medium
                    transition-all duration-150
                    hover:bg-accent-error/5 hover:border-accent-error/50
                    cursor-pointer"
                >
                  Regenerate
                </button>
              </div>
            </section>

            <NetDivider />

            {/* ── Danger Zone Section ────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['danger-zone'] = el }}
              id="danger-zone"
              className={`scroll-mt-24${flashingSection === 'danger-zone' ? ' section-flash-outline' : ''}`}
            >
              <h2 className="font-display font-bold text-[1.125rem] text-accent-error mb-6">
                Danger Zone
              </h2>

              {!showDeleteConfirm ? (
                <div className="bg-bg-surface border border-accent-error/20 rounded-sm p-6">
                  <h3 className="font-display font-bold text-[1rem] text-accent-error mb-2">
                    Delete Account
                  </h3>
                  <p className="font-body text-sm text-text-secondary leading-[1.6] mb-5">
                    Permanently delete your account and all associated data including videos,
                    clips, and job history. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 py-2.5 rounded-sm
                      bg-transparent text-accent-error border border-accent-error/30
                      font-display font-semibold text-sm
                      transition-all duration-200
                      hover:bg-accent-error/5 hover:border-accent-error/50
                      cursor-pointer"
                    style={{
                      boxShadow: '0 0 12px transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 16px var(--accent-error-glow-12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 12px transparent'
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <ConfirmDelete
                  actionLabel={`DELETE ACCOUNT: "${user?.email || 'Unknown'}"`}
                  currentState={{
                    label: 'CURRENT STATE',
                    items: [
                      'Active account',
                      'All videos & clips',
                      'Job history preserved',
                    ],
                  }}
                  afterDelete={{
                    label: 'AFTER DELETE',
                    items: [
                      'Account removed',
                      'All data erased',
                      'Irreversible',
                    ],
                  }}
                  onConfirm={handleDeleteAccount}
                  onCancel={() => setShowDeleteConfirm(false)}
                  isDeleting={isDeleting}
                />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
