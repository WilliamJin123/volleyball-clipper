import Link from 'next/link'
import { Header } from '@/components/layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { VideoList } from '@/components/dashboard/video-list'
import { RecentJobs } from '@/components/dashboard/recent-jobs'

export default function DashboardPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>Dashboard</h1>
        <Link href="/upload">Upload Video</Link>
        <StatsCards />
        <section>
          <h2>Your Videos</h2>
          <VideoList />
        </section>
        <section>
          <h2>Recent Jobs</h2>
          <RecentJobs />
        </section>
      </main>
    </div>
  )
}
