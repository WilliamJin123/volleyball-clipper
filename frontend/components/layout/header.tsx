'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/context/auth-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Upload' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/clips', label: 'Clips' },
]

export function Header() {
  const pathname = usePathname()
  const { user, signOut, loading } = useAuth()

  return (
    <header>
      <Link href="/">Volleyball Clipper</Link>
      {user && (
        <nav>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}>
                {isActive ? `[${item.label}]` : item.label}
              </Link>
            )
          })}
        </nav>
      )}
      <div>
        {loading ? (
          <span>Loading...</span>
        ) : user ? (
          <>
            <span>{user.email}</span>
            <button onClick={signOut}>Sign Out</button>
          </>
        ) : (
          <>
            <Link href="/login">Sign In</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  )
}
