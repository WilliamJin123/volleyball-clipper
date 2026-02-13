'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useClips, useAnimatedList, useFlipAnimation } from '@/lib/hooks'
import { NetDivider } from '@/components/ui/net-divider'
import { ClipCard } from './clip-card'

const FILTER_CATEGORIES = ['All', 'Kills', 'Blocks', 'Serves', 'Digs'] as const
type FilterCategory = (typeof FILTER_CATEGORIES)[number]

const CLIPS_PER_PAGE = 12

export function ClipGallery() {
  const { clips, loading, error } = useClips()
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortNewest, setSortNewest] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const filtersRef = useRef<HTMLDivElement>(null)
  const [filterIndicator, setFilterIndicator] = useState({ left: 0, width: 0, ready: false })
  const [filterCanAnimate, setFilterCanAnimate] = useState(false)
  const [sortTransition, setSortTransition] = useState(false)
  const [filterFading, setFilterFading] = useState(false)
  const [suppressAnim, setSuppressAnim] = useState(false)

  const measureFilter = useCallback(() => {
    const container = filtersRef.current
    if (!container) return null
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement
    if (!activeEl) return null
    const containerRect = container.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    return { left: elRect.left - containerRect.left, width: elRect.width }
  }, [])

  useEffect(() => {
    const pos = measureFilter()
    if (!pos) return
    setFilterIndicator({ ...pos, ready: true })
  }, [activeFilter, loading, measureFilter])

  useEffect(() => {
    if (filterIndicator.ready && !filterCanAnimate) {
      requestAnimationFrame(() => setFilterCanAnimate(true))
    }
  }, [filterIndicator.ready, filterCanAnimate])

  // Filter and search clips
  const filteredClips = useMemo(() => {
    let result = [...clips]

    // Filter by category
    if (activeFilter !== 'All') {
      const filterLower = activeFilter.toLowerCase()
      result = result.filter((clip) => {
        const query = clip.jobs?.query?.toLowerCase() || ''
        return query.includes(filterLower)
      })
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((clip) => {
        const query = clip.jobs?.query?.toLowerCase() || ''
        const id = clip.id.toLowerCase()
        return query.includes(q) || id.includes(q)
      })
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortNewest ? dateB - dateA : dateA - dateB
    })

    return result
  }, [clips, activeFilter, searchQuery, sortNewest])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredClips.length / CLIPS_PER_PAGE))
  const paginatedClips = filteredClips.slice(
    (currentPage - 1) * CLIPS_PER_PAGE,
    currentPage * CLIPS_PER_PAGE
  )

  // Animated list for smooth enter/exit transitions during search
  const animatedClips = useAnimatedList(paginatedClips, { exitDuration: 300, enterDuration: 300 })

  // FLIP animation: smoothly reposition visible items when exiting items are removed
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const visibleClipKeys = useMemo(
    () => animatedClips.filter((a) => a.status === 'visible').map((a) => a.key),
    [animatedClips]
  )
  useFlipAnimation(gridContainerRef, visibleClipKeys)

  // Reset page when filters change — cross-fade to prevent double animation
  const handleFilterChange = (filter: FilterCategory) => {
    if (filter === activeFilter) return
    setFilterFading(true)
    setSuppressAnim(true)
    setTimeout(() => {
      setActiveFilter(filter)
      setCurrentPage(1)
      setTimeout(() => setFilterFading(false), 30)
      setTimeout(() => setSuppressAnim(false), 350)
    }, 120)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Loading state
  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex justify-between items-baseline mb-6">
          <div className="h-7 w-40 bg-bg-raised rounded-sm animate-pulse" />
          <div className="h-4 w-28 bg-bg-raised rounded-sm animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex justify-between flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-16 bg-bg-raised rounded-sm animate-pulse" />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-full sm:w-[200px] bg-bg-raised rounded-sm animate-pulse" />
            <div className="h-8 w-28 bg-bg-raised rounded-sm animate-pulse" />
          </div>
        </div>

        <NetDivider />

        {/* Card grid skeleton */}
        <div className="grid gap-5 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-bg-surface border border-border-dim rounded-sm overflow-hidden">
              <div className="aspect-video bg-bg-raised animate-pulse" />
              <div className="px-4 py-3.5">
                <div className="h-4 w-3/4 bg-bg-raised rounded-sm animate-pulse mb-2" />
                <div className="h-3 w-1/2 bg-bg-raised rounded-sm animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="font-display font-bold text-xl sm:text-2xl">Your Clips</h1>
        </div>
        <NetDivider />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="font-mono text-sm text-accent-error mb-2">[ERROR]</p>
          <p className="font-body text-text-secondary text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (clips.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="font-display font-bold text-xl sm:text-2xl">Your Clips</h1>
          <span className="font-mono text-[0.8125rem] text-text-dim">0 clips</span>
        </div>
        <NetDivider />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="font-mono text-sm text-text-dim mb-4">[NO CLIPS YET]</p>
          <p className="font-body text-text-secondary text-sm mb-6">
            Create a job to generate clips from your videos.
          </p>
          <Link
            href="/jobs/new"
            className="font-mono text-xs font-medium px-4 py-2 rounded-sm border border-accent-primary text-accent-primary hover:bg-accent-primary/10 transition-colors duration-150"
          >
            CREATE JOB
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-baseline mb-6">
        <h1 className="font-display font-bold text-xl sm:text-2xl">Your Clips</h1>
        <span className="font-mono text-[0.8125rem] text-text-dim">
          {filteredClips.length} clip{filteredClips.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 mb-6">
        {/* Left: Filter tabs */}
        <div ref={filtersRef} className="relative flex overflow-x-auto -mx-1 px-1">
          {FILTER_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterChange(category)}
              data-active={activeFilter === category}
              className={`
                font-mono text-xs px-4 py-2 cursor-pointer
                transition-colors duration-150 relative
                ${
                  activeFilter === category
                    ? 'text-accent-primary'
                    : 'text-text-dim hover:text-text-secondary'
                }
              `}
            >
              {category}
            </button>
          ))}

          {/* Sliding indicator */}
          <span
            className={`absolute bottom-0 h-px bg-accent-primary pointer-events-none ${
              filterCanAnimate ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
            }`}
            style={{
              left: `${filterIndicator.left}px`,
              width: `${filterIndicator.width}px`,
              opacity: filterIndicator.ready ? 1 : 0,
              boxShadow: '0 0 8px var(--accent-primary-glow-50)',
            }}
          />
        </div>

        {/* Right: Search + Sort */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="font-mono text-xs px-3.5 py-1.5 rounded-sm border border-border-dim bg-bg-surface text-text-primary w-full sm:w-[200px] placeholder:text-text-dim outline-none transition-all duration-150 focus:border-border-bright"
            style={{ boxShadow: 'none' }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 8px var(--accent-primary-glow-08)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={() => {
              setSortTransition(true)
              setTimeout(() => {
                setSortNewest(!sortNewest)
                setTimeout(() => setSortTransition(false), 50)
              }, 150)
            }}
            className="font-mono text-xs font-medium px-3.5 py-1.5 rounded-sm border border-border-dim text-text-secondary hover:border-border-bright hover:text-text-primary transition-all duration-150 cursor-pointer whitespace-nowrap"
          >
            SORT: {sortNewest ? 'NEWEST' : 'OLDEST'}
          </button>
        </div>
      </div>

      <NetDivider />

      {/* Clip Grid */}
      <div
        className={`transition-opacity duration-[120ms] ease-in-out ${suppressAnim ? 'suppress-list-anim' : ''}`}
        style={{ opacity: filterFading ? 0 : 1 }}
      >
      <div
        ref={gridContainerRef}
        className="grid gap-5 mb-10 transition-[opacity,transform] duration-200"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          opacity: sortTransition ? 0 : 1,
          transform: sortTransition ? 'translateY(6px)' : 'translateY(0)',
        }}
      >
        {animatedClips.map(({ item: clip, status, key }) => (
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
            <ClipCard
              clip={clip}
              index={paginatedClips.indexOf(clip) !== -1
                ? (currentPage - 1) * CLIPS_PER_PAGE + paginatedClips.indexOf(clip) + 1
                : 0}
            />
          </div>
        ))}
      </div>

      {/* No results for filter */}
      {filteredClips.length === 0 && animatedClips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 mb-10">
          <p className="font-mono text-sm text-text-dim mb-2">[NO MATCHES]</p>
          <p className="font-body text-text-secondary text-sm">
            No clips match your current filter.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-5 py-4 pb-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`
              font-mono text-xs font-medium px-3.5 py-1.5 rounded-sm border
              transition-all duration-150
              ${
                currentPage === 1
                  ? 'border-border-dim text-text-dim opacity-40 cursor-not-allowed'
                  : 'border-border-dim text-text-secondary hover:border-border-bright hover:text-text-primary cursor-pointer'
              }
            `}
          >
            PREV
          </button>
          <span className="font-mono text-xs text-text-dim tracking-wide">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`
              font-mono text-xs font-medium px-3.5 py-1.5 rounded-sm border
              transition-all duration-150
              ${
                currentPage === totalPages
                  ? 'border-border-dim text-text-dim opacity-40 cursor-not-allowed'
                  : 'border-border-dim text-text-secondary hover:border-border-bright hover:text-text-primary cursor-pointer'
              }
            `}
          >
            NEXT
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
