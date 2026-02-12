'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { Logo } from '@/components/ui/logo'

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/clips', label: 'Clips' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/upload', label: 'Videos' },
]

function getUserInitials(email: string | undefined): string {
  if (!email) return '??'
  const name = email.split('@')[0]
  if (name.length <= 2) return name.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false)
    // Trigger page exit animation
    const main = document.querySelector('main')
    if (main) main.classList.add('page-exit')
    // Wait for animation, then sign out and redirect
    await new Promise((r) => setTimeout(r, 280))
    await signOut()
    router.push('/')
  }, [signOut, router])

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

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  // Sliding nav indicator
  const navRef = useRef<HTMLElement>(null)
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, ready: false })
  const [navCanAnimate, setNavCanAnimate] = useState(false)

  const measureNav = useCallback(() => {
    const nav = navRef.current
    if (!nav) return null
    const activeEl = nav.querySelector('[data-active="true"]') as HTMLElement
    if (!activeEl) return null
    const navRect = nav.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    return { left: elRect.left - navRect.left, width: elRect.width }
  }, [])

  // Measure active nav item position
  useEffect(() => {
    const pos = measureNav()
    if (!pos) {
      setNavIndicator((prev) => ({ ...prev, ready: false }))
      return
    }
    setNavIndicator({ ...pos, ready: true })
  }, [pathname, measureNav])

  // Enable transitions only after the first correct position is painted
  useEffect(() => {
    if (navIndicator.ready && !navCanAnimate) {
      requestAnimationFrame(() => setNavCanAnimate(true))
    }
  }, [navIndicator.ready, navCanAnimate])

  // Also update on resize
  useEffect(() => {
    const onResize = () => {
      const pos = measureNav()
      if (pos) setNavIndicator({ ...pos, ready: true })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measureNav])

  return (
    <header
      className="sticky top-0 z-100 flex items-center justify-between h-[56px] px-5 border-b border-border-dim"
      style={{
        background: 'rgba(15, 15, 20, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-8">
        <Logo size="sm" />

        {user && (
          <nav ref={navRef} className="relative flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive}
                  className={`
                    relative px-3 py-1.5 rounded-sm font-body text-[0.8125rem] font-medium
                    transition-colors duration-150
                    ${
                      isActive
                        ? 'text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                    }
                  `}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* Sliding active indicator */}
            <span
              className={`absolute h-[2px] bg-accent-primary rounded-full pointer-events-none ${
                navCanAnimate ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
              }`}
              style={{
                bottom: '-10px',
                left: `${navIndicator.left + navIndicator.width * 0.1}px`,
                width: `${navIndicator.width * 0.8}px`,
                opacity: navIndicator.ready ? 1 : 0,
                boxShadow: '0 0 8px rgba(255, 90, 31, 0.5)',
              }}
            />
          </nav>
        )}
      </div>

      {/* Right: Auth area */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="w-8 h-8 rounded-sm bg-bg-raised border border-border-dim animate-pulse" />
        ) : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`
                flex items-center justify-center w-8 h-8 rounded-sm
                bg-bg-raised border border-border-dim
                font-mono text-[0.6875rem] text-text-dim
                transition-colors duration-150
                hover:border-border-bright hover:text-text-secondary
                cursor-pointer select-none
              `}
              aria-label="User menu"
            >
              {getUserInitials(user.email)}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-sm
                  bg-bg-raised border border-border-dim
                  shadow-lg shadow-black/40 overflow-hidden"
              >
                <div className="px-3 py-2.5 border-b border-border-dim">
                  <p className="font-mono text-[0.6875rem] text-text-dim truncate">
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/settings"
                  className="block w-full px-3 py-2 text-left font-mono text-[0.8125rem] text-text-secondary
                    hover:text-text-primary hover:bg-white/[0.03]
                    transition-colors duration-150"
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full px-3 py-2 text-left font-mono text-[0.8125rem]
                    hover:bg-white/[0.03]
                    transition-colors duration-150 cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-sm font-body text-[0.8125rem] font-medium
                text-text-secondary hover:text-text-primary hover:bg-white/[0.03]
                transition-colors duration-150"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded-sm font-body text-[0.8125rem] font-medium
                text-bg-void bg-accent-primary hover:bg-accent-primary/90
                transition-colors duration-150"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
