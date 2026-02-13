'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useJobs, useAnimatedList, useFlipAnimation } from '@/lib/hooks'
import { FusedBar } from '@/components/ui/fused-bar'
import { NetDivider } from '@/components/ui/net-divider'
import type { JobWithVideo } from '@/lib/types/database'

const JobLoadingDemo = dynamic(
  () => import('@/components/jobs/job-loading-demo').then(m => ({ default: m.JobLoadingDemo })),
  { ssr: false, loading: () => <div className="animate-pulse bg-bg-surface rounded-sm h-48" /> }
)
import type { JobStatus } from '@/lib/types/database'

type FilterTab = 'all' | 'active' | 'complete' | 'failed'

function relativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function filterJobs(jobs: JobWithVideo[], tab: FilterTab): JobWithVideo[] {
  switch (tab) {
    case 'active':
      return jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
    case 'complete':
      return jobs.filter((j) => j.status === 'completed')
    case 'failed':
      return jobs.filter((j) => j.status === 'failed')
    default:
      return jobs
  }
}

function getRowHoverClass(status: JobStatus): string {
  switch (status) {
    case 'failed':
      return 'border-accent-error/20 hover:border-accent-error/35'
    case 'completed':
      return 'hover:border-border-bright'
    case 'processing':
    case 'pending':
      return 'hover:border-border-bright'
    default:
      return 'hover:border-border-bright'
  }
}

function getRowGlowStyle(status: JobStatus): React.CSSProperties {
  switch (status) {
    case 'failed':
      return { boxShadow: '0 0 12px var(--accent-error-glow-08)' }
    case 'completed':
      return { boxShadow: '0 0 12px var(--accent-success-glow-08)' }
    case 'processing':
    case 'pending':
      return { boxShadow: '0 0 12px var(--accent-primary-glow-08)' }
    default:
      return {}
  }
}

