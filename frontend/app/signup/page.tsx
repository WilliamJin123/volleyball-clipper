'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    })
    if (error) {
      setError(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* ASCII background */}
        <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
          <span className="font-mono text-xs text-text-dim opacity-30">
            [ ASCII DITHERED BACKGROUND — VOLLEYBALL MONTAGE ]
          </span>
        </div>

        {/* Success card */}
        <div className="relative z-10 w-full max-w-[400px] mx-4 sm:mx-0 px-5">
          <div
            className="border border-border-dim rounded-sm p-6 sm:p-8 md:p-10"
            style={{
              background: 'var(--bg-void-92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Logo */}
            <div className="text-center mb-8">
              <span className="font-display text-xl font-bold text-text-primary tracking-[0.02em]">
                <span className="text-accent-primary">{'//'}</span> VOLLEYCLIP
              </span>
            </div>

            {/* Net divider */}
            <div className="font-mono text-[0.6875rem] text-border-dim text-center mb-6 select-none leading-none">
              {'|--|--|--|--|--|--|--|--|--|'}
            </div>

            {/* Success message */}
            <div className="text-center flex flex-col gap-4">
              <h1 className="font-display text-lg font-bold text-text-primary tracking-wide">
                CHECK YOUR EMAIL
              </h1>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                We&apos;ve sent a confirmation link to{' '}
                <strong className="text-text-primary">{email}</strong>
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 bg-transparent border border-border-dim rounded-sm font-display font-bold text-sm text-text-secondary tracking-wide cursor-pointer transition-all duration-200 mt-2 hover:border-border-bright hover:text-text-primary"
              >
                BACK TO LOG IN
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* ASCII background */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <span className="font-mono text-xs text-text-dim opacity-30">
          [ ASCII DITHERED BACKGROUND — VOLLEYBALL MONTAGE ]
        </span>
      </div>

      {/* Auth wrapper */}
      <div className="relative z-10 w-full max-w-[400px] mx-4 sm:mx-0 px-5 animate-in">
        {/* Auth card */}
        <div
          className="border border-border-dim rounded-sm p-6 sm:p-8 md:p-10"
          style={{
            background: 'var(--bg-void-92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="font-display text-xl font-bold text-text-primary tracking-[0.02em]">
              <span className="text-accent-primary">{'//'}</span> VOLLEYCLIP
            </span>
          </div>

          {/* Net divider */}
          <div className="font-mono text-[0.6875rem] text-border-dim text-center mb-6 select-none leading-none">
            {'|--|--|--|--|--|--|--|--|--|'}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error message */}
            {error && (
              <div className="font-mono text-xs text-accent-error bg-accent-error/10 border border-accent-error/20 rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            {/* Full Name field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="full-name"
                className="font-mono text-[0.6875rem] font-medium text-text-dim uppercase tracking-widest"
              >
                FULL NAME
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                className="bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5 font-body text-sm text-text-primary placeholder:text-text-dim outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-glow)]"
              />
            </div>

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-mono text-[0.6875rem] font-medium text-text-dim uppercase tracking-widest"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5 font-body text-sm text-text-primary placeholder:text-text-dim outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-glow)]"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-mono text-[0.6875rem] font-medium text-text-dim uppercase tracking-widest"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="bg-bg-surface border border-border-dim rounded-sm px-3.5 py-2.5 font-body text-sm text-text-primary placeholder:text-text-dim outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-[0_0_0_3px_var(--accent-primary-glow)]"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent-primary rounded-sm font-display font-bold text-sm text-white tracking-wide cursor-pointer transition-all duration-250 mt-1 hover:shadow-[0_0_20px_var(--accent-primary-glow),0_0_40px_var(--accent-primary-glow-08)] active:[filter:brightness(0.85)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'SIGNING UP...' : 'SIGN UP'}
            </button>

            {/* Or divider */}
            <div className="flex items-center gap-3 my-1">
              <span className="flex-1 font-mono text-xs text-border-dim text-center tracking-[-0.05em] overflow-hidden leading-none">
                {'-----'}
              </span>
              <span className="font-mono text-xs text-text-dim shrink-0">or</span>
              <span className="flex-1 font-mono text-xs text-border-dim text-center tracking-[-0.05em] overflow-hidden leading-none">
                {'-----'}
              </span>
            </div>

            {/* Google OAuth */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 bg-transparent border border-border-dim rounded-sm font-body text-[0.8125rem] text-text-secondary cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 hover:border-border-bright hover:text-text-primary"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-7 font-mono text-xs text-text-dim">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-accent-secondary transition-colors duration-200 hover:text-[#5b9cf7]"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
