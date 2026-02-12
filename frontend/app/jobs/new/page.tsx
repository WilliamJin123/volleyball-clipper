import Link from 'next/link'
import { Header } from '@/components/layout'
import { CreateJobForm } from '@/components/jobs/create-job-form'

export default function NewJobPage() {
  return (
    <div>
      <Header />
      <main className="max-w-[1200px] mx-auto px-8 py-10 pb-20">
        {/* Page Header */}
        <div className="mb-8 animate-in">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-text-dim
              hover:text-accent-primary transition-colors duration-150 mb-3"
          >
            <span className="text-sm leading-none">{'\u2190'}</span>
            Back to Jobs
          </Link>
          <h1 className="font-display text-xl font-bold text-text-primary">
            New Clip Job
          </h1>
          <p className="font-mono text-xs text-text-dim mt-1">
            Select a video and describe the moments you want to extract.
          </p>
        </div>

        {/* Form - expanded by default on dedicated page */}
        <div className="animate-in animate-delay-1">
          <CreateJobForm defaultExpanded={true} />
        </div>
      </main>
    </div>
  )
}
