import { Header } from '@/components/layout'
import { CreateJobForm } from '@/components/jobs/create-job-form'

export default function NewJobPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>New Clip Job</h1>
        <CreateJobForm />
      </main>
    </div>
  )
}
