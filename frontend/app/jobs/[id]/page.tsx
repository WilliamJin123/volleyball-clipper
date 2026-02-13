import { Sidebar } from '@/components/layout'
import { JobDetail } from '@/components/jobs/job-detail'

interface JobPageProps {
  params: Promise<{ id: string }>
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-10 pb-20">
        <div className="animate-in">
          <JobDetail jobId={id} />
        </div>
      </main>
    </div>
  )
}
