import Link from 'next/link'
import { Header } from '@/components/layout'
import { JobList } from '@/components/jobs/job-list'

export default function JobsPage() {
  return (
    <div>
      <Header />
      <main className="max-w-[1200px] mx-auto px-8 py-10 pb-20">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 animate-in">
          <h1 className="font-display text-xl font-bold text-text-primary">
            Jobs
          </h1>
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
