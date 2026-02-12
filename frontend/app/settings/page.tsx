'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { NetDivider } from '@/components/ui/net-divider'
import { useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'

/* ── Types ──────────────────────────────────────────── */
type SidebarItem = {
  id: string
  label: string
  danger?: boolean
}

const sidebarItems: SidebarItem[] = [
  { id: 'profile', label: 'Profile' },
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

  // Active sidebar section
  const [activeSection, setActiveSection] = useState('profile')

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preferences state (local only for now)
  const [clipPadding, setClipPadding] = useState('2')
  const [minConfidence, setMinConfidence] = useState('0.60')
  const [outputResolution, setOutputResolution] = useState('720p')
  const [autoRetry, setAutoRetry] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // API Keys state
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false)
  const [apiKeyValue] = useState('tlk_••••••••••••••••••••••••')

  // Section refs for scroll
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Populate form from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '')
      setEmail(user.email ?? '')
      setIsEmailVerified(!!user.email_confirmed_at)
    }
  }, [user])

  // Intersection observer for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    sidebarItems.forEach((item) => {
      const el = sectionRefs.current[item.id]
      if (!el) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(item.id)
            }
          })
        },
        { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  // Scroll to section
  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Save profile
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      })
      if (error) throw error
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.'
      setProfileMessage({ type: 'error', text: message })
    } finally {
      setProfileSaving(false)
    }
  }

  // Save preferences (local only)
  const handleSavePreferences = () => {
    setPrefsSaving(true)
    setPrefsMessage(null)
    // Simulate save since preferences are local for now
    setTimeout(() => {
      setPrefsSaving(false)
      setPrefsMessage({ type: 'success', text: 'Preferences saved locally.' })
    }, 400)
  }

  return (
    <div>
      <Header />
      <main className="max-w-[800px] mx-auto px-6 py-12 pb-24">
        {/* Page Header */}
        <div className="mb-8 animate-in">
          <h1 className="font-display font-bold text-[1.5rem] text-text-primary">
            Settings
          </h1>
          <p className="font-mono text-xs text-text-dim mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Settings Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 animate-in animate-delay-1">
          {/* Sidebar Navigation */}
          <nav className="flex md:flex-col gap-0.5 md:sticky md:top-[88px] md:self-start overflow-x-auto">
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
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {/* ── Profile Section ────────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['profile'] = el }}
              id="profile"
              className="scroll-mt-24"
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                Profile
              </h2>

              {/* Avatar */}
              <div className="flex items-start gap-5 mb-6">
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full
                    bg-bg-raised border border-border-dim
                    font-mono text-[1.25rem] text-text-secondary flex-shrink-0"
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
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 90, 31, 0.1)'
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
                  className={`mb-4 font-mono text-xs px-3 py-2 rounded-sm border ${
                    profileMessage.type === 'success'
                      ? 'text-accent-success bg-accent-success/5 border-accent-success/20'
                      : 'text-accent-error bg-accent-error/5 border-accent-error/20'
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              {/* Save Profile Button */}
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="inline-flex items-center px-6 py-2.5 rounded-sm
                  bg-accent-primary text-white font-display font-semibold text-sm
                  transition-all duration-200 hover:-translate-y-px
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  cursor-pointer"
                style={{
                  boxShadow: '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)',
                }}
                onMouseEnter={(e) => {
                  if (!profileSaving)
                    e.currentTarget.style.boxShadow =
                      '0 0 28px rgba(255, 90, 31, 0.25), 0 0 56px rgba(255, 90, 31, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)'
                }}
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </section>

            <NetDivider />

            {/* ── Preferences Section ────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['preferences'] = el }}
              id="preferences"
              className="scroll-mt-24"
            >
              <h2 className="font-display font-bold text-[1.125rem] text-text-primary mb-6">
                Preferences
              </h2>

              {/* Default Clip Padding */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Default Clip Padding
                </label>
                <div className="flex">
                  <input
                    type="number"
                    value={clipPadding}
                    onChange={(e) => setClipPadding(e.target.value)}
                    className="w-[120px] bg-bg-surface border border-border-dim rounded-l-sm px-3.5 py-2.5
                      font-body text-sm text-text-primary
                      transition-all duration-150 outline-none
                      focus:border-accent-primary"
                    style={{ boxShadow: 'none' }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 90, 31, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    min="0"
                    step="0.5"
                  />
                  <span
                    className="inline-flex items-center font-mono text-xs text-text-dim
                      bg-bg-raised border border-border-dim border-l-0 rounded-r-sm px-3.5 py-2.5"
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
                  Minimum Confidence
                </label>
                <input
                  type="number"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(e.target.value)}
                  className="w-[120px] bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5
                    font-body text-sm text-text-primary
                    transition-all duration-150 outline-none
                    focus:border-accent-primary"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 90, 31, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  min="0"
                  max="1"
                  step="0.05"
                />
                <p className="font-mono text-xs text-text-dim mt-1.5">
                  Clips below this confidence threshold will be excluded
                </p>
              </div>

              {/* Output Resolution */}
              <div className="mb-5">
                <label className="block font-mono text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Output Resolution
                </label>
                <div className="relative w-[200px]">
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
                      e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 90, 31, 0.1)'
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
                      relative flex-shrink-0 w-[40px] h-[22px] rounded-sm border
                      transition-all duration-200 cursor-pointer
                      ${
                        autoRetry
                          ? 'bg-accent-primary/15 border-accent-primary'
                          : 'bg-bg-raised border-border-dim'
                      }
                    `}
                    style={
                      autoRetry
                        ? { boxShadow: '0 0 12px rgba(255, 90, 31, 0.15)' }
                        : {}
                    }
                    role="switch"
                    aria-checked={autoRetry}
                  >
                    <span
                      className={`
                        absolute top-1/2 -translate-y-1/2
                        w-[14px] h-[14px] rounded-[1px]
                        transition-all duration-200
                        ${
                          autoRetry
                            ? 'left-[22px] bg-accent-primary'
                            : 'left-[3px] bg-text-dim'
                        }
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Preferences message */}
              {prefsMessage && (
                <div
                  className={`mb-4 font-mono text-xs px-3 py-2 rounded-sm border ${
                    prefsMessage.type === 'success'
                      ? 'text-accent-success bg-accent-success/5 border-accent-success/20'
                      : 'text-accent-error bg-accent-error/5 border-accent-error/20'
                  }`}
                >
                  {prefsMessage.text}
                </div>
              )}

              {/* Save Preferences Button */}
              <button
                onClick={handleSavePreferences}
                disabled={prefsSaving}
                className="inline-flex items-center px-6 py-2.5 rounded-sm
                  bg-accent-primary text-white font-display font-semibold text-sm
                  transition-all duration-200 hover:-translate-y-px
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  cursor-pointer"
                style={{
                  boxShadow: '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)',
                }}
                onMouseEnter={(e) => {
                  if (!prefsSaving)
                    e.currentTarget.style.boxShadow =
                      '0 0 28px rgba(255, 90, 31, 0.25), 0 0 56px rgba(255, 90, 31, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)'
                }}
              >
                {prefsSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </section>

            <NetDivider />

            {/* ── API Keys Section ───────────────────── */}
            <section
              ref={(el) => { sectionRefs.current['api-keys'] = el }}
              id="api-keys"
              className="scroll-mt-24"
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
              className="scroll-mt-24"
            >
              <h2 className="font-display font-bold text-[1.125rem] text-accent-error mb-6">
                Danger Zone
              </h2>

              <div className="bg-bg-surface border border-accent-error/20 rounded-sm p-6">
                <h3 className="font-display font-bold text-[1rem] text-accent-error mb-2">
                  Delete Account
                </h3>
                <p className="font-body text-sm text-text-secondary leading-[1.6] mb-5">
                  Permanently delete your account and all associated data including videos,
                  clips, and job history. This action cannot be undone.
                </p>
                <button
                  className="px-5 py-2.5 rounded-sm
                    bg-transparent text-accent-error border border-accent-error/30
                    font-display font-semibold text-sm
                    transition-all duration-200
                    hover:bg-accent-error/5 hover:border-accent-error/50
                    cursor-pointer"
                  style={{
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0)'
                  }}
                >
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
