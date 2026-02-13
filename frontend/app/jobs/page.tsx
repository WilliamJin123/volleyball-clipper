'use client'

import Link from 'next/link'
import { Sidebar } from '@/components/layout'
import { JobList } from '@/components/jobs/job-list'
import { useJobs } from '@/lib/hooks'

export default function JobsPage() {
  const { jobs } = useJobs()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-10 pb-20">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4 animate-in">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl font-bold text-text-primary">
              Jobs
            </h1>
            <span className="font-mono text-[0.8125rem] text-text-dim">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Link
            href="/jobs/new"
            className="px-3 py-1.5 bg-accent-primary text-bg-void font-mono text-xs font-medium
              rounded-sm hover:bg-accent-primary/90 transition-colors duration-150"
          >
            + New Job
          </Link>
        </div>

        {/* Job List with Filter Tabs */}
        <div className="animate-in animate-delay-1">
          <JobList />
        </div>
      </main>
    </div>
  )
}
