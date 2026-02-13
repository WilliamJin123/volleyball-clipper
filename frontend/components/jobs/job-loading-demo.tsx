'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Noise characters matching playground.html
const NOISE_CHARS = '\u2593\u2591\u2592\u2588\u258C\u2590\u256C\u256B\u256A\u253C\u2524\u251C\u2500\u2502\u2518\u2514\u2510\u250C?#@$&*!><}{]['

function randomNoise(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]
  }
  return result
}

// ---- Individual demo row that auto-cycles through 3 phases ----

interface DemoRowConfig {
  name: string
  query: string
  finalTag: string
  finalData: string
  startDelay: number // ms delay before this row starts its cycle
}

type Phase = 'skeleton' | 'decode' | 'cascade' | 'resolved'

function DemoRow({ config }: { config: DemoRowConfig }) {
  const [phase, setPhase] = useState<Phase>('skeleton')
  const [decodePos, setDecodePos] = useState(0)
  const [noiseText, setNoiseText] = useState('')
  const [cascadeChars, setCascadeChars] = useState<Array<{ char: string; settled: boolean; pulsing: boolean }>>([])
  const dataLen = config.finalData.length
  const decodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noiseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  // Cleanup function
  const clearAllTimers = useCallback(() => {
    if (decodeIntervalRef.current) {
      clearInterval(decodeIntervalRef.current)
      decodeIntervalRef.current = null
    }
    if (noiseIntervalRef.current) {
      clearInterval(noiseIntervalRef.current)
      noiseIntervalRef.current = null
    }
  }, [])

  // Start the auto-cycle after the initial delay
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const startTimeout = setTimeout(() => {
      // Move to decode phase
      setPhase('decode')
    }, config.startDelay)

    return () => {
      clearTimeout(startTimeout)
      clearAllTimers()
    }
  }, [config.startDelay, clearAllTimers])

  // Decode phase: progressively reveal characters
  useEffect(() => {
    if (phase !== 'decode') return

    setDecodePos(0)
    setNoiseText(randomNoise(dataLen))

    decodeIntervalRef.current = setInterval(() => {
      setDecodePos(prev => {
        const next = prev + 2
        if (next >= dataLen) {
          if (decodeIntervalRef.current) {
            clearInterval(decodeIntervalRef.current)
            decodeIntervalRef.current = null
          }
          // Transition to cascade
          setTimeout(() => setPhase('cascade'), 100)
          return dataLen
        }
        return next
      })
    }, 60)

    // Flicker noise
    noiseIntervalRef.current = setInterval(() => {
      setDecodePos(pos => {
        setNoiseText(randomNoise(dataLen - pos))
        return pos
      })
    }, 80)

    return () => {
      clearAllTimers()
    }
  }, [phase, dataLen, clearAllTimers])

  // Cascade phase: settle characters left to right
  useEffect(() => {
    if (phase !== 'cascade') return

    const fullString = config.finalTag + config.finalData
    const initialChars = fullString.split('').map((ch, i) => {
      // Tag portion: start as noise
      if (i < config.finalTag.length) {
        return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
      }
      // Data portion: already-decoded chars stay, rest is noise
      const dataIndex = i - config.finalTag.length
      if (dataIndex < decodePos) {
        return { char: config.finalData[dataIndex], settled: false, pulsing: false }
      }
      return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
    })
    setCascadeChars(initialChars)

    let idx = 0
    const cascadeInterval = setInterval(() => {
      if (idx >= fullString.length) {
        clearInterval(cascadeInterval)
        // Final settle
        setTimeout(() => {
          setCascadeChars(prev => prev.map(c => ({ ...c, settled: true, pulsing: false })))
          setPhase('resolved')
          // After showing resolved for a while, restart
          setTimeout(() => {
            setPhase('skeleton')
            setDecodePos(0)
            setNoiseText('')
            setCascadeChars([])
            // Restart cycle
            setTimeout(() => setPhase('decode'), 1500)
          }, 3000)
        }, 150)
        return
      }

      setCascadeChars(prev => {
        const updated = [...prev]
        if (updated[idx]) {
          updated[idx] = { char: fullString[idx], settled: false, pulsing: true }
        }
        // Settle previous
        if (idx > 0 && updated[idx - 1]) {
          updated[idx - 1] = { ...updated[idx - 1], pulsing: false, settled: true }
        }
        return updated
      })
      idx++
    }, 20)

    return () => {
      clearInterval(cascadeInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // --- Render the fused bar per phase ---
  const isResolved = phase === 'resolved'
  const isSkeleton = phase === 'skeleton'
  const isCascade = phase === 'cascade'

  // Tag text & color
  let tagText = '[QUEUED]'
  let tagColorClass = 'text-text-dim'
  if (phase === 'decode') {
    tagText = '[SLICING]'
    tagColorClass = 'text-accent-primary'
  } else if (phase === 'cascade' || phase === 'resolved') {
    tagText = '[COMPLETE]'
    tagColorClass = 'text-accent-success'
  }

  // Border style for the fused bar outer
  let barBorderClass = 'border-border-dim'
  if (isResolved) barBorderClass = 'border-accent-success/20'

  return (
    <div
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
        <div
          className={`flex items-stretch h-8 bg-bg-raised rounded-sm overflow-hidden relative border ${barBorderClass} transition-colors duration-300`}
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
            // Cascade mode: render as individual character spans
            <div className="flex items-center px-2 font-mono text-[0.6875rem] tracking-wide whitespace-nowrap relative z-[2] w-full">
              {cascadeChars.map((c, i) => {
                const isTagChar = i < config.finalTag.length
                const borderRight = isTagChar && i === config.finalTag.length - 1
                  ? { borderRight: '1px solid var(--color-border-dim)', paddingRight: '8px', marginRight: '8px' }
                  : {}

                let color: string
                let textShadow = 'none'
                if (c.pulsing) {
                  color = '#fff'
                  textShadow = '0 0 8px rgba(34, 211, 122, 0.7)'
                } else if (c.settled) {
                  color = 'var(--color-accent-success)'
                } else if (isTagChar) {
                  color = 'var(--color-accent-primary)'
                } else {
                  color = 'var(--color-text-dim)'
                }

                return (
                  <span
                    key={i}
                    style={{ color, textShadow, display: 'inline-block', ...borderRight }}
                  >
                    {c.char}
                  </span>
                )
              })}
            </div>
          ) : (
            <>
              {/* Tag */}
              <div
                className={`flex items-center px-2 font-mono text-[0.6875rem] font-medium tracking-wide whitespace-nowrap border-r relative z-[2] transition-colors duration-300 ${tagColorClass} ${isResolved ? 'border-accent-success/20' : 'border-border-dim'}`}
              >
                {tagText}
              </div>

              {/* Data area */}
              <div className="flex-1 flex items-center px-2.5 font-mono text-xs whitespace-nowrap overflow-hidden relative z-[2]">
                {isSkeleton && (
                  <span className="text-text-dim pulse-text text-[0.625rem] tracking-wide absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    AWAITING DATA...
                  </span>
                )}
                {phase === 'decode' && (
                  <>
                    <span className="text-accent-primary">
                      {config.finalData.substring(0, decodePos)}
                    </span>
                    <span className="text-text-dim opacity-50">
                      {noiseText}
                    </span>
                  </>
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
      </div>

      {/* Clips placeholder */}
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

// ---- Phase label badge ----
function PhaseLabel({ phase, progress }: { phase: Phase; progress: number }) {
  let text = 'PHASE 1: SKELETON'
  let colorClass = 'text-text-dim'
  if (phase === 'decode') {
    text = `PHASE 2: DECODING \u2014 ${Math.round(progress * 100)}%`
    colorClass = 'text-accent-primary'
  } else if (phase === 'cascade') {
    text = 'PHASE 2 \u2192 3: CASCADE SETTLE'
    colorClass = 'text-accent-success'
  } else if (phase === 'resolved') {
    text = 'PHASE 3: RESOLVED'
    colorClass = 'text-accent-success'
  }

  return (
    <span className={`font-mono text-[0.6875rem] tracking-wide ${colorClass}`}>
      {text}
    </span>
  )
}

// ---- Main exported component ----

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
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest">
          Job
        </span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest px-2">
          Status
        </span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest text-center">
          Clips
        </span>
        <span className="font-mono text-[0.625rem] text-text-dim uppercase tracking-widest text-right">
          Time
        </span>
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

// ---- Single-row version for job detail loading state ----

function SingleFusedBarDemo({ config }: { config: DemoRowConfig }) {
  const [phase, setPhase] = useState<Phase>('skeleton')
  const [decodePos, setDecodePos] = useState(0)
  const [noiseText, setNoiseText] = useState('')
  const [cascadeChars, setCascadeChars] = useState<Array<{ char: string; settled: boolean; pulsing: boolean }>>([])
  const dataLen = config.finalData.length
  const decodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noiseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  const clearAllTimers = useCallback(() => {
    if (decodeIntervalRef.current) {
      clearInterval(decodeIntervalRef.current)
      decodeIntervalRef.current = null
    }
    if (noiseIntervalRef.current) {
      clearInterval(noiseIntervalRef.current)
      noiseIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const startTimeout = setTimeout(() => setPhase('decode'), config.startDelay)
    return () => {
      clearTimeout(startTimeout)
      clearAllTimers()
    }
  }, [config.startDelay, clearAllTimers])

  useEffect(() => {
    if (phase !== 'decode') return
    setDecodePos(0)
    setNoiseText(randomNoise(dataLen))
    decodeIntervalRef.current = setInterval(() => {
      setDecodePos(prev => {
        const next = prev + 2
        if (next >= dataLen) {
          if (decodeIntervalRef.current) {
            clearInterval(decodeIntervalRef.current)
            decodeIntervalRef.current = null
          }
          setTimeout(() => setPhase('cascade'), 100)
          return dataLen
        }
        return next
      })
    }, 60)
    noiseIntervalRef.current = setInterval(() => {
      setDecodePos(pos => {
        setNoiseText(randomNoise(dataLen - pos))
        return pos
      })
    }, 80)
    return () => { clearAllTimers() }
  }, [phase, dataLen, clearAllTimers])

  useEffect(() => {
    if (phase !== 'cascade') return
    const fullString = config.finalTag + config.finalData
    const initialChars = fullString.split('').map((ch, i) => {
      if (i < config.finalTag.length) {
        return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
      }
      const dataIndex = i - config.finalTag.length
      if (dataIndex < decodePos) {
        return { char: config.finalData[dataIndex], settled: false, pulsing: false }
      }
      return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
    })
    setCascadeChars(initialChars)
    let idx = 0
    const cascadeInterval = setInterval(() => {
      if (idx >= fullString.length) {
        clearInterval(cascadeInterval)
        setTimeout(() => {
          setCascadeChars(prev => prev.map(c => ({ ...c, settled: true, pulsing: false })))
          setPhase('resolved')
          setTimeout(() => {
            setPhase('skeleton')
            setDecodePos(0)
            setNoiseText('')
            setCascadeChars([])
            setTimeout(() => setPhase('decode'), 1500)
          }, 3000)
        }, 150)
        return
      }
      setCascadeChars(prev => {
        const updated = [...prev]
        if (updated[idx]) {
          updated[idx] = { char: fullString[idx], settled: false, pulsing: true }
        }
        if (idx > 0 && updated[idx - 1]) {
          updated[idx - 1] = { ...updated[idx - 1], pulsing: false, settled: true }
        }
        return updated
      })
      idx++
    }, 20)
    return () => { clearInterval(cascadeInterval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const isResolved = phase === 'resolved'
  const isSkeleton = phase === 'skeleton'
  const isCascade = phase === 'cascade'

  let tagText = '[QUEUED]'
  let tagColorClass = 'text-text-dim'
  if (phase === 'decode') {
    tagText = '[SLICING]'
    tagColorClass = 'text-accent-primary'
  } else if (phase === 'cascade' || phase === 'resolved') {
    tagText = '[COMPLETE]'
    tagColorClass = 'text-accent-success'
  }

  let barBorderClass = 'border-border-dim'
  if (isResolved) barBorderClass = 'border-accent-success/20'

  return (
    <div
      className={`flex items-stretch h-10 bg-bg-raised rounded-sm overflow-hidden relative border ${barBorderClass} transition-colors duration-300`}
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
        <div className="flex items-center px-2 font-mono text-[0.8125rem] tracking-wide whitespace-nowrap relative z-[2] w-full">
          {cascadeChars.map((c, i) => {
            const isTagChar = i < config.finalTag.length
            const borderRight = isTagChar && i === config.finalTag.length - 1
              ? { borderRight: '1px solid var(--color-border-dim)', paddingRight: '8px', marginRight: '8px' }
              : {}
            let color: string
            let textShadow = 'none'
            if (c.pulsing) {
              color = '#fff'
              textShadow = '0 0 8px rgba(34, 211, 122, 0.7)'
            } else if (c.settled) {
              color = 'var(--color-accent-success)'
            } else if (isTagChar) {
              color = 'var(--color-accent-primary)'
            } else {
              color = 'var(--color-text-dim)'
            }
            return (
              <span key={i} style={{ color, textShadow, display: 'inline-block', ...borderRight }}>
                {c.char}
              </span>
            )
          })}
        </div>
      ) : (
        <>
          <div
            className={`flex items-center px-2.5 font-mono text-[0.8125rem] font-medium tracking-wide whitespace-nowrap border-r relative z-[2] transition-colors duration-300 ${tagColorClass} ${isResolved ? 'border-accent-success/20' : 'border-border-dim'}`}
          >
            {tagText}
          </div>
          <div className="flex-1 flex items-center px-3 font-mono text-[0.8125rem] whitespace-nowrap overflow-hidden relative z-[2]">
            {isSkeleton && (
              <span className="text-text-dim pulse-text text-xs tracking-wide absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                AWAITING DATA...
              </span>
            )}
            {phase === 'decode' && (
              <>
                <span className="text-accent-primary">{config.finalData.substring(0, decodePos)}</span>
                <span className="text-text-dim opacity-50">{noiseText}</span>
              </>
            )}
            {isResolved && (
              <span className="text-accent-success">{config.finalData}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Compact row for dashboard recent-jobs ----

function CompactDemoRow({ config }: { config: DemoRowConfig }) {
  const [phase, setPhase] = useState<Phase>('skeleton')
  const [decodePos, setDecodePos] = useState(0)
  const [noiseText, setNoiseText] = useState('')
  const [cascadeChars, setCascadeChars] = useState<Array<{ char: string; settled: boolean; pulsing: boolean }>>([])
  const dataLen = config.finalData.length
  const decodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noiseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  const clearAllTimers = useCallback(() => {
    if (decodeIntervalRef.current) {
      clearInterval(decodeIntervalRef.current)
      decodeIntervalRef.current = null
    }
    if (noiseIntervalRef.current) {
      clearInterval(noiseIntervalRef.current)
      noiseIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const t = setTimeout(() => setPhase('decode'), config.startDelay)
    return () => { clearTimeout(t); clearAllTimers() }
  }, [config.startDelay, clearAllTimers])

  useEffect(() => {
    if (phase !== 'decode') return
    setDecodePos(0)
    setNoiseText(randomNoise(dataLen))
    decodeIntervalRef.current = setInterval(() => {
      setDecodePos(prev => {
        const next = prev + 2
        if (next >= dataLen) {
          if (decodeIntervalRef.current) { clearInterval(decodeIntervalRef.current); decodeIntervalRef.current = null }
          setTimeout(() => setPhase('cascade'), 100)
          return dataLen
        }
        return next
      })
    }, 60)
    noiseIntervalRef.current = setInterval(() => {
      setDecodePos(pos => { setNoiseText(randomNoise(dataLen - pos)); return pos })
    }, 80)
    return () => { clearAllTimers() }
  }, [phase, dataLen, clearAllTimers])

  useEffect(() => {
    if (phase !== 'cascade') return
    const fullString = config.finalTag + config.finalData
    const initialChars = fullString.split('').map((ch, i) => {
      if (i < config.finalTag.length) return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
      const dataIndex = i - config.finalTag.length
      if (dataIndex < decodePos) return { char: config.finalData[dataIndex], settled: false, pulsing: false }
      return { char: NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)], settled: false, pulsing: false }
    })
    setCascadeChars(initialChars)
    let idx = 0
    const ci = setInterval(() => {
      if (idx >= fullString.length) {
        clearInterval(ci)
        setTimeout(() => {
          setCascadeChars(prev => prev.map(c => ({ ...c, settled: true, pulsing: false })))
          setPhase('resolved')
          setTimeout(() => {
            setPhase('skeleton'); setDecodePos(0); setNoiseText(''); setCascadeChars([])
            setTimeout(() => setPhase('decode'), 1500)
          }, 3000)
        }, 150)
        return
      }
      setCascadeChars(prev => {
        const updated = [...prev]
        if (updated[idx]) updated[idx] = { char: fullString[idx], settled: false, pulsing: true }
        if (idx > 0 && updated[idx - 1]) updated[idx - 1] = { ...updated[idx - 1], pulsing: false, settled: true }
        return updated
      })
      idx++
    }, 20)
    return () => { clearInterval(ci) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const isResolved = phase === 'resolved'
  const isSkeleton = phase === 'skeleton'
  const isCascade = phase === 'cascade'

  let tagText = '[QUEUED]'
  let tagColorClass = 'text-text-dim'
  if (phase === 'decode') { tagText = '[SLICING]'; tagColorClass = 'text-accent-primary' }
  else if (phase === 'cascade' || phase === 'resolved') { tagText = '[COMPLETE]'; tagColorClass = 'text-accent-success' }

  let barBorderClass = 'border-border-dim'
  if (isResolved) barBorderClass = 'border-accent-success/20'

  return (
    <div className="bg-bg-surface border border-border-dim rounded-sm p-3.5 px-4.5">
      <div className="grid grid-cols-[1fr_minmax(140px,200px)_auto] gap-4 items-center">
        {/* Job info */}
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
        <div className={`flex items-stretch h-8 bg-bg-raised rounded-sm overflow-hidden relative border ${barBorderClass} transition-colors duration-300`}>
          <div
            className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-400"
            style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 8px, var(--accent-primary-glow-04) 8px, var(--accent-primary-glow-04) 16px)',
              animation: 'antenna-skeleton-shift 1s linear infinite',
              opacity: isResolved ? 0 : isSkeleton ? 1 : 0.3,
            }}
          />
          {isCascade ? (
            <div className="flex items-center px-2 font-mono text-[0.6875rem] tracking-wide whitespace-nowrap relative z-[2] w-full">
              {cascadeChars.map((c, i) => {
                const isTagChar = i < config.finalTag.length
                const borderRight = isTagChar && i === config.finalTag.length - 1
                  ? { borderRight: '1px solid var(--color-border-dim)', paddingRight: '6px', marginRight: '6px' }
                  : {}
                let color: string; let textShadow = 'none'
                if (c.pulsing) { color = '#fff'; textShadow = '0 0 8px rgba(34, 211, 122, 0.7)' }
                else if (c.settled) { color = 'var(--color-accent-success)' }
                else if (isTagChar) { color = 'var(--color-accent-primary)' }
                else { color = 'var(--color-text-dim)' }
                return <span key={i} style={{ color, textShadow, display: 'inline-block', ...borderRight }}>{c.char}</span>
              })}
            </div>
          ) : (
            <>
              <div className={`flex items-center px-2 font-mono text-[0.6875rem] font-medium tracking-wide whitespace-nowrap border-r relative z-[2] transition-colors duration-300 ${tagColorClass} ${isResolved ? 'border-accent-success/20' : 'border-border-dim'}`}>
                {tagText}
              </div>
              <div className="flex-1 flex items-center px-2 font-mono text-[0.6875rem] whitespace-nowrap overflow-hidden relative z-[2]">
                {isSkeleton && (
                  <span className="text-text-dim pulse-text text-[0.5625rem] tracking-wide absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    AWAITING...
                  </span>
                )}
                {phase === 'decode' && (
                  <>
                    <span className="text-accent-primary">{config.finalData.substring(0, decodePos)}</span>
                    <span className="text-text-dim opacity-50">{noiseText}</span>
                  </>
                )}
                {isResolved && <span className="text-accent-success">{config.finalData}</span>}
              </div>
            </>
          )}
        </div>

        {/* Time skeleton */}
        <div className="h-3 w-12 bg-bg-raised rounded-sm" style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, var(--accent-primary-glow-03) 6px, var(--accent-primary-glow-03) 12px)',
          animation: 'antenna-skeleton-shift 1s linear infinite',
        }} />
      </div>
    </div>
  )
}

const DASHBOARD_ROWS: DemoRowConfig[] = [
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:5\u00B71080p', startDelay: 500 },
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:3\u00B7720p', startDelay: 1600 },
  { name: '', query: '', finalTag: '[COMPLETE]', finalData: 'CLIPS:8\u00B71080p', startDelay: 2700 },
]

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

  return (
    <div className="space-y-4">
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
        <SingleFusedBarDemo config={detailConfig} />
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
