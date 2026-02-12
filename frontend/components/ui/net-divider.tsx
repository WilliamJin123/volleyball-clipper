'use client'

import { useEffect, useRef, useCallback } from 'react'

const NET_PATTERN = '───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───'
const POLE_HEIGHT = 3 // rows above and below the net line

interface NetDividerProps {
  className?: string
}

export function NetDivider({ className = '' }: NetDividerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const ripplingRef = useRef(false)
  const leftPoleRef = useRef<HTMLDivElement>(null)
  const rightPoleRef = useRef<HTMLDivElement>(null)

  const ripple = useCallback((originIdx?: number) => {
    const el = ref.current
    if (!el || ripplingRef.current) return
    ripplingRef.current = true

    const chars = el.querySelectorAll<HTMLSpanElement>('.net-char')
    const center = originIdx ?? Math.floor(chars.length / 2)

    chars.forEach((ch, i) => {
      const dist = Math.abs(i - center)
      setTimeout(() => {
        ch.style.color = 'var(--color-accent-primary)'
        ch.style.transform = 'translateY(-3px)'
        setTimeout(() => {
          ch.style.color = ''
          ch.style.transform = ''
        }, 300)
      }, dist * 20)
    })

    // Light up poles when wave reaches edges
    const leftDelay = center * 20
    const rightDelay = (chars.length - 1 - center) * 20

    const lightPole = (poleEl: HTMLDivElement | null, delay: number) => {
      if (!poleEl) return
      const segments = poleEl.querySelectorAll<HTMLDivElement>('.pole-seg')
      setTimeout(() => {
        // Flash all segments outward from the net line
        segments.forEach((seg, i) => {
          setTimeout(() => {
            seg.style.background = 'var(--color-accent-primary)'
            seg.style.boxShadow = '0 0 6px rgba(255, 90, 31, 0.5)'
            setTimeout(() => {
              seg.style.background = ''
              seg.style.boxShadow = ''
            }, 400)
          }, i * 50)
        })
      }, delay)
    }

    lightPole(leftPoleRef.current, leftDelay)
    lightPole(rightPoleRef.current, rightDelay)

    const maxDist = Math.max(center, chars.length - center)
    setTimeout(() => {
      ripplingRef.current = false
    }, maxDist * 20 + 600)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const chars = el.querySelectorAll<HTMLSpanElement>('.net-char')
    if (chars.length === 0) return
    const firstRect = chars[0].getBoundingClientRect()
    const lastRect = chars[chars.length - 1].getBoundingClientRect()
    const textLeft = firstRect.left
    const textWidth = lastRect.right - firstRect.left
    const x = e.clientX - textLeft
    const charWidth = textWidth / chars.length
    const clickIdx = Math.floor(x / charWidth)
    ripple(Math.max(0, Math.min(clickIdx, chars.length - 1)))
  }, [ripple])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const interval = setInterval(() => {
              if (Math.random() > 0.5) ripple()
            }, 5000 + Math.random() * 5000)
            ;(el as HTMLElement & { _rippleInterval?: ReturnType<typeof setInterval> })._rippleInterval = interval
          } else {
            const existing = (el as HTMLElement & { _rippleInterval?: ReturnType<typeof setInterval> })._rippleInterval
            if (existing) clearInterval(existing)
          }
        })
      },
      { threshold: 0.8 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ripple])

  // Pole segments: rendered top-to-bottom, the middle one aligns with the net
  const poleSegments = Array.from({ length: POLE_HEIGHT * 2 + 1 })

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`select-none overflow-hidden my-8 cursor-pointer flex items-center justify-center gap-1.5 ${className}`}
    >
      {/* Left pole */}
      <div ref={leftPoleRef} className="flex flex-col items-center gap-px">
        {poleSegments.map((_, i) => (
          <div
            key={`lp-${i}`}
            className="pole-seg rounded-full"
            style={{
              width: '2px',
              height: i === POLE_HEIGHT ? '2px' : '4px',
              background: i === POLE_HEIGHT ? 'transparent' : 'var(--color-border-dim)',
              transition: 'background 0.2s, box-shadow 0.3s',
            }}
          />
        ))}
      </div>

      {/* Net line */}
      <div className="font-mono text-xs text-border-bright whitespace-nowrap">
        {NET_PATTERN.split('').map((c, i) => (
          <span
            key={i}
            className="net-char inline-block"
            style={{ transition: 'color 0.15s, transform 0.3s var(--ease-slam)' }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Right pole */}
      <div ref={rightPoleRef} className="flex flex-col items-center gap-px">
        {poleSegments.map((_, i) => (
          <div
            key={`rp-${i}`}
            className="pole-seg rounded-full"
            style={{
              width: '2px',
              height: i === POLE_HEIGHT ? '2px' : '4px',
              background: i === POLE_HEIGHT ? 'transparent' : 'var(--color-border-dim)',
              transition: 'background 0.2s, box-shadow 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
