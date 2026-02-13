'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ── Types ────────────────────────────────────────────

export type TerminalLineColor =
  | 'op'       // accent-secondary (blue) - operations
  | 'val'      // text-secondary - values
  | 'ok'       // accent-success (green) - success
  | 'err'      // accent-error (red) - errors
  | 'warn'     // accent-warning (yellow) - warnings
  | 'hot'      // accent-hot (magenta) - highlights
  | 'primary'  // accent-primary (orange) - timestamps/ranges
  | 'dim'      // text-dim - muted

export interface TerminalLine {
  /** Prefix tag like [INDEX], [SLICE], [DONE] */
  prefix: string
  /** Color class for the prefix */
  prefixClass: TerminalLineColor
  /** Main text content */
  text: string
  /** Color class for the main text */
  textClass: TerminalLineColor
  /** Optional suffix (e.g. status result) */
  suffix?: string
  /** Color class for the suffix */
  suffixClass?: TerminalLineColor
}

interface StreamingTerminalProps {
  /** Lines to type out */
  lines: TerminalLine[]
  /** Whether the terminal is currently active (typing) */
  active?: boolean
  /** Delay before starting (ms) */
  startDelay?: number
  /** Typing speed for prefix characters (ms) */
  prefixSpeed?: number
  /** Base typing speed for text characters (ms) */
  textSpeed?: number
  /** Random jitter added to text speed (ms) */
  textJitter?: number
  /** Delay between lines (ms) */
  linePause?: number
  /** Random jitter added to line pause (ms) */
  linePauseJitter?: number
  /** Additional CSS class */
  className?: string
  /** Max height before scrolling */
  maxHeight?: string
  /** Called when all lines have finished typing */
  onComplete?: () => void
  /** If true, show all lines instantly (skip animation) */
  skipAnimation?: boolean
}

// ── Color map from playground class names to Tailwind tokens ──

const colorMap: Record<TerminalLineColor, string> = {
  op: 'text-accent-secondary',
  val: 'text-text-secondary',
  ok: 'text-accent-success',
  err: 'text-accent-error',
  warn: 'text-accent-warning',
  hot: 'text-accent-hot',
  primary: 'text-accent-primary',
  dim: 'text-text-dim',
}

// ── Component ─────────────────────────────────────────

