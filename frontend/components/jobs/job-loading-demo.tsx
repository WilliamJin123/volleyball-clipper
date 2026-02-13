'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

// Noise characters matching playground.html
const NOISE_CHARS = '\u2593\u2591\u2592\u2588\u258C\u2590\u256C\u256B\u256A\u253C\u2524\u251C\u2500\u2502\u2518\u2514\u2510\u250C?#@$&*!><}{]['

function randomNoise(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]
  }
  return result
}

// ── Types ────────────────────────────────────────────

interface DemoRowConfig {
  name: string
  query: string
  finalTag: string
  finalData: string
  startDelay: number
}

type Phase = 'skeleton' | 'decode' | 'cascade' | 'resolved'

// ── Phase cycle hook with IntersectionObserver ───────

function usePhaseCycle(config: DemoRowConfig, containerRef: React.RefObject<HTMLElement | null>) {
  const [phase, setPhase] = useState<Phase>('skeleton')
  const visibleRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // IntersectionObserver: pause animation when off-screen
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef])

  // Phase state machine driven by setTimeout (no setInterval)
  useEffect(() => {
    if (!visibleRef.current) return

    const dataLen = config.finalData.length
    const cascadeLen = config.finalTag.length + dataLen

    const durations: Record<Phase, number> = {
      skeleton: config.startDelay,
      decode: Math.ceil(dataLen / 2) * 60 + 100,
      cascade: cascadeLen * 20 + 300,
      resolved: 3000,
    }

    const next: Record<Phase, Phase> = {
      skeleton: 'decode',
      decode: 'cascade',
      cascade: 'resolved',
      resolved: 'skeleton',
    }

    timerRef.current = setTimeout(() => {
      setPhase(next[phase])
    }, durations[phase])

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [phase, config])

  return phase
}

// ── Animated fused bar (shared across all variants) ──

interface AnimatedFusedBarProps {
  config: DemoRowConfig
  phase: Phase
  height?: string
  fontSize?: string
}

