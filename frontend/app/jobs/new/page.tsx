import Link from 'next/link'
import { Sidebar } from '@/components/layout'
import { CreateJobForm } from '@/components/jobs/create-job-form'

export default function NewJobPage() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-10 pb-20">
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
