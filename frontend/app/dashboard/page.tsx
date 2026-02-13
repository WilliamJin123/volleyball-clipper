import Link from 'next/link'
import { Sidebar } from '@/components/layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { VideoList } from '@/components/dashboard/video-list'
import { RecentJobs } from '@/components/dashboard/recent-jobs'
import { NetDivider } from '@/components/ui/net-divider'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-12 pb-24">
        {/* Hero Section */}
        <div className="glass-panel rounded-sm rounded-b-none py-14 px-6 text-center border border-b-0 border-border-dim animate-in">
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight text-text-primary mb-3">
            <span className="text-accent-primary">//</span> VOLLEYCLIP
          </h1>
          <p className="font-body text-[1.0625rem] text-text-secondary mb-9">
            AI-powered volleyball clip extraction
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/upload"
              className="dashboard-cta-primary inline-flex items-center px-6 py-2.5 rounded-sm
                bg-accent-primary text-white font-display font-semibold text-sm
                transition-all duration-200 hover:-translate-y-px"
            >
              Upload Video
            </Link>
            <Link
              href="/jobs/new"
              className="dashboard-cta-secondary inline-flex items-center px-6 py-2.5 rounded-sm
                bg-transparent text-accent-secondary border border-accent-secondary
                font-display font-semibold text-sm
                transition-all duration-200 hover:-translate-y-px hover:bg-accent-secondary/5"
            >
              Create Job
            </Link>
          </div>
        </div>
        {/* Stats Strip */}
        <div className="animate-in animate-delay-1">
          <StatsCards />
        </div>

        {/* Net Divider */}
        <div className="animate-in animate-delay-2">
          <NetDivider />
        </div>

        {/* Recent Clips */}
        <div className="animate-in animate-delay-3">
          <VideoList />
        </div>

        {/* Net Divider */}
        <div className="animate-in animate-delay-4">
          <NetDivider />
        </div>

        {/* Active Jobs */}
        <div className="animate-in animate-delay-5">
          <RecentJobs />
        </div>
      </main>
    </div>
  )
}