function JobRow({ job }: { job: JobWithVideo }) {
  const [hovered, setHovered] = useState(false)
  const clipCount = (job as JobWithVideo & { clips?: unknown[] }).clips?.length
  const displayName = job.videos?.filename || 'Untitled Job'

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <div
        className={`
          flex flex-col gap-2 md:grid md:items-center px-4 md:px-5 py-3 md:py-4
          bg-bg-surface border border-border-dim rounded-sm
          cursor-pointer transition-all duration-150
          ${getRowHoverClass(job.status)}
        `}
        style={{
          gridTemplateColumns: '1fr 320px 80px 100px',
          ...(hovered ? getRowGlowStyle(job.status) : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Job Info */}
        <div className="min-w-0 md:pr-4 flex items-center justify-between md:block">
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-text-primary truncate">
              {displayName}
            </p>
            <p className="font-mono text-xs text-text-dim truncate">
              &quot;{job.query}&quot;
            </p>
          </div>
          <span className="md:hidden font-mono text-xs text-text-dim shrink-0 ml-2">
            {relativeTime(job.created_at)}
          </span>
        </div>

        {/* Fused Bar */}
        <div className="md:px-2">
          <FusedBar status={job.status} clipCount={clipCount} />
        </div>

        {/* Clips — hidden on mobile */}
        <div className="hidden md:block text-center">
          <span className="font-mono text-xs text-text-secondary">
            {job.status === 'completed' && clipCount !== undefined
              ? clipCount
              : '\u2014'}
          </span>
        </div>

        {/* Time — hidden on mobile (shown inline above) */}
        <div className="hidden md:block text-right">
          <span className="font-mono text-xs text-text-dim">
            {relativeTime(job.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function JobList() {
  const { jobs, loading, error } = useJobs()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [tabFading, setTabFading] = useState(false)
  const [suppressAnim, setSuppressAnim] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, ready: false })
  const [tabCanAnimate, setTabCanAnimate] = useState(false)

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'complete', label: 'Complete' },
    { key: 'failed', label: 'Failed' },
  ]

  const measureTab = useCallback(() => {
    const container = tabsRef.current
    if (!container) return null
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement
    if (!activeEl) return null
    const containerRect = container.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    return { left: elRect.left - containerRect.left, width: elRect.width }
  }, [])

  useEffect(() => {
    const pos = measureTab()
    if (!pos) return
    setTabIndicator({ ...pos, ready: true })
  }, [activeTab, measureTab])

  useEffect(() => {
    if (tabIndicator.ready && !tabCanAnimate) {
      requestAnimationFrame(() => setTabCanAnimate(true))
    }
  }, [tabIndicator.ready, tabCanAnimate])

  const filteredJobs = useMemo(() => {
    let result = filterJobs(jobs, activeTab)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((job) => {
        const query = job.query.toLowerCase()
        const filename = job.videos?.filename?.toLowerCase() || ''
        const id = job.id.toLowerCase()
        return query.includes(q) || filename.includes(q) || id.includes(q)
      })
    }

    return result
  }, [jobs, activeTab, searchQuery])

  // Animated list for smooth enter/exit transitions during search
  const animatedJobs = useAnimatedList(filteredJobs, { exitDuration: 300, enterDuration: 300 })

  // FLIP animation: smoothly reposition visible items when exiting items are removed
  const listContainerRef = useRef<HTMLDivElement>(null)
  const visibleKeys = useMemo(
    () => animatedJobs.filter((a) => a.status === 'visible').map((a) => a.key),
    [animatedJobs]
  )
  useFlipAnimation(listContainerRef, visibleKeys)

  return (
    <div>
      {/* Filter Tabs + Search */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        {/* Left: Filter tabs */}
        <div ref={tabsRef} className="relative flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === activeTab) return
                setTabFading(true)
                setSuppressAnim(true)
                setTimeout(() => {
                  setActiveTab(tab.key)
                  setTimeout(() => setTabFading(false), 30)
                  setTimeout(() => setSuppressAnim(false), 350)
                }, 120)
              }}
              data-active={activeTab === tab.key}
              className={`
                font-mono text-xs px-4 py-2 cursor-pointer
                transition-colors duration-150 relative
                ${
                  activeTab === tab.key
                    ? 'text-accent-primary'
                    : 'text-text-dim hover:text-text-secondary'
                }
              `}
            >
              {tab.label}
            </button>
          ))}

          {/* Sliding indicator */}
          <span
            className={`absolute bottom-0 h-px bg-accent-primary pointer-events-none ${
              tabCanAnimate ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
            }`}
            style={{
              left: `${tabIndicator.left}px`,
              width: `${tabIndicator.width}px`,
              opacity: tabIndicator.ready ? 1 : 0,
              boxShadow: '0 0 8px var(--accent-primary-glow-50)',
            }}
          />
        </div>

        {/* Right: Search */}
        <input
          type="text"
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="font-mono text-xs px-3.5 py-1.5 rounded-sm border border-border-dim bg-bg-surface text-text-primary w-full sm:w-[200px] placeholder:text-text-dim outline-none transition-all duration-150 focus:border-border-bright"
          style={{ boxShadow: 'none' }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 8px var(--accent-primary-glow-08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Net Divider */}
      <NetDivider className="!my-4" />

      {/* Column Headers — hidden on mobile */}
      <div
        className="hidden md:grid px-5 pb-3"
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

      {/* Job List */}
      <div
        className={`transition-opacity duration-[120ms] ease-in-out ${suppressAnim ? 'suppress-list-anim' : ''}`}
        style={{ opacity: tabFading ? 0 : 1 }}
      >
      {loading ? (
        <JobLoadingDemo />
      ) : error ? (
        <div className="bg-bg-surface border border-accent-error/20 rounded-sm px-5 py-8 text-center">
          <p className="font-mono text-xs text-accent-error" role="alert">
            {error}
          </p>
        </div>
      ) : filteredJobs.length === 0 && animatedJobs.length === 0 ? (
        <div className="bg-bg-surface border border-border-dim rounded-sm px-5 py-12 text-center">
          <p className="font-mono text-xs text-text-dim mb-3">
            {searchQuery
              ? 'No jobs match your search.'
              : activeTab === 'all'
                ? 'No jobs yet. Create your first clip job.'
                : `No ${activeTab} jobs.`}
          </p>
          {activeTab === 'all' && !searchQuery && (
            <Link
              href="/jobs/new"
              className="inline-block font-mono text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              + Create Job
            </Link>
          )}
        </div>
      ) : (
        <div ref={listContainerRef} className="flex flex-col gap-0.5">
          {animatedJobs.map(({ item: job, status, key }) => (
            <div
              key={key}
              data-flip-key={status === 'visible' ? key : undefined}
              className={
                status === 'exiting'
                  ? 'list-item-exiting'
                  : status === 'entering'
                    ? 'list-item-entering'
                    : ''
              }
            >
              <JobRow job={job} />
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
