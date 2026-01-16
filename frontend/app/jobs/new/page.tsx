import { Header } from '@/components/layout'
import { CreateJobForm } from '@/components/jobs/create-job-form'

export default function NewJobPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Clip Job
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a new job to generate clips from your videos
          </p>
        </div>

        <CreateJobForm />
      </main>
    </div>
  )
}
