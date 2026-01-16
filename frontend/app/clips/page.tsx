import { Header } from '@/components/layout'
import { ClipGallery } from '@/components/clips/clip-gallery'

export default function ClipsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clips
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View all your generated video clips
          </p>
        </div>

        <ClipGallery />
      </main>
    </div>
  )
}
