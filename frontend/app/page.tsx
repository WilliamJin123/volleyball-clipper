import Link from 'next/link'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              AI-Powered
              <span className="text-foreground/70"> Volleyball </span>
              Clip Generation
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your volleyball videos and let AI find the moments that matter.
              Describe what you&apos;re looking for, and get perfect clips in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                step="1"
                title="Upload Your Video"
                description="Upload any volleyball game or practice footage. We support most common video formats."
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                }
              />
              <FeatureCard
                step="2"
                title="Describe Your Clips"
                description="Use natural language to describe what you're looking for: 'Me setting the ball', 'Spike attempts', etc."
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                }
              />
              <FeatureCard
                step="3"
                title="Get Your Clips"
                description="Our AI analyzes your video and automatically generates clips of matching moments."
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              Perfect For
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <UseCaseCard
                title="Players"
                description="Review your plays, track improvement, and build highlight reels for recruiters."
              />
              <UseCaseCard
                title="Coaches"
                description="Quickly find teaching moments and create training material from game footage."
              />
              <UseCaseCard
                title="Teams"
                description="Analyze opponent strategies and review team performance efficiently."
              />
              <UseCaseCard
                title="Parents"
                description="Capture and share your athlete's best moments without hours of editing."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 bg-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-background mb-4">
              Ready to find your best plays?
            </h2>
            <p className="text-background/70 mb-8">
              Start generating clips from your volleyball videos today.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="!bg-background !text-foreground hover:!bg-background/90"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-8 border-t border-border">
          <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
            <p>Volleyball Clipper - AI-powered video analysis</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

interface FeatureCardProps {
  step: string
  title: string
  description: string
  icon: React.ReactNode
}

function FeatureCard({ step, title, description, icon }: FeatureCardProps) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted text-foreground mb-4">
        {icon}
      </div>
      <div className="text-sm font-medium text-muted-foreground mb-2">
        Step {step}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

interface UseCaseCardProps {
  title: string
  description: string
}

function UseCaseCard({ title, description }: UseCaseCardProps) {
  return (
    <div className="p-6 bg-card rounded-xl shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
