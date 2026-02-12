'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/context/auth-context'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  // While checking auth, show nothing (brief flash)
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-void flex items-center justify-center">
        <div className="font-mono text-sm text-text-dim pulse-text">Loading...</div>
      </div>
    )
  }

  // If user is logged in, they'll be redirected -- show nothing
  if (user) {
    return null
  }

  // Not logged in: show landing
  return (
    <div className="min-h-screen bg-bg-void flex flex-col">
      {/* Simple header */}
      <header className="flex items-center justify-between h-[56px] px-5 border-b border-border-dim">
        <Logo size="sm" href="/" />
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
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <h1 className="font-display font-bold text-5xl tracking-tight text-text-primary mb-4 animate-in">
            <span className="text-accent-primary">//</span> VOLLEYCLIP
          </h1>
          <p className="font-body text-lg text-text-secondary mb-10 animate-in animate-delay-1">
            AI-powered volleyball clip extraction. Upload your game footage, describe what
            you want, and get precise clips in minutes.
          </p>
          <div className="animate-in animate-delay-2">
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-3 rounded-sm
                bg-accent-primary text-white font-display font-semibold text-sm
                transition-all duration-200 hover:-translate-y-px"
              style={{
                boxShadow:
                  '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>

      {/* Footer hint */}
      <footer className="py-6 text-center animate-in animate-delay-3">
        <p className="font-mono text-[0.6875rem] text-text-dim">
          Built with TwelveLabs AI + FFmpeg
        </p>
      </footer>
    </div>
  )
}
