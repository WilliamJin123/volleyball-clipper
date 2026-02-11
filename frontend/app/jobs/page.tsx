import Link from 'next/link'
import { Header } from '@/components/layout'
import { JobList } from '@/components/jobs/job-list'

export default function JobsPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>Jobs</h1>
        <Link href="/jobs/new">New Job</Link>
        <JobList />
      </main>
    </div>
  )
}
