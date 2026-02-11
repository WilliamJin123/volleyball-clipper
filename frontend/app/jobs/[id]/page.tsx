import Link from 'next/link'
import { Header } from '@/components/layout'
import { JobDetail } from '@/components/jobs/job-detail'

interface JobPageProps {
  params: Promise<{ id: string }>
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params

  return (
    <div>
      <Header />
      <main>
        <Link href="/jobs">Back to Jobs</Link>
        <JobDetail jobId={id} />
      </main>
    </div>
  )
}
