import { Header } from '@/components/layout'
import { ClipGallery } from '@/components/clips/clip-gallery'

export default function ClipsPage() {
  return (
    <div>
      <Header />
      <main>
        <h1>Clips</h1>
        <ClipGallery />
      </main>
    </div>
  )
}
