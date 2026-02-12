'use client'

import Link from 'next/link'
import { Header } from '@/components/layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { VideoList } from '@/components/dashboard/video-list'
import { RecentJobs } from '@/components/dashboard/recent-jobs'
import { NetDivider } from '@/components/ui/net-divider'

export default function DashboardPage() {
  return (
    <div>
      <Header />
      <main className="max-w-[1120px] mx-auto px-6 py-12 pb-24">
        {/* Hero Section */}
        <div className="glass-panel rounded-sm py-14 px-6 text-center mb-10 border border-border-dim animate-in">
          <h1 className="font-display font-bold text-4xl tracking-tight text-text-primary mb-3">
            <span className="text-accent-primary">//</span> VOLLEYCLIP
          </h1>
          <p className="font-body text-[1.0625rem] text-text-secondary mb-9">
            AI-powered volleyball clip extraction
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center px-6 py-2.5 rounded-sm
                bg-accent-primary text-white font-display font-semibold text-sm
                transition-all duration-200 hover:-translate-y-px"
              style={{
                boxShadow:
                  '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 0 28px rgba(255, 90, 31, 0.25), 0 0 56px rgba(255, 90, 31, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 0 20px rgba(255, 90, 31, 0.15), 0 0 40px rgba(255, 90, 31, 0.08)'
              }}
            >
              Upload Video
            </Link>
            <Link
              href="/jobs/new"
              className="inline-flex items-center px-6 py-2.5 rounded-sm
                bg-transparent text-accent-secondary border border-accent-secondary
                font-display font-semibold text-sm
                transition-all duration-200 hover:-translate-y-px hover:bg-accent-secondary/5"
              style={{
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 0 24px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 0 16px rgba(59, 130, 246, 0.08)'
              }}
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
