import Link from 'next/link'
import { Header } from '@/components/layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { VideoList } from '@/components/dashboard/video-list'
import { RecentJobs } from '@/components/dashboard/recent-jobs'
import { Button } from '@/components/ui'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back! Here&apos;s an overview of your activity.
            </p>
          </div>
          <Link href="/upload">
            <Button>Upload Video</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards />
        </div>

        {/* Two-column layout for videos and jobs */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Videos
              </h2>
              <Link href="/upload">
                <Button variant="ghost" size="sm">
                  Upload
                </Button>
              </Link>
            </div>
            <VideoList />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Jobs
              </h2>
              <Link href="/jobs/new">
                <Button variant="ghost" size="sm">
                  New Job
                </Button>
              </Link>
            </div>
            <RecentJobs />
          </div>
        </div>
      </main>
    </div>
  )
}
