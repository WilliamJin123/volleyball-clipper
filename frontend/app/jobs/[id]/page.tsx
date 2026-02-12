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
      <main className="max-w-[1200px] mx-auto px-8 py-10 pb-20">
        <div className="animate-in">
          <JobDetail jobId={id} />
        </div>
      </main>
    </div>
  )
}
