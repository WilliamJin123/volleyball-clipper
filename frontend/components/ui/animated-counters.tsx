'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface CounterItem {
  target: number
  max: number
  prefix: string
  label: string
  color: string
  glowColor: string
}

const COUNTERS: CounterItem[] = [
  {
    target: 1847,
    max: 12402,
    prefix: 'FRAME',
    label: 'Frames Analyzed',
    color: 'var(--color-accent-primary)',
    glowColor: 'var(--accent-primary-glow)',
  },
  {
    target: 14,
    max: 14,
    prefix: 'CLIP',
    label: 'Moments Detected',
    color: 'var(--color-accent-hot)',
    glowColor: 'rgba(224, 64, 251, 0.15)',
  },
  {
    target: 12,
    max: 14,
    prefix: 'GEN',
    label: 'Clips Generated',
    color: 'var(--color-accent-success)',
    glowColor: 'rgba(34, 211, 122, 0.15)',
  },
  {
    target: 47,
    max: 60,
    prefix: 'MIN',
    label: 'Match Duration',
    color: 'var(--color-accent-secondary)',
    glowColor: 'var(--accent-secondary-glow)',
  },
]

interface CounterCardProps {
  item: CounterItem
  shouldAnimate: boolean
}

function CounterCard({ item, shouldAnimate }: CounterCardProps) {
  const [displayValue, setDisplayValue] = useState('0')
  const [barWidth, setBarWidth] = useState(0)
  const [counting, setCounting] = useState(false)
  const animFrameRef = useRef<number>(0)
  const hasAnimatedRef = useRef(false)

  const formatValue = useCallback(
    (current: number) => {
      if (item.prefix === 'MIN') {
        return `00:${String(Math.floor(current)).padStart(2, '0')}`
      }
      return current.toLocaleString()
    },
    [item.prefix]
  )

  const animate = useCallback(() => {
    setCounting(true)
    setDisplayValue('0')
    setBarWidth(0)

    const duration = 1200
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      // ease-slam curve approximation: quartic ease-out
      const ease = 1 - Math.pow(1 - t, 4)
      const current = Math.round(item.target * ease)

      setDisplayValue(
        item.prefix === 'MIN'
          ? `00:${String(Math.floor(current)).padStart(2, '0')}`
          : current.toLocaleString()
      )
      setBarWidth((current / item.max) * 100)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        setCounting(false)
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }, [item])

  // Trigger animation when shouldAnimate becomes true (intersection observer)
  useEffect(() => {
    if (shouldAnimate && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      animate()
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        // Reset so strict-mode replay can re-trigger
        hasAnimatedRef.current = false
      }
    }
  }, [shouldAnimate, animate])

  const handleClick = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    hasAnimatedRef.current = true
    animate()
  }, [animate])

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded-sm transition-all duration-150"
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${counting ? 'var(--accent-primary-glow-30)' : 'var(--color-border-dim)'}`,
        padding: '20px 24px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = counting
          ? 'var(--accent-primary-glow-30)'
          : 'var(--color-border-bright)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = counting
          ? 'var(--accent-primary-glow-30)'
          : 'var(--color-border-dim)'
      }}
    >
      <div
        className="font-mono text-xl sm:text-2xl md:text-[2rem] font-medium leading-none mb-2"
        style={{
          color: item.color,
          letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayValue}
      </div>
      <div
        className="font-mono text-[0.6875rem] uppercase"
        style={{
          color: 'var(--color-text-dim)',
          letterSpacing: '0.12em',
        }}
      >
        {item.label}
      </div>
      <div
        className="mt-3 rounded-sm overflow-hidden"
        style={{
          height: '2px',
          background: 'var(--color-bg-raised)',
        }}
      >
        <div
          className="h-full rounded-sm"
          style={{
            background: item.color,
            width: `${barWidth}%`,
            boxShadow: `0 0 8px ${item.glowColor}`,
            transition: 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  )
}

interface AnimatedCountersProps {
  className?: string
}

export function AnimatedCounters({ className = '' }: AnimatedCountersProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COUNTERS.map((item) => (
          <CounterCard
            key={item.prefix}
            item={item}
            shouldAnimate={isVisible}
          />
        ))}
      </div>
    </div>
  )
}
