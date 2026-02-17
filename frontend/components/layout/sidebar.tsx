'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import {
  LayoutDashboard,
  Scissors,
  BriefcaseBusiness,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/clips', label: 'Clips', icon: Scissors },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/upload', label: 'Videos', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const SIDEBAR_STORAGE_KEY = 'volleyclip-sidebar-expanded'

function readSidebarExpanded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSidebarExpanded(value: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value))
  } catch {
    // Ignore storage errors
  }
}

function getUserInitials(email: string | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  if (name.length <= 2) return name.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const [expanded, setExpandedRaw] = useState(readSidebarExpanded)
  const setExpanded = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
    setExpandedRaw((prev) => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn
      writeSidebarExpanded(next)
      return next
    })
  }, [])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [navIndicator, setNavIndicator] = useState({ top: 0, height: 0, ready: false })
  const [navCanAnimate, setNavCanAnimate] = useState(false)

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false)
    const main = document.querySelector('main')
    if (main) main.classList.add('page-exit')
    await new Promise((r) => setTimeout(r, 280))
    await signOut()
    router.push('/')
  }, [signOut, router])

  // Toggle sidebar on click, but only if the click target is the sidebar
  // itself or a non-interactive element (not a link, button, or their children)
  const handleSidebarClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    // Walk up from the click target to the sidebar element.
    // If we encounter an interactive element (a, button) before reaching
    // the sidebar, the click was on a button/link — don't toggle.
    let el: HTMLElement | null = target
    while (el && el !== e.currentTarget) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'a' || tag === 'button') {
        return // Interactive element was clicked; let it handle the event
      }
      el = el.parentElement
    }
    setExpanded((prev) => {
      const next = !prev
      if (!next) setDropdownOpen(false)
      return next
    })
  }, [setExpanded])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Close sidebar when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setExpanded(false)
        setDropdownOpen(false)
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  // Close dropdown and mobile sidebar on route change
  useEffect(() => {
    setDropdownOpen(false)
    setMobileOpen(false)
  }, [pathname])

  // Measure active nav indicator position
  const measureNavIndicator = useCallback(() => {
    const nav = navRef.current
    if (!nav) return
    const activeEl = nav.querySelector('[data-nav-active="true"]') as HTMLElement
    if (!activeEl) {
      setNavIndicator((prev) => ({ ...prev, ready: false }))
      return
    }
    const navRect = nav.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    setNavIndicator({
      top: elRect.top - navRect.top + 8,
      height: elRect.height - 16,
      ready: true,
    })
  }, [])

  useEffect(() => {
    measureNavIndicator()
  }, [pathname, measureNavIndicator])

  useEffect(() => {
    if (navIndicator.ready && !navCanAnimate) {
      requestAnimationFrame(() => setNavCanAnimate(true))
    }
  }, [navIndicator.ready, navCanAnimate])

  // Don't render sidebar for unauthenticated users
  if (!user && !loading) return null

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 flex md:hidden items-center justify-center w-10 h-10 rounded-sm
          border border-border-dim cursor-pointer
          transition-colors duration-150 hover:bg-white/[0.04]"
        style={{
          background: 'var(--bg-void-75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        aria-label="Open navigation"
      >
        <Menu size={18} className="text-text-secondary" />
      </button>

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 z-50 h-screen
          flex flex-col
          border-r border-border-dim
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          cursor-pointer
          ${expanded ? 'w-[200px]' : 'w-[60px]'}
          ${mobileOpen ? 'translate-x-0 w-[200px]' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'var(--bg-void-50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={handleSidebarClick}
      >
      {/* Logo area */}
      <div className="flex items-center justify-between h-[56px] px-3 shrink-0 border-b border-border-dim overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-[36px] h-[36px] shrink-0">
            <span className="font-display font-bold text-base text-accent-primary select-none">{'//'}</span>
          </span>
          <span
            className={`
              font-display font-bold text-sm tracking-tight text-text-primary whitespace-nowrap
              transition-all duration-300
              ${expanded || mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
            `}
          >
            VOLLEYCLIP
          </span>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMobileOpen(false) }}
          className="flex md:hidden items-center justify-center w-8 h-8 rounded-sm
            text-text-dim hover:text-text-secondary transition-colors duration-150 cursor-pointer"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main nav items */}
      <nav ref={navRef} className="relative flex-1 flex flex-col gap-1 px-2 py-3 overflow-hidden">
        {/* Sliding active indicator bar */}
        <span
          className={`absolute left-2 w-[2px] rounded-r-full bg-accent-primary pointer-events-none z-10 ${
            navCanAnimate ? 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
          }`}
          style={{
            top: `${navIndicator.top}px`,
            height: `${navIndicator.height}px`,
            opacity: navIndicator.ready ? 1 : 0,
            boxShadow: '0 0 8px var(--accent-primary-glow-50)',
          }}
        />

        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              data-nav-active={isActive}
              className={`
                group relative flex items-center gap-3 h-[40px] px-2.5 rounded-sm
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-accent-primary/[0.08] text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }
              `}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={`shrink-0 transition-colors duration-200 ${
                  isActive ? 'text-accent-primary' : 'text-text-dim group-hover:text-text-secondary'
                }`}
              />

              <span
                className={`
                  font-body text-[0.8125rem] font-medium whitespace-nowrap
                  transition-all duration-300
                  ${expanded || mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
                `}
              >
                {item.label}
              </span>

              {/* Tooltip when collapsed */}
              {!expanded && (
                <span
                  className="
                    absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
                    px-2.5 py-1.5 rounded-sm
                    bg-bg-raised border border-border-dim
                    font-body text-xs font-medium text-text-primary whitespace-nowrap
                    opacity-0 pointer-events-none group-hover:opacity-100
                    transition-opacity duration-200
                    shadow-lg shadow-black/40
                    z-[100]
                  "
                >
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: user */}
      <div className="flex flex-col gap-1 px-2 pb-3 shrink-0 border-t border-border-dim pt-2">
        {/* User area */}
        {loading ? (
          <div className="flex items-center gap-3 h-[40px] px-2.5">
            <div className="w-[28px] h-[28px] rounded-sm bg-bg-raised border border-border-dim animate-pulse shrink-0" />
          </div>
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`
                group relative flex items-center gap-3 w-full h-[40px] px-2.5 rounded-sm
                transition-all duration-200
                text-text-secondary hover:text-text-primary hover:bg-white/[0.04]
                cursor-pointer select-none
              `}
            >
              <span
                className="flex items-center justify-center w-[28px] h-[28px] rounded-sm shrink-0
                  bg-bg-raised border border-border-dim
                  font-mono text-[0.625rem] leading-none text-text-dim
                  transition-colors duration-150
                  group-hover:border-border-bright group-hover:text-text-secondary"
              >
                {getUserInitials(user.email)}
              </span>

              <span
                className={`
                  font-mono text-[0.75rem] text-text-secondary truncate
                  transition-all duration-300
                  ${expanded || mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
                `}
              >
                {user.email?.split('@')[0]}
              </span>

              {!expanded && (
                <span
                  className="
                    absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
                    px-2.5 py-1.5 rounded-sm
                    bg-bg-raised border border-border-dim
                    font-body text-xs font-medium text-text-primary whitespace-nowrap
                    opacity-0 pointer-events-none group-hover:opacity-100
                    transition-opacity duration-200
                    shadow-lg shadow-black/40
                    z-[100]
                  "
                >
                  {user.email}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                className="absolute left-[calc(100%+8px)] bottom-0
                  w-48 rounded-sm
                  bg-bg-raised border border-border-dim
                  shadow-lg shadow-black/40 overflow-hidden z-[100]"
              >
                <div className="px-3 py-2.5 border-b border-border-dim">
                  <p className="font-mono text-[0.6875rem] text-text-dim truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-[0.8125rem]
                    hover:bg-white/[0.03]
                    transition-colors duration-150 cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
    </>
  )
}
