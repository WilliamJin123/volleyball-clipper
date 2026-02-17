'use client'

import { useAuth } from '@/lib/context/auth-context'
import { ScoreBug } from '@/components/ui/score-bug'
import { CommentaryTicker } from '@/components/ui/commentary-ticker'

/**
 * Global app shell that renders persistent overlays for authenticated users.
 * Rendered inside the AuthProvider so it has access to auth context.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <>
      {children}
      <ScoreBug />
      {/* Sticky bottom commentary ticker — offset for sidebar only when logged in */}
      <div className={`fixed bottom-0 left-0 ${user ? 'md:left-[60px]' : ''} right-0 z-40 pointer-events-none`}>
        <div className="pointer-events-auto">
          <CommentaryTicker className="rounded-none border-x-0 border-b-0" />
        </div>
      </div>
    </>
  )
}
