import { Header } from '@/components/layout'
import { ClipGallery } from '@/components/clips/clip-gallery'

export default function ClipsPage() {
  return (
    <div>
      <Header />
      <main className="max-w-[1200px] mx-auto px-10 py-8">
        <div className="animate-in">
          <ClipGallery />
        </div>
      </main>
    </div>
  )
}
