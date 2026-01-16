import Link from 'next/link'
import { Header } from '@/components/layout'
import { JobList } from '@/components/jobs/job-list'
import { Button } from '@/components/ui'

export default function JobsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Jobs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your clip generation jobs
            </p>
          </div>
          <Link href="/jobs/new">
            <Button>New Job</Button>
          </Link>
        </div>

        <JobList />
      </main>
    </div>
  )
}