export function StreamingTerminal({
  lines,
  active = true,
  startDelay = 300,
  prefixSpeed = 15,
  textSpeed = 20,
  textJitter = 30,
  linePause = 300,
  linePauseJitter = 400,
  className = '',
  maxHeight = '280px',
  onComplete,
  skipAnimation = false,
}: StreamingTerminalProps) {
  // Track which lines are fully rendered and the current typing state
  const [completedLines, setCompletedLines] = useState<TerminalLine[]>([])
  const [currentLineIdx, setCurrentLineIdx] = useState(0)
  const [currentCharIdx, setCurrentCharIdx] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLinesLenRef = useRef(0)

  // Memoize the stable line count to detect new lines added
  const lineCount = lines.length

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // When skipAnimation is true or active becomes false, show everything
  useEffect(() => {
    if (skipAnimation) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setCompletedLines([...lines])
      setCurrentLineIdx(lines.length)
      setCurrentCharIdx(0)
      setIsTyping(false)
      setAllDone(true)
    }
  }, [skipAnimation, lines])

  // Handle new lines being appended while the terminal is active
  useEffect(() => {
    if (skipAnimation) return
    if (!active) return

    // If new lines arrived and we were done, resume typing
    if (lineCount > prevLinesLenRef.current && allDone) {
      setAllDone(false)
      setIsTyping(true)
    }

    prevLinesLenRef.current = lineCount
  }, [lineCount, active, allDone, skipAnimation])

  // Start typing after delay
  useEffect(() => {
    if (skipAnimation) return
    if (!active) return
    if (lines.length === 0) return

    timerRef.current = setTimeout(() => {
      setIsTyping(true)
    }, startDelay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // Only start once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startDelay, skipAnimation])

  // The main typing tick
  const tick = useCallback(() => {
    if (!active || skipAnimation) return

    if (currentLineIdx >= lines.length) {
      setIsTyping(false)
      setAllDone(true)
      onComplete?.()
      return
    }

    const line = lines[currentLineIdx]
    const fullText = line.prefix + ' ' + line.text + (line.suffix || '')

    if (currentCharIdx <= fullText.length) {
      // Still typing current line
      setCurrentCharIdx((prev) => prev + 1)

      const prefixEnd = line.prefix.length
      const speed =
        currentCharIdx <= prefixEnd
          ? prefixSpeed
          : textSpeed + Math.random() * textJitter

      timerRef.current = setTimeout(tick, speed)
    } else {
      // Line complete, add to completed and move on
      setCompletedLines((prev) => [...prev, line])
      setCurrentLineIdx((prev) => prev + 1)
      setCurrentCharIdx(0)

      timerRef.current = setTimeout(tick, linePause + Math.random() * linePauseJitter)
    }
  }, [
    active,
    skipAnimation,
    currentLineIdx,
    currentCharIdx,
    lines,
    prefixSpeed,
    textSpeed,
    textJitter,
    linePause,
    linePauseJitter,
    onComplete,
  ])

  // Drive the tick loop
  useEffect(() => {
    if (isTyping && !skipAnimation) {
      tick()
    }
    // Only re-trigger when isTyping starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping])

  // Re-trigger tick on char/line change
  useEffect(() => {
    // This is driven by the setTimeout in tick itself
  }, [currentCharIdx, currentLineIdx])

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [completedLines, currentCharIdx])

  // Build the partial HTML for the currently-typing line
  const currentLineHtml = useMemo(() => {
    if (skipAnimation) return null
    if (currentLineIdx >= lines.length) return null

    const line = lines[currentLineIdx]
    const fullText = line.prefix + ' ' + line.text + (line.suffix || '')
    const partial = fullText.substring(0, currentCharIdx)

    const prefixEnd = line.prefix.length
    const textEnd = prefixEnd + 1 + line.text.length

    if (currentCharIdx <= prefixEnd) {
      return (
        <span className={colorMap[line.prefixClass]}>{partial}</span>
      )
    } else if (currentCharIdx <= textEnd) {
      return (
        <>
          <span className={colorMap[line.prefixClass]}>{line.prefix}</span>
          {' '}
          <span className={colorMap[line.textClass]}>
            {partial.substring(prefixEnd + 1)}
          </span>
        </>
      )
    } else {
      return (
        <>
          <span className={colorMap[line.prefixClass]}>{line.prefix}</span>
          {' '}
          <span className={colorMap[line.textClass]}>{line.text}</span>
          <span className={colorMap[line.suffixClass || 'val']}>
            {partial.substring(textEnd)}
          </span>
        </>
      )
    }
  }, [currentLineIdx, currentCharIdx, lines, skipAnimation])

  return (
    <div
      ref={containerRef}
      className={`
        bg-bg-surface border border-border-dim rounded-sm
        px-5 py-4
        font-mono text-[0.8125rem] leading-[1.8]
        overflow-y-auto
        ${className}
      `}
      style={{ maxHeight, minHeight: '80px' }}
    >
      {/* Completed lines */}
      {completedLines.map((line, i) => (
        <div key={i} className="text-text-dim">
          <span className={colorMap[line.prefixClass]}>{line.prefix}</span>
          {' '}
          <span className={colorMap[line.textClass]}>{line.text}</span>
          {line.suffix && (
            <span className={colorMap[line.suffixClass || 'val']}>
              {line.suffix}
            </span>
          )}
        </div>
      ))}

      {/* Currently typing line */}
      {isTyping && currentLineHtml && (
        <div className="text-text-dim">
          {currentLineHtml}
          <span
            className="inline-block w-[2px] h-[14px] align-middle ml-[1px]"
            style={{
              background: 'var(--accent-primary-glow-70)',
              animation: 'cursor-blink 0.8s step-end infinite',
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {lines.length === 0 && active && (
        <div className="text-text-dim">
          <span
            className="inline-block w-[2px] h-[14px] align-middle"
            style={{
              background: 'var(--accent-primary-glow-70)',
              animation: 'cursor-blink 0.8s step-end infinite',
            }}
          />
        </div>
      )}
    </div>
  )
}