function AnimatedFusedBar({
  config,
  phase,
  height = 'h-8',
  fontSize = 'text-[0.6875rem]',
}: AnimatedFusedBarProps) {
  const isResolved = phase === 'resolved'
  const isSkeleton = phase === 'skeleton'
  const isDecode = phase === 'decode'
  const isCascade = phase === 'cascade'

  // Pre-generate static noise string (no interval needed)
  const noiseStr = useMemo(() => randomNoise(config.finalData.length), [config.finalData.length])

  // Compute CSS animation duration for decode phase
  const decodeDurationMs = Math.ceil(config.finalData.length / 2) * 60

  // Tag styling
  let tagText = '[QUEUED]'
  let tagColorClass = 'text-text-dim'
  if (isDecode) {
    tagText = '[SLICING]'
    tagColorClass = 'text-accent-primary'
  } else if (isCascade || isResolved) {
    tagText = '[COMPLETE]'
    tagColorClass = 'text-accent-success'
  }

  let barBorderClass = 'border-border-dim'
  if (isResolved) barBorderClass = 'border-accent-success/20'

  // Full cascade string (tag + data)
  const cascadeString = config.finalTag + config.finalData

  return (
    <div
      className={`flex items-stretch ${height} bg-bg-raised rounded-sm overflow-hidden relative border ${barBorderClass} transition-colors duration-300`}
    >
      {/* Animated diagonal stripe overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-400"
        style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 8px, var(--accent-primary-glow-04) 8px, var(--accent-primary-glow-04) 16px)',
          animation: 'antenna-skeleton-shift 1s linear infinite',
          opacity: isResolved ? 0 : isSkeleton ? 1 : 0.3,
        }}
      />

      {isCascade ? (
        // Cascade: character spans with CSS animation-delay
        <div className={`flex items-center px-2 font-mono ${fontSize} tracking-wide whitespace-nowrap relative z-[2] w-full`}>
          {cascadeString.split('').map((char, i) => {
            const isTagChar = i < config.finalTag.length
            const borderRight = isTagChar && i === config.finalTag.length - 1
              ? { borderRight: '1px solid var(--color-border-dim)', paddingRight: '8px', marginRight: '8px' } as React.CSSProperties
              : {}

            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: 'var(--color-text-dim)',
                  animation: `cascade-char-settle 100ms ease forwards`,
                  animationDelay: `${i * 20}ms`,
                  ...borderRight,
                }}
              >
                {char}
              </span>
            )
          })}
        </div>
      ) : (
        <>
          {/* Tag */}
          <div
            className={`flex items-center px-2 font-mono ${fontSize} font-medium tracking-wide whitespace-nowrap border-r relative z-[2] transition-colors duration-300 ${tagColorClass} ${isResolved ? 'border-accent-success/20' : 'border-border-dim'}`}
          >
            {tagText}
          </div>

          {/* Data area */}
          <div className={`flex-1 flex items-center px-2.5 font-mono ${fontSize === 'text-[0.6875rem]' ? 'text-xs' : fontSize} whitespace-nowrap overflow-hidden relative z-[2]`}>
            {isSkeleton && (
              <span className={`text-text-dim pulse-text ${fontSize === 'text-[0.8125rem]' ? 'text-xs' : 'text-[0.625rem]'} tracking-wide absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}>
                {fontSize === 'text-[0.6875rem]' ? 'AWAITING...' : 'AWAITING DATA...'}
              </span>
            )}
            {isDecode && (
              <div className="relative w-full">
                {/* Revealed text — CSS clip-path animation, left→right */}
                <span
                  className="text-accent-primary"
                  style={{
                    animation: `decode-clip-reveal ${decodeDurationMs}ms linear forwards`,
                  }}
                >
                  {config.finalData}
                </span>
                {/* Noise overlay — inverse clip + flicker, positioned over unrevealed portion */}
                <span
                  className="absolute top-0 left-0 text-text-dim opacity-50"
                  style={{
                    animation: `decode-clip-hide ${decodeDurationMs}ms linear forwards, decode-flicker 80ms step-end infinite`,
                  }}
                >
                  {noiseStr}
                </span>
              </div>
            )}
            {isResolved && (
              <span className="text-accent-success">
                {config.finalData}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Demo row configs ─────────────────────────────────

const DEMO_ROWS: DemoRowConfig[] = [
  {
    name: 'Match Highlights \u2014 Set 1-3',
    query: 'kills, aces, and blocks',
    finalTag: '[COMPLETE]',
    finalData: 'CLIPS:12\u00B7RES:1080p\u00B747.2MB',
    startDelay: 400,
  },
  {
    name: 'Defensive Plays',
    query: 'digs, saves, and pancakes',
    finalTag: '[COMPLETE]',
    finalData: 'CLIPS:8\u00B7RES:1080p\u00B731.4MB',
    startDelay: 1800,
  },
  {
    name: 'Serve Receives',
    query: 'serve receive and passing',
    finalTag: '[COMPLETE]',
    finalData: 'CLIPS:6\u00B7RES:720p\u00B718.9MB',
    startDelay: 3200,
  },
]

const DASHBOARD_ROWS: DemoRowConfig[] = [
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:5\u00B71080p', startDelay: 500 },
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:3\u00B7720p', startDelay: 1600 },
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:8\u00B71080p', startDelay: 2700 },
]

// ── Full demo row (job list loading) ─────────────────

function DemoRow({ config }: { config: DemoRowConfig }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const phase = usePhaseCycle(config, containerRef)
  const isResolved = phase === 'resolved'
  const isSkeleton = phase === 'skeleton'

  return (
    <div
      ref={containerRef}
      className="grid items-center px-5 py-4 bg-bg-surface border border-border-dim rounded-sm"
      style={{ gridTemplateColumns: '1fr 320px 80px 100px' }}
    >
      {/* Job Info */}
      <div className="min-w-0 pr-4">
        <p className="font-display text-sm font-bold text-text-primary truncate">
          {config.name}
        </p>
        <p className="font-mono text-xs text-text-dim truncate">
          &quot;{config.query}&quot;
        </p>
      </div>

      {/* Fused Bar */}
      <div className="px-2">
        <AnimatedFusedBar config={config} phase={phase} />
      </div>

      {/* Clips */}
      <div className="text-center">
        <span className="font-mono text-xs text-text-secondary">
          {isResolved ? '12' : '\u2014'}
        </span>
      </div>

      {/* Time */}
      <div className="text-right">
        <span className="font-mono text-xs text-text-dim">
          {isSkeleton ? 'queued' : phase === 'decode' ? 'slicing...' : isResolved ? 'just now' : 'settling...'}
        </span>
      </div>
    </div>
  )
}

// ── Compact row (dashboard recent-jobs loading) ──────

function CompactDemoRow({ config }: { config: DemoRowConfig }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const phase = usePhaseCycle(config, containerRef)

  return (
    <div ref={containerRef} className="bg-bg-surface border border-border-dim rounded-sm p-3.5 px-4.5">
      <div className="grid grid-cols-[1fr_minmax(140px,200px)_auto] gap-4 items-center">
        {/* Info skeletons */}
        <div className="min-w-0">
          <div className="h-4 w-40 bg-bg-raised rounded-sm mb-1.5" style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
            animation: 'antenna-skeleton-shift 1s linear infinite',
          }} />
          <div className="h-3 w-24 bg-bg-raised rounded-sm" style={{
            backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
            animation: 'antenna-skeleton-shift 1s linear infinite',
          }} />
        </div>

        {/* Compact fused bar */}
        <AnimatedFusedBar config={config} phase={phase} />

        {/* Time skeleton */}
        <div className="h-3 w-12 bg-bg-raised rounded-sm" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
          animation: 'antenna-skeleton-shift 1s linear infinite',
        }} />
      </div>
    </div>
  )
}

// ── Exported components ──────────────────────────────

export function JobLoadingDemo() {
  return (
    <div>
      {/* Phase info strip */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <span className="font-mono text-[0.5625rem] text-text-dim uppercase tracking-[0.1em]">
          LOADING
        </span>
        <div className="flex-1 h-px bg-border-dim" />
        <div className="flex gap-4">
          {[
            { label: 'SKELETON', desc: 'Diagonal stripes. No data.' },
            { label: 'DECODE', desc: 'Characters resolve from noise.' },
            { label: 'RESOLVED', desc: 'Clean readout. Done.' },
          ].map((p, i) => (
            <div key={i} className="text-center">
              <div className="font-mono text-[0.5rem] text-text-dim tracking-[0.08em]">
                PHASE {i + 1}
              </div>
              <div className="font-mono text-[0.5625rem] text-text-secondary">
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div
        className="grid px-5 pb-3"
        style={{ gridTemplateColumns: '1fr 320px 80px 100px' }}
      >
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest">Job</span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest px-2">Status</span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest text-center">Clips</span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest text-right">Time</span>
      </div>

      {/* Demo rows */}
      <div className="flex flex-col gap-0.5">
        {DEMO_ROWS.map((row, i) => (
          <DemoRow key={i} config={row} />
        ))}
      </div>
    </div>
  )
}

export function DashboardJobLoadingDemo() {
  return (
    <div className="flex flex-col gap-2">
      {DASHBOARD_ROWS.map((row, i) => (
        <CompactDemoRow key={i} config={row} />
      ))}
    </div>
  )
}

export function JobDetailLoadingDemo() {
  const detailConfig: DemoRowConfig = {
    name: 'Loading Job Details',
    query: 'retrieving job data',
    finalTag: '[LOADING]',
    finalData: 'SRC:video.mp4\u00B7STATUS:OK\u00B7READY',
    startDelay: 300,
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const phase = usePhaseCycle(detailConfig, containerRef)

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Skeleton title */}
      <div className="space-y-2">
        <div className="h-6 w-56 bg-bg-surface border border-border-dim rounded-sm" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 8px, var(--accent-primary-glow-03) 8px, var(--accent-primary-glow-03) 16px)',
          animation: 'antenna-skeleton-shift 1s linear infinite',
        }} />
        <div className="h-3 w-36 bg-bg-surface border border-border-dim rounded-sm" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 8px, var(--accent-primary-glow-03) 8px, var(--accent-primary-glow-03) 16px)',
          animation: 'antenna-skeleton-shift 1s linear infinite',
        }} />
      </div>

      {/* Animated fused bar */}
      <div className="max-w-md">
        <AnimatedFusedBar config={detailConfig} phase={phase} height="h-10" fontSize="text-[0.8125rem]" />
      </div>

      {/* Skeleton metadata block */}
      <div className="bg-bg-surface border border-border-dim rounded-sm p-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-16 bg-bg-raised rounded-sm mb-2" style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
                animation: 'antenna-skeleton-shift 1s linear infinite',
              }} />
              <div className="h-4 w-32 bg-bg-raised rounded-sm" style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
                animation: 'antenna-skeleton-shift 1s linear infinite',
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
