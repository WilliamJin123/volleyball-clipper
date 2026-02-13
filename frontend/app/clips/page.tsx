import { Sidebar } from '@/components/layout'
import { ClipGallery } from '@/components/clips/clip-gallery'

export default function ClipsPage() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-[60px] max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-8 pb-8">
        <div className="animate-in">
          <ClipGallery />
        </div>
      </main>
    </div>
  )
}
